import * as parser from '@babel/parser';
import traverse, { NodePath,Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import fs from 'fs-extra';
import path from 'path';
import { defaultParsingConfig } from './config/default-parsing-config';
import { defaultNodeTypeMap, defaultNodeType } from './config/default-nodemap-config';
import { NodeInfo, ParsingConfig } from './types';
import prettier from 'prettier'

export class I18nParser {
  private readonly config: ParsingConfig;
  private readonly nodeTypeMap: Record<string, string>;
  private translationKeys: Record<string, string> = {};
  private nodeOccurrences: Record<string, number> = {};

  constructor(configPath?: string) {
    this.config = defaultParsingConfig;
    this.nodeTypeMap = defaultNodeTypeMap; // Initialize with default mapping

    if (configPath && fs.existsSync(configPath)) {
      try {
        // 自定义设置覆盖默认设置
        const userConfig = fs.readJsonSync(configPath);
        this.config = { ...this.config, ...userConfig };
        this.nodeTypeMap = { ...this.nodeTypeMap, ...userConfig.nodeTypeMap };
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using default config.`);
      }
    }
  }

  private isAlreadyTranslated(node: t.Node): boolean {
    // Check if the node is already wrapped in a t() function call
    if (t.isCallExpression(node) && t.isIdentifier(node.callee) && node.callee.name === 't') {
      return true;
    }

    // Check parent for JSX expression containers
    if (
      t.isJSXExpressionContainer(node) &&
      t.isCallExpression(node.expression) &&
      t.isIdentifier(node.expression.callee) &&
      node.expression.callee.name === 't'
    ) {
      return true;
    }

    return false;
  }

  private isInIgnoreList(propName: string): boolean {
    return this.config.ignoreProps.includes(propName);
  }

  private shouldProcessComponentProp(componentName: string, propName: string): boolean {
    const componentConfig = this.config.components[componentName];
    return componentConfig?.props?.includes(propName) || false;
  }

  private isComponentWithTextChild(componentName: string): boolean {
    const componentConfig = this.config.components[componentName];
    return componentConfig?.textChild || false;
  }

  private calculateDepth(path: NodePath): number {
    let depth = 0;
    let currentPath = path;

    // Traverse up the tree, only counting JSX element nodes
    while (currentPath.parentPath) {
      // Only increment depth for JSX elements and fragments
      if (
          t.isJSXElement(currentPath.parentPath.node) ||
          t.isJSXFragment(currentPath.parentPath.node)
      ) {
        depth++;
      }
      currentPath = currentPath.parentPath;
    }

    return depth;
  }

  private getParentComponentName(path: any): string | undefined {
    let currentPath = path.parentPath;

    while (currentPath) {
      if (
        currentPath.node.openingElement &&
        t.isJSXIdentifier(currentPath.node.openingElement.name)
      ) {
        return currentPath.node.openingElement.name.name;
      }
      currentPath = currentPath.parentPath;
    }

    return undefined;
  }

  private getNodeDepthCategory(depth: number): string {
    if (depth <= 3) return 'Section';
    if (depth <= 5) return 'Part';
    return 'Area';
  }

  private getNodeType(node: t.Node): string {
    // Handle JSX fragments (<></>)
    if (t.isJSXFragment(node)) {
      return this.nodeTypeMap['Fragment'] || defaultNodeType;
    }

    // Handle JSX elements
    if (t.isJSXElement(node)) {
      const tagName = (node.openingElement.name as t.JSXIdentifier).name;

      // Use mapping from configuration
      return this.nodeTypeMap[tagName.toLowerCase()] || defaultNodeType;
    }

    return defaultNodeType;
  }

  private generateTranslationKey(info: NodeInfo): string {
    let firstPart: string;
    let secondPart: string;

    // Generate first part based on ancestor depth
    firstPart = this.getNodeDepthCategory(info.ancestorDepth);

    // Generate second part
    if (info.parentNode.name && this.config.components[info.parentNode.name]) {
      if (info.propName) {
        // It's a component prop
        secondPart = `${info.parentNode.name}${info.propName.charAt(0).toUpperCase() + info.propName.slice(1)}`;
      } else {
        // It's a component child
        secondPart = info.parentNode.name;
      }
    } else {
      // It's a regular HTML element
      secondPart = info.parentNode.type;
    }

    // Combine parts for the key
    const baseKey = `${firstPart}${secondPart}`;

    // Keep track of occurrences
    this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

    // Add occurrence number
    const key = `${baseKey}${this.nodeOccurrences[baseKey]}`;

    // Store translation
    this.translationKeys[key] = info.text;

    return key;
  }

  private processJSXElements(ast: t.File): void {
    traverse(ast, {
      JSXElement: path => {
        if (t.isJSXIdentifier(path.node.openingElement.name)) {
          const componentName = path.node.openingElement.name.name;

          if (this.isComponentWithTextChild(componentName)) {
            // Find direct text children
            path.node.children.forEach(child => {
              if (t.isJSXText(child) && child.value.trim()) {
                const text = child.value.trim();
                const depth = this.calculateDepth(path);

                const baseKey = `${componentName}`;
                this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

                const info: NodeInfo = {
                  text,
                  ancestorDepth: depth,
                  parentNode: {
                    type: 'Component',
                    name: componentName,
                  },
                  occurrence: this.nodeOccurrences[baseKey],
                };

                const key = this.generateTranslationKey(info);

                // Replace with t() call wrapped in expression container
                const index = path.node.children.indexOf(child);
                path.node.children[index] = t.jsxExpressionContainer(
                  t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
                );
              }
            });
          }
        }
      },
    });
  }

  /**
   * Generates code from AST and formats it with Prettier
   * @param ast The Babel AST to generate code from
   * @returns Formatted code string
   */
  private async generateFormattedCode(ast: t.File): Promise<string> {
    try {
      // Generate raw code from AST with basic formatting options
      const { code: rawCode } = generate(ast, {
        retainLines: true,
        compact: false,
        jsescOption: { minimal: true },
        concise: false,
      });

      // Apply Prettier formatting
      return await this.formatWithPrettier(rawCode);
    } catch (error) {
      console.error('Error generating code:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate code from AST');
    }
  }

  /**
   * Formats code using Prettier with appropriate configuration
   * @param code The raw code to format
   * @returns Formatted code string
   */
  private async formatWithPrettier(code: string): Promise<string> {
    try {
      // Load project's Prettier configuration
      const prettierConfig = await prettier.resolveConfig(path.join(__dirname, '../prettierrc.js'));

      // Determine appropriate parser based on current file
      const parser = this.determinePrettierParser();

      // Apply formatting
      return prettier.format(code, {
        ...prettierConfig,
        parser,
      });
    } catch (error) {
      console.warn(
          `Prettier formatting failed: ${error instanceof Error ? error.message : String(error)}.
      Using unformatted code.`
      );
      return code; // Return unformatted code as fallback
    }
  }

  /**
   * Determines the appropriate Prettier parser based on file extension
   * @returns Prettier parser name
   */
  private determinePrettierParser(): string {
      return 'typescript'; // Default
  }

  public async parse(sourceCode: string): Promise<{ code: string; translations: Record<string, string> }> {
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const visitor: Visitor = {

      "StringLiteral": path => {
        // Skip empty strings
        if (!path.node.value.trim()) return;

        // Skip if already translated
        if (path.parent && this.isAlreadyTranslated(path.parent)) return;

        // Handle JSX attributes
        if (t.isJSXAttribute(path.parent)) {
          const attributeName = (path.parent.name as t.JSXIdentifier).name;

          // Skip ignored props
          if (this.isInIgnoreList(attributeName)) return;

          // Check if it's a component we should process
          const jsxElement = path.findParent(p => t.isJSXElement(p.node));
          if (jsxElement) {
            const componentName = (
                (jsxElement.node as t.JSXElement).openingElement.name as t.JSXIdentifier
            ).name;

            if (this.shouldProcessComponentProp(componentName, attributeName)) {
              const depth = this.calculateDepth(path);

              const baseKey = `${componentName}${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)}`;
              this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

              const info: NodeInfo = {
                text: path.node.value,
                ancestorDepth: depth,
                parentNode: {
                  type: 'Attribute',
                  name: componentName,
                },
                propName: attributeName,
                occurrence: this.nodeOccurrences[baseKey],
              };

              const key = this.generateTranslationKey(info);

              // Replace with t() call
              path.replaceWith(
                  t.jsxExpressionContainer(
                      t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
                  )
              );
            }
          }
        }

        // Handle object properties (like in toast calls)
        // if (t.isObjectProperty(path.parent) && t.isIdentifier(path.parent.key)) {
        //   const propName = path.parent.key.name;
        //
        //   // Skip ignored props
        //   if (this.isInIgnoreList(propName)) return;
        //
        //   // Check if part of a function call
        //   const callExprPath = path.findParent(p => {
        //     return t.isCallExpression(p.node);
        //   });
        //
        //   if (
        //       callExprPath &&
        //       t.isCallExpression(callExprPath.node) &&
        //       t.isIdentifier(callExprPath.node.callee)
        //   ) {
        //     const funcName = callExprPath.node.callee.name;
        //     const text = path.node.value;
        //
        //     const keyName = `${funcName}${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
        //     this.translationKeys[keyName] = text;
        //
        //     // Replace with t() call
        //     path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(keyName)]));
        //   }
        // }

        // 表达式容器位于 JSX 元素内（如 h2）)
        if (t.isJSXExpressionContainer(path.parent) && t.isJSXElement(path.parentPath?.parent)) {
          // 跳过空字符串和已翻译的文本
          if (!path.node.value.trim()) return;
          if (this.isAlreadyTranslated(path.parent)) return;

          // 获取包裹此字符串的 JSX 元素信息（如 h2）
          const jsxElement = path.parentPath.parent as t.JSXElement;
          const componentName = (
              jsxElement.openingElement.name as t.JSXIdentifier
          ).name;

          // 跳过忽略的组件（按需配置）
          if (this.isInIgnoreList(componentName)) return;

          // 生成翻译键
          const depth = this.calculateDepth(path);
          const baseKey = `${componentName}`;
          this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

          const info: NodeInfo = {
            text: path.node.value,
            ancestorDepth: depth,
            parentNode: {
              type: 'JSXElement',
              name: componentName,
            },
            occurrence: this.nodeOccurrences[baseKey],
          };

          const key = this.generateTranslationKey(info);

          // 替换为 t() 调用
          path.replaceWith(
              t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
          );

          // 记录翻译键
          this.translationKeys[key] = path.node.value;
        }
      },

      "JSXFragment": path => {
        // Process text nodes in JSX fragments (<></>)
        path.node.children.forEach((child, index) => {
          if (t.isJSXText(child)) {
            const text = child.value.trim();
            // Skip empty text
            if (!text) return;
            // 检查是否已翻译
            if (this.isAlreadyTranslated(child)) return;

            const depth = this.calculateDepth(path);

            // Use Fragment as the component name
            const baseKey = 'Fragment';
            this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

            const info: NodeInfo = {
              text,
              ancestorDepth: depth,
              parentNode: {
                type: this.getNodeType(path.node), // Will return Fragment type
                name: 'Fragment',
              },
              occurrence: this.nodeOccurrences[baseKey],
            };

            const key = this.generateTranslationKey(info);
            // Replace with t() call wrapped in expression container
            path.node.children[index] = t.jsxExpressionContainer(
                t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
            );
          }

          // 处理表达式容器，例如 <>{"fragment"}</>
          if (t.isJSXExpressionContainer(child)) {
            // 检查表达式容器中是否包含字符串字面量
            if (t.isStringLiteral(child.expression)) {
              const textValue = child.expression.value;

              // 跳过空字符串
              if (!textValue.trim()) return;

              // 检查是否已翻译
              if (this.isAlreadyTranslated(child)) return;

              const componentName = 'Fragment';

              // 跳过忽略的组件（按需配置）
              if (this.isInIgnoreList(componentName)) return;

              // 生成翻译键
              const depth = this.calculateDepth(path);
              const baseKey = `${componentName}`;
              this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

              const info: NodeInfo = {
                text: textValue,
                ancestorDepth: depth,
                parentNode: {
                  type: 'Fragment',
                  name: componentName,
                },
                occurrence: this.nodeOccurrences[baseKey],
              };

              const key = this.generateTranslationKey(info);

              // 替换表达式容器中的内容，而不是整个 Fragment
              child.expression = t.callExpression(
                  t.identifier('t'),
                  [t.stringLiteral(key)]
              );

              // 记录翻译键
              this.translationKeys[key] = textValue;
            }
          }

        });
      },

      "JSXText": path => {
        const text = path.node.value.trim();
        // Skip empty text
        if (!text) return;

        const jsxElement = path.parentPath;
        if (t.isJSXElement(jsxElement.node)) {
          const componentName = (jsxElement.node.openingElement.name as t.JSXIdentifier).name;
          const depth = this.calculateDepth(path);

          const parentType = this.getNodeType(jsxElement.node);

          const baseKey = `${componentName}`;
          this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;

          const info: NodeInfo = {
            text,
            ancestorDepth: depth,
            parentNode: {
              type: parentType,
              name: componentName,
            },
            occurrence: this.nodeOccurrences[baseKey],
          };

          const key = this.generateTranslationKey(info);

          // Replace with t() call wrapped in expression container
          path.replaceWith(
              t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]))
          );
        }
      },

      "VariableDeclarator": path => {
        if (t.isIdentifier(path.node.id) && t.isArrayExpression(path.node.init)) {
          const variableName = path.node.id.name;
          const arrayItems = path.node.init.elements;

          arrayItems.forEach((item, index) => {
            if (t.isObjectExpression(item)) {
              item.properties.forEach(prop => {
                if (
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    t.isStringLiteral(prop.value) &&
                    !this.isInIgnoreList(prop.key.name)
                ) {
                  const propName = prop.key.name;
                  const text = prop.value.value;

                  // Skip empty strings
                  if (!text.trim()) return;

                  // Generate key for logic variable
                  const keyName = `${variableName}${propName.charAt(0).toUpperCase() + propName.slice(1)}${index + 1}`;
                  this.translationKeys[keyName] = text;

                  // Replace with t() call
                  prop.value = t.callExpression(t.identifier('t'), [t.stringLiteral(keyName)]);
                }
              });
            }
          });
        }

      },

      // Process object properties in call expressions (like toast)
      "ObjectProperty": path => {
        if (
            t.isIdentifier(path.node.key) &&
            t.isStringLiteral(path.node.value) &&
            !this.isInIgnoreList(path.node.key.name)
        ) {
          // Check if we're in a toast or similar function call
          const callExprPath = path.findParent(p => {
            return t.isCallExpression(p.node);
          });

          if (
              callExprPath &&
              t.isCallExpression(callExprPath.node) &&
              t.isIdentifier(callExprPath.node.callee)
          ) {
            const funcName = callExprPath.node.callee.name;
            const propName = path.node.key.name;
            const text = path.node.value.value;

            // Skip empty strings
            if (!text.trim()) return;

            // Generate key for function call property
            const keyName = `${funcName}${propName.charAt(0).toUpperCase() + propName.slice(1)}`;
            this.translationKeys[keyName] = text;

            // Replace with t() call
            path.node.value = t.callExpression(t.identifier('t'), [t.stringLiteral(keyName)]);
          }
        }
      },
    }

    // First pass: collect info about string literals
    traverse(ast,visitor);

    // Second pass: add next-intl imports and t declaration if needed
    // if (this.needsImport && !this.hasNextIntlImport) {
    //   this.addNextIntlImports(ast, domainName);
    // }

    // Generate and format code
    const formattedCode = await this.generateFormattedCode(ast);

    return {
      code: formattedCode,
      translations: this.translationKeys,
    };
  }

  public async parseFile(
    filePath: string,
    outputPath?: string
  ): Promise<{ code: string; translations: Record<string, string> }> {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const result =await this.parse(sourceCode);

    if (outputPath) {
      fs.ensureDirSync(path.dirname(outputPath));
      fs.writeFileSync(filePath, result.code);
    }

    return result;
  }

  public saveTranslations(outputPath: string): void {
    fs.ensureDirSync(path.dirname(outputPath));
    fs.writeJSONSync(outputPath, this.translationKeys, { spaces: 2 });
  }
}
