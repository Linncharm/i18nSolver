# TypeScript I18n Parser

A internationalization (i18n) parser for extracting and managing translations in TypeScript and React applications. This tool automatically identifies text strings in your codebase and generates appropriate translation keys according to your configuration.

[中文](README.CN.md)[English](README.md)

## Features

- 🔍 Automatically identifies translatable content in:
  - JSX text nodes
  - String literals
  - Component properties
  - JSX fragments (`<></>`)
  - Object properties
  - Variable assignments
- 🔄 Generates hierarchical translation keys based on component depth and type
- ⚙️ Highly configurable through JSON configuration files
- 🛠️ Preserves original code formatting
- 📦 Outputs transformed code with translation function calls
- 📝 Creates a translations JSON file ready for localization

## Usage

### Basic Usage

#### TypeScript

```typescript
import { I18nParser } from 'typescript-i18n-parser';
import path from 'path';
import fs from 'fs-extra';

// Create a parser instance with default config
const parser = new I18nParser();

// Parse a file and get the transformed code + translations
const result = parser.parseFile(
  'src/components/MyComponent.tsx',
  'dist/components/MyComponent.tsx'
);

// Save the translations to a JSON file
parser.saveTranslations('translations/en.json');
```

### Batch Processing Files

#### TypeScript

```typescript
import { I18nParser } from 'typescript-i18n-parser';
import glob from 'glob';
import path from 'path';

const parser = new I18nParser('./i18n-config.json');
const srcDir = './src';
const distDir = './dist';

// Process all TypeScript/React files
const files = glob.sync(`${srcDir}/**/*.{ts,tsx}`);

files.forEach(file => {
  const relativePath = path.relative(srcDir, file);
  const outputPath = path.join(distDir, relativePath);
  
  parser.parseFile(file, outputPath);
});

// Save all collected translations
parser.saveTranslations('./translations/en.json');
```

## Configuration

Create a `i18n-config.json` file in your project root:

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

### Configuration Options

#### parsing.components

Specifies which components and their props should be processed for translations:

- `props`: Array of property names to be translated
- `textChild`: Boolean indicating whether direct text children should be translated

#### parsing.ignoreProps

Array of property names that should be ignored during translation.

#### nodeTypeMap

Maps HTML elements to node types which affect the generated translation keys.

## How It Works

The parser traverses your code's Abstract Syntax Tree (AST) and:

1. Identifies translatable strings and text nodes
2. Generates appropriate translation keys based on component hierarchy and node type
3. Replaces original text with translation function calls (`t("translationKey")`)
4. Collects all translations in a dictionary for export

### Translation Key Generation

Translation keys are generated based on:

1. **Depth Category**: Based on component nesting depth:
  - `Section` - Components at depth ≤ 3
  - `Part` - Components at depth ≤ 5
  - `Area` - Components at depth > 5
2. **Component Type**: Determined by the component or HTML element:
  - Based on the `nodeTypeMap` configuration
  - Default values include "Title", "Subtitle", "Text", etc.
3. **Occurrence Counter**: A number that increments each time the same component/type appears

Example key format: `SectionTitle1`, `AreaButtonLabel2`, `PartText3`

### Example

#### Input:

```jsx
<div>
  <h1>Welcome to our app</h1>
  <Button label="Sign In" />
</div>
```

#### Output:

```jsx
<div>
  {t("SectionTitle1")}
  <Button label={t("AreaButtonLabel1")} />
</div>
```

#### Translations:

```json
{
  "SectionTitle1": "Welcome to our app",
  "AreaButtonLabel1": "Sign In"
}
```
