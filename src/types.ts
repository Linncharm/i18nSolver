export interface ParsingConfig {
  components: {
    [componentName: string]: {
      props?: string[];
      textChild?: boolean;
    };
  };
  ignoreProps: string[];
}

export interface NodeInfo {
  text: string;
  ancestorDepth: number;
  parentNode: {
    type: string;
    name?: string;
  };
  propName?: string;
  occurrence: number;
}

export interface I18nConfig {
  parsing: ParsingConfig;
  nodeTypeMap: Record<string, string>;
}
