import * as t from '@babel/types';
import generate from '@babel/generator';
import prettier from 'prettier';
import { defaultConfig } from './config/default-config';
import fs from 'fs-extra';
import { GeneratorConfig, ServiceConfig } from './types';

export class CodeGenerator {

  private readonly config: GeneratorConfig;

  constructor(configPath?: string) {
    this.config = defaultConfig.generator;

    if (configPath && fs.existsSync(configPath)) {
      try {
        const userConfig = fs.readJsonSync(configPath) as ServiceConfig;
        this.config = {
          prettier: { ...defaultConfig.generator.prettier, ...userConfig.generator.prettier },
          babel: { ...defaultConfig.generator.babel, ...userConfig.generator.babel },
        };
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using default config.`);
      }
    }
  }

  public async generateFormattedCode(ast: t.File): Promise<string> {
    try {
      const { code: rawCode } = generate(ast, this.config.babel);

      return await this.formatWithPrettier(rawCode);
    } catch (error) {
      console.error('Error generating code:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate code from AST');
    }
  }

  private async formatWithPrettier(code: string): Promise<string> {
    try {

      return prettier.format(code, this.config.prettier);
    } catch (error) {
      console.warn(
        `Prettier formatting failed: ${error instanceof Error ? error.message : String(error)}.
        Using unformatted code.`
      );
      return code;
    }
  }
}