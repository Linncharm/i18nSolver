import { Options } from 'prettier';
import { GeneratorOptions } from '@babel/generator';

export interface ProcessingConfig {
  components: {
    [componentName: string]: {
      props?: string[];
      textChild?: boolean;
    };
  };
  ignoreProps: string[];
}

export interface GeneratorConfig {
  prettier: Options;
  babel: GeneratorOptions;
}

// 统一配置接口
export interface ServiceConfig {
  processing: ProcessingConfig
  nodeTypeMap: Record<string, string>
  generator: GeneratorConfig
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
