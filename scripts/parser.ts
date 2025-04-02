import * as parser from '@babel/parser';
import * as t from '@babel/types';
import fs from 'fs-extra';

export class I18nParser {

  public parse(sourceCode: string): t.File  {
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    return ast;
  }

  public parseFile(
    filePath: string,
  ):  t.File {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const result = this.parse(sourceCode);

    return result;
  }
}
