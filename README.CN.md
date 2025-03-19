# TypeScript I18n 解析器

一个国际化 (i18n) 解析器，用于在 TypeScript 和 React 应用程序中提取和管理翻译。此工具自动识别代码库中的文本字符串，并根据您的配置生成适当的翻译键。

[中文](README.CN.md). [English](README.md)

## 功能

- 🔍 自动识别以下内容中的可翻译内容：
  - JSX 文本节点
  - 字符串字面量
  - 组件属性
  - JSX 片段 (`<></>`)
  - 对象属性
  - 变量赋值
- 🔄 根据组件深度和类型生成分层的翻译键
- ⚙️ 通过 JSON 配置文件高度可配置
- 🛠️ 保留原始代码格式
- 📦 输出带有翻译函数调用的转换代码
- 📝 创建一个准备好本地化的翻译 JSON 文件

## 使用

### 基本用法

#### TypeScript

```typescript
import { I18nParser } from 'typescript-i18n-parser';
import path from 'path';
import fs from 'fs-extra';

// 使用默认配置创建解析器实例
const parser = new I18nParser();

// 解析文件并获取转换后的代码和翻译
const result = parser.parseFile(
  'src/components/MyComponent.tsx',
  'dist/components/MyComponent.tsx'
);

// 将翻译保存到 JSON 文件
parser.saveTranslations('translations/en.json');
```

### 批量处理文件

#### TypeScript

```typescript
import { I18nParser } from 'typescript-i18n-parser';
import glob from 'glob';
import path from 'path';

const parser = new I18nParser('./i18n-config.json');
const srcDir = './src';
const distDir = './dist';

// 处理所有 TypeScript/React 文件
const files = glob.sync(`${srcDir}/**/*.{ts,tsx}`);

files.forEach(file => {
  const relativePath = path.relative(srcDir, file);
  const outputPath = path.join(distDir, relativePath);
  
  parser.parseFile(file, outputPath);
});

// 保存所有收集到的翻译
parser.saveTranslations('./translations/en.json');
```

## 配置

在项目根目录中创建一个 `i18n-config.json` 文件：

```json
{
  "parsing": {
    "components": {
      "Button": {
        "props": ["label", "tooltip"]
      },
      "TextField": {
        "props": ["placeholder", "helperText"]
      },
      "Title": {
        "textChild": true
      }
    },
    "ignoreProps": ["className", "style", "id", "key", "data-testid"]
  },
  "nodeTypeMap": {
    "h1": "Title",
    "h2": "Title",
    "h3": "Title",
    "h4": "Title",
    "h5": "Title",
    "h6": "Title",
    "p": "Subtitle",
    "div": "Text",
    "span": "Text",
    "Fragment": "Text"
  }
}
```

### 配置选项

#### parsing.components

指定哪些组件及其属性应被处理为翻译：

- `props`: 需要翻译的属性名称数组
- `textChild`: 布尔值，指示是否应翻译直接的文本子节点

#### parsing.ignoreProps

在翻译期间应忽略的属性名称数组。

#### nodeTypeMap

将 HTML 元素映射到节点类型，这会影响生成的翻译键。

## 工作原理

解析器遍历代码的抽象语法树 (AST) 并：

1. 识别可翻译的字符串和文本节点
2. 根据组件层次结构和节点类型生成适当的翻译键
3. 用翻译函数调用 (`t("translationKey")`) 替换原始文本
4. 在字典中收集所有翻译以便导出

### 翻译键生成

翻译键根据以下内容生成：

1. **深度类别**：基于组件嵌套深度：
  - `Section` - 深度 ≤ 3 的组件
  - `Part` - 深度 ≤ 5 的组件
  - `Area` - 深度 > 5 的组件
2. **组件类型**：由组件或 HTML 元素决定：
  - 基于 `nodeTypeMap` 配置
  - 默认值包括 "Title"、"Subtitle"、"Text" 等。
3. **出现计数器**：每次相同组件/类型出现时递增的数字

示例键格式：`SectionTitle1`、`AreaButtonLabel2`、`PartText3`

### 示例

#### 输入：

```jsx
<div>
  <h1>Welcome to our app</h1>
  <Button label="Sign In" />
</div>
```

#### 输出：

```jsx
<div>
  {t("SectionTitle1")}
  <Button label={t("AreaButtonLabel1")} />
</div>
```

#### 翻译：

```json
{
  "SectionTitle1": "Welcome to our app",
  "AreaButtonLabel1": "Sign In"
}
```
