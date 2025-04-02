import { ServiceConfig } from "../types";

// 默认配置
export const defaultConfig: ServiceConfig = {
  processing: {
    components: {
      Combobox: {
        props: [
          "placeholder",
          "searchPlaceholder",
          "emptyText"
        ]
      },
      ClipboardButton: {
        props: [
          "tooltipCopy",
          "tooltipCopied"
        ]
      },
      TooltipContent: {
        textChild: true
      },
      InstallButton: {
        textChild: true
      }
    },
    ignoreProps: [
      "className",
      "variant",
      "id",
      "key",
      "style"
    ]
  },
  nodeTypeMap: {
    // 映射常见的 React 组件类型到文本类型
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
  },
  generator: {
    prettier: {
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
      jsxBracketSameLine: false,
      arrowParens: 'avoid',
      parser: 'typescript',
      endOfLine: 'lf',
      overrides: [
        {
          files: '*.tsx',
          options: {
            jsxBracketSameLine: false,
          },
        },
        {
          files: '*.jsx',
          options: {
            jsxBracketSameLine: false,
          },
        },
      ],
    },
    babel: {
      retainLines: true,
      compact: false,
      jsescOption: { minimal: true },
      concise: false,
    }
  }
} as const;