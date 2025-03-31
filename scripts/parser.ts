import * as parser from '@babel/parser';
import * as t from '@babel/types';
import generate from '@babel/generator';
import fs from 'fs-extra';
import path from 'path';
import { defaultParsingConfig } from './config/default-parsing-config';
import { ParsingConfig } from './types';
import { AstProcessor } from './astProcessor';
import { CodeGenerator } from './generator';
import prettier from 'prettier';

export class I18nParser {
  private readonly config: ParsingConfig;

  constructor(configPath?: string) {
    this.config = defaultParsingConfig;

    if (configPath && fs.existsSync(configPath)) {
      try {
        const userConfig = fs.readJsonSync(configPath);
        this.config = { ...this.config, ...userConfig };
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using default config.`);
      }
    }

  }


  public async parse(sourceCode: string): Promise<{ code: string; translations: Record<string, string> }> {
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });


    const astProcessor = new AstProcessor(this.config);

    const { processedAST,translations } = astProcessor.processAST(ast);

    const generator = new CodeGenerator();

    const formattedCode = await generator.generateFormattedCode(processedAST);

    return {
      code: formattedCode,
      translations,
    };
  }

  public async parseFile(
    filePath: string,
    namespace?: string,
    outputPath?: string
  ): Promise<{ code: string; translations: Record<string, string> }> {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const result = await this.parse(sourceCode);
    console.log({outputPath})

    if (outputPath) {
      fs.ensureDirSync(path.dirname(outputPath));
      fs.writeFileSync(outputPath, result.code);
    }

    return result;
  }
}
