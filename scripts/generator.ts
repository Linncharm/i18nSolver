import * as t from '@babel/types';
import generate from '@babel/generator';
import prettier from 'prettier';
import path from 'path';

export class CodeGenerator {
  public async generateFormattedCode(ast: t.File): Promise<string> {
    try {
      const { code: rawCode } = generate(ast, {
        retainLines: true,
        compact: false,
        jsescOption: { minimal: true },
        concise: false,
      });

      return await this.formatWithPrettier(rawCode);
    } catch (error) {
      console.error('Error generating code:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate code from AST');
    }
  }

  private async formatWithPrettier(code: string): Promise<string> {
    try {
      const prettierConfig = await prettier.resolveConfig(path.join(__dirname, '../prettierrc.js'));
      return prettier.format(code, {
        ...prettierConfig,
        parser: 'typescript',
      });
    } catch (error) {
      console.warn(
        `Prettier formatting failed: ${error instanceof Error ? error.message : String(error)}.
        Using unformatted code.`
      );
      return code;
    }
  }
}