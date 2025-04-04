import fs from 'fs-extra';

import * as t from '@babel/types';
import traverse, { NodePath, Visitor } from '@babel/traverse';
import { ProcessingConfig, ServiceConfig } from './types';
import { defaultNodeType } from './constants'; // 引入默认的节点类型映射

import { defaultConfig } from './config/default-config';

// TODO 对于页面内引用的组件，会被重复解析，需要根据ignore规则进行判断然后忽略
interface NodeInfo {
  text: string;
  ancestorDepth: number;
  parentNode: {
    type: string;
    name?: string;
  };
  occurrence: number;
  propName?: string;
}

export class AstProcessor {
  private readonly config: ProcessingConfig;
  private readonly nodeTypeMap: Record<string, string>;
  private translationKeys: Record<string, string> = {};
  private nodeOccurrences: Record<string, number> = {};

  // 将 visitor 定义为类的私有属性
  private readonly visitor: Visitor = {
    "StringLiteral": this.handleStringLiteral.bind(this),
    "JSXFragment": this.handleJSXFragment.bind(this),
    "JSXText": this.handleJSXText.bind(this),
    "VariableDeclarator": this.handleVariableDeclarator.bind(this),
    "ObjectProperty": this.handleObjectProperty.bind(this)
  };

  constructor(configPath?: string) {
    this.config = defaultConfig.processing;
    this.nodeTypeMap = defaultConfig.nodeTypeMap;
    // 合并自定义配置
    if (configPath && fs.existsSync(configPath)) {
      try {
        const userConfig = fs.readJsonSync(configPath) as ServiceConfig;
        this.config = { ...this.config, ...userConfig.processing };
        this.nodeTypeMap = { ...this.nodeTypeMap, ...userConfig.nodeTypeMap }; // 合并自定义的 nodeTypeMap
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using default config.`);
      }
    }

  }

  private handleStringLiteral(path: NodePath<t.StringLiteral>) {
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
  }

  private handleJSXFragment(path: NodePath<t.JSXFragment>) {
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
  }

  private handleJSXText(path: NodePath<t.JSXText>) {
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
  }

  private handleVariableDeclarator(path: NodePath<t.VariableDeclarator>) {
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
  }

  // Process object properties in call expressions (like toast)
  private handleObjectProperty(path: NodePath<t.ObjectProperty>) {
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
  }


  private isAlreadyTranslated(node: t.Node): boolean {
    if (t.isCallExpression(node) && t.isIdentifier(node.callee) && node.callee.name === 't') {
      return true;
    }

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

    while (currentPath.parentPath) {
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
    if (t.isJSXFragment(node)) {
      return this.nodeTypeMap['Fragment'] || defaultNodeType;
    }

    if (t.isJSXElement(node)) {
      const tagName = (node.openingElement.name as t.JSXIdentifier).name;
      return this.nodeTypeMap[tagName.toLowerCase()] || defaultNodeType;
    }

    return defaultNodeType;
  }

  private generateTranslationKey(info: NodeInfo): string {
    let firstPart: string;
    let secondPart: string;

    firstPart = this.getNodeDepthCategory(info.ancestorDepth);

    if (info.parentNode.name && this.config.components[info.parentNode.name]) {
      if (info.propName) {
        secondPart = `${info.parentNode.name}${info.propName.charAt(0).toUpperCase() + info.propName.slice(1)}`;
      } else {
        secondPart = info.parentNode.name;
      }
    } else {
      secondPart = info.parentNode.type;
    }

    const baseKey = `${firstPart}${secondPart}`;
    this.nodeOccurrences[baseKey] = (this.nodeOccurrences[baseKey] || 0) + 1;
    const key = `${baseKey}${this.nodeOccurrences[baseKey]}`;
    this.translationKeys[key] = info.text;

    return key;
  }

  public addUseTranslationImport(ast: t.File, namespace: string, isServer: boolean = true): t.File {
    let hasTranslationsImport = false;
    let hasTDeclaration = false;

    // 在 traverse 外部定义创建声明的函数
    const createTranslationDeclaration = (namespace: string, isServer: boolean): t.VariableDeclaration => {
      const translationCall = t.callExpression(
        t.identifier(isServer ? 'getTranslations' : 'useTranslations'),
        [t.stringLiteral(namespace)]
      );

      const initializer = isServer
        ? t.awaitExpression(translationCall)
        : translationCall;

      return t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('t'),
          initializer
        ),
      ]);
    };

    traverse(ast, {
      ImportDeclaration(path) {
        if (
          t.isStringLiteral(path.node.source) &&
          (path.node.source.value === 'next-intl' || path.node.source.value === 'next-intl/server')
        ) {
          path.node.specifiers.forEach(specifier => {
            if (
              t.isImportSpecifier(specifier) &&
              t.isIdentifier(specifier.imported) &&
              ((isServer && specifier.imported.name === 'getTranslations') ||
               (!isServer && specifier.imported.name === 'useTranslations'))
            ) {
              hasTranslationsImport = true;
            }
          });
        }
      },
      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id) &&
          path.node.id.name === 't'
        ) {
          hasTDeclaration = true;
        }
      },
      FunctionDeclaration(path) {
        if (!hasTDeclaration && path.node.body.type === 'BlockStatement') {
          const translationDeclaration = createTranslationDeclaration(namespace, isServer);
          path.node.body.body.unshift(translationDeclaration);
          hasTDeclaration = true;
        }
      },
      ArrowFunctionExpression(path) {
        if (!hasTDeclaration && path.node.body.type === 'BlockStatement') {
          const translationDeclaration = createTranslationDeclaration(namespace, isServer);
          path.node.body.body.unshift(translationDeclaration);
          hasTDeclaration = true;
        }
      }
    });

    if (!hasTranslationsImport) {
      const importDeclaration = t.importDeclaration(
        [t.importSpecifier(
          t.identifier(isServer ? 'getTranslations' : 'useTranslations'),
          t.identifier(isServer ? 'getTranslations' : 'useTranslations')
        )],
        t.stringLiteral(isServer ? 'next-intl/server' : 'next-intl')
      );
      ast.program.body.unshift(importDeclaration);
    }

    return ast;
  }

  public processAST(ast: t.File, namespace:string): { processedAST: t.File; translations: Record<string, string> } {

    traverse(ast, this.visitor);
    /**
     * 添加 useTranslation 导入
     *
     * 注意：在服务端渲染中，使用 getTranslations 替换 useTranslations
     */
    const declaredAST = this.addUseTranslationImport(
      ast,
      namespace,
      /* isServer */
      true
    );


    return {
      processedAST: declaredAST, // 添加 useTranslation 导入
      translations: this.translationKeys,
    }
  }

}
