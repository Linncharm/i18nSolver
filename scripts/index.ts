import path from 'path';
import fs from 'fs-extra';
import { I18nParser } from './parser';
import { PathResolver } from './pathResolver';
import {glob} from 'glob';

function getDomainName(filePath: string): string {
  // Extract file name without extension
  const fileName = path.basename(filePath, path.extname(filePath));

  // If filename is page or layout, use parent directory name instead
  if (['page', 'layout'].includes(fileName.toLowerCase())) {
    // Get parent directory name
    const parentDirName = path.basename(path.dirname(filePath));
    // First letter to uppercase for proper naming convention
    return parentDirName.charAt(0).toUpperCase() + parentDirName.slice(1);
  }

  // Otherwise use the filename with first letter uppercase
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

// Process a single file
async function processFile(
    parser: I18nParser,
    namespace:string,
    filePath: string,
    outputDir: string,
    translationsPath: string
): Promise<void> {
  try {
    console.log(`Processing file: ${filePath}`);

    // Determine output path (maintaining directory structure)
    const relativePath = path.relative(path.join(process.cwd(), 'src'), filePath);
    const outputPath = path.join(outputDir,'src', relativePath);

    // Create directory if it doesn't exist
    fs.ensureDirSync(path.dirname(outputPath));

    console.log("!!!", filePath)
    console.log("@@@", outputPath)
    // Parse and transform the file
    const result = await parser.parseFile(
      filePath,
      namespace,
      outputPath
    );

    // Update translations file with new entries
    const existingTranslations = fs.existsSync(translationsPath)
        ? fs.readJSONSync(translationsPath, { throws: false }) || {}
        : {};

    const mergedTranslations = { ...existingTranslations, ...result.translations };
    fs.writeJSONSync(translationsPath, mergedTranslations, { spaces: 2 });

    console.log(`✅ Processed ${filePath} -> ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error);
  }
}

const resolvePath = async (srcDir:string) => {
  const pathResolver = new PathResolver({
    srcDir: `${srcDir}`,
    include: [
      '**/*.tsx',
      'app/[locale]/**/*.tsx',  // 包含 app/[locale] 下的所有 tsx 文件
      'components/**/*.tsx'     // 包含 components 下的所有 tsx 文件
    ],
    exclude: [
      'components/common/**/*.tsx'  // 排除 common 组件
    ]
  });

  try {
    // 解析文件并获取结果
    const files = await pathResolver.resolveFiles();

    // 打印结果
    console.log('找到的文件数量:', files.length);
    // console.log('\n文件详情:');
    // files.forEach((file, index) => {
    //   console.log(`\n文件 ${index + 1}:`);
    //   console.log('绝对路径:', file.absolutePath);
    //   console.log('命名空间:', file.namespace);
    //   console.log('文件内容长度:', file.content.length);1
    // });

    return files;

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}


// Main function to run the i18n key generator
async function main() {

  const srcDir = path.resolve(process.cwd(), 'src');

  console.log('path Generator');
  console.log('------------------');
  console.log(`Entry point: ${srcDir}`)
  // Get command line arguments or use defaults

  const files = await resolvePath(srcDir)


  console.log('I18n Key Generator');
  console.log('------------------');

  const outputDir = path.resolve(process.cwd(), 'output');
  const translationsPath = path.resolve(outputDir, 'translations.json');
  const configPath = path.resolve(process.cwd(), 'i18n-config.json');
  // Create parser with optional config
  const parser = new I18nParser(fs.existsSync(configPath) ? configPath : undefined);

  // Ensure output directory exists
  fs.ensureDirSync(outputDir);

  try {

    // Process each file
    for (const file of files!) {
      await processFile(parser, file.namespace ,file.absolutePath, outputDir, translationsPath);
    }

    console.log('\n✅ Successfully processed all files');
    console.log(`✅ Translations saved to: ${translationsPath}`);
  } catch (error) {
    console.error('❌ Error processing files:', error);
  }
}

main().catch(console.error);
