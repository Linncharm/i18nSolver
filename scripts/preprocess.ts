import path from 'path';
import fs from 'fs-extra';
import * as parser from '@babel/parser';
import traverse,{ NodePath } from '@babel/traverse';
import * as t from '@babel/types';

interface ComponentConfig {
  props: string[];
  textChild?: boolean;
}

interface ExtractedConfig {
  components: Record<string, ComponentConfig>;
  ignoreProps: string[];
}

class I18nPreProcessor {
  private config: ExtractedConfig = {
    components: {},
    // 修复: 使用数组而不是 Set
    ignoreProps: ['className', 'style', 'id', 'key']
  };

  private isTranslationCall(node: t.Node | null | undefined): boolean {
    // 修复: 添加空值检查
    if (!node) return false;

    if (t.isJSXExpressionContainer(node)) {
      node = node.expression;
    }

    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee) &&
      (node.callee.name === 't' || node.callee.name === 'useTranslations')
    );
  }

  private extractFromJSX(ast: t.File) {
    traverse(ast, {
      JSXAttribute: (path) => {
        if (t.isJSXIdentifier(path.node.name)) {
          const propName = path.node.name.name;
          const componentName = this.getComponentName(path);

          if (componentName && this.isTranslationCall(path.node.value)) {
            // 发现使用了翻译的属性
            if (!this.config.components[componentName]) {
              this.config.components[componentName] = { props: [] };
            }
            if (!this.config.components[componentName].props.includes(propName)) {
              this.config.components[componentName].props.push(propName);
            }
          }
        }
      },
      JSXText: (path) => {
        if (path.node.value.trim()) {
          const componentName = this.getComponentName(path);
          if (componentName) {
            if (!this.config.components[componentName]) {
              this.config.components[componentName] = { props: [] };
            }
            this.config.components[componentName].textChild = true;
          }
        }
      }
    });
  }

  private getComponentName(path: NodePath): string | null {
    let current = path;
    while (current.parentPath) {
      if (t.isJSXElement(current.node)) {
        const openingElement = current.node.openingElement;
        if (t.isJSXIdentifier(openingElement.name)) {
          return openingElement.name.name;
        }
      }
      current = current.parentPath;
    }
    return null;
}

  public async processDirectory(srcDir: string) {
    const files = await this.findTsxFiles(srcDir);
    console.log("文件个数", files.length)

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });

      this.extractFromJSX(ast);
    }

    return this.generateConfig();
  }

  private async findTsxFiles(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir);
    const results: string[] = [];

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        results.push(...await this.findTsxFiles(fullPath));
      } else if (file.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  private generateConfig() {
    // 排序组件和属性，使输出更整洁
    const sortedConfig = {
      components: Object.fromEntries(
        Object.entries(this.config.components)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, config]) => [
            name,
            {
              ...config,
              props: config.props.sort()
            }
          ])
      ),
      ignoreProps: [...this.config.ignoreProps].sort()
    };

    return sortedConfig;
  }
}

// 使用示例
async function main() {
  const processor = new I18nPreProcessor();
  const srcDir = path.join(process.cwd(), '../lufe-homepage/src');

  console.log('Analyzing project...');
  const config = await processor.processDirectory(srcDir);

  // 保存配置
  const configPath = path.resolve(process.cwd(), 'i18n-config.json');
  await fs.writeJSON(configPath, { processing: config }, { spaces: 2 });

  console.log('✅ Configuration generated successfully!');
  console.log(`📝 Config saved to: ${configPath}`);
}

main().catch(console.error);