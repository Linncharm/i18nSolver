import { I18nParser } from './parser';
import { AstProcessor } from './astProcessor';
import { CodeGenerator } from './generator';

export interface ServiceConfig {
  configPath?: string;        // 用于 Parser 和 Processor 的配置文件路径
}

export class I18nService {
  private static instance: I18nService;
  private readonly parser: I18nParser;
  private readonly processor: AstProcessor;
  private readonly generator: CodeGenerator;

  private constructor(config?: ServiceConfig) {
    // 初始化 Parser，传入配置文件路径
    this.parser = new I18nParser();

    // 初始化 Processor，传入配置文件路径
    this.processor = new AstProcessor(config?.configPath);

    // 初始化 Generator，传入 prettier 配置
    this.generator = new CodeGenerator(config?.configPath)
  }

  public static getInstance(config?: ServiceConfig): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService(config);
    }
    return I18nService.instance;
  }

  public getParser(): I18nParser {
    return this.parser;
  }

  public getProcessor(): AstProcessor {
    return this.processor;
  }

  public getGenerator(): CodeGenerator {
    return this.generator;
  }
}