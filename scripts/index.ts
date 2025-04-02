import path from 'path';
import fs from 'fs-extra';
import { I18nParser } from './parser';
import { PathResolver } from './pathResolver';
import { AstProcessor } from './astProcessor';
import { CodeGenerator } from './generator';
import {glob} from 'glob';

// 在顶部初始化配置，并将所有类实例化
const configPath = path.resolve(process.cwd(), 'i18n-config.json'); // 自定义配置
// 1. 初始化parser
const parser = new I18nParser();
// 2. 初始化processor
const astProcessor = new AstProcessor();
// 3. 初始化generator
const generator = new CodeGenerator();

const handleUpdateTranslations = (translationsPath:string,translations:Record<string,string>) => {
  if (fs.existsSync(translationsPath)) {
    // 如果文件存在，读取并更新
    const existingTranslations = fs.readJSONSync(translationsPath, { throws: false }) || {};
    const mergedTranslations = { ...existingTranslations, ...translations };
    fs.writeJSONSync(translationsPath, mergedTranslations, { spaces: 2 });
  }
  else {
    // 如果文件不存在，创建一个新的 translations.json
    console.log('Creating new translations.json file');
    // 确保目录存在
    const dir = path.dirname(translationsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // 创建一个新的 translations.json
    fs.writeJSONSync(translationsPath, translations, { spaces: 2 });

  }
}

// Process a single file
const processFile = async(
    namespace:string,
    filePath: string,
    outputDir: string,
    translationsPath: string
): Promise<void> => {
  try {
    console.log(`Processing file: ${filePath}`);

    // Determine output path (maintaining directory structure)
    const relativePath = path.relative(path.join(process.cwd(), 'src'), filePath);
    const outputPath = path.join(outputDir,'src', relativePath);

    // Create directory if it doesn't exist
    fs.ensureDirSync(path.dirname(outputPath));

    console.log("!!!", filePath)
    console.log("@@@", outputPath)
    // 1。解析文件，获取ast
    const originalAst = parser.parseFile(filePath,);

    // 2. 处理ast，返回处理后的ast以及翻译文本
    const { processedAST,translations } = astProcessor.processAST(originalAst);

    // 3. 将处理好后的ast进行格式化处理，并生成code
    const formattedCode = await generator.generateFormattedCode(processedAST);

    // 4. 更新 translations.json 文件
    handleUpdateTranslations(translationsPath, translations);

    // 5. 写回文件
    fs.writeFileSync(outputPath, formattedCode);

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
const main = async () => {

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

  // Ensure output directory exists
  fs.ensureDirSync(outputDir);

  try {

    // Process each file
    for (const file of files!) {
      await processFile(file.namespace ,file.absolutePath, outputDir, translationsPath);
    }

    console.log('\n✅ Successfully processed all files');
    console.log(`✅ Translations saved to: ${translationsPath}`);
  } catch (error) {
    console.error('❌ Error processing files:', error);
  }
}

main().catch(console.error);
