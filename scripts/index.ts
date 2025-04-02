import path from 'path';
import fs from 'fs-extra';

import { I18nParser } from './parser';
import { PathResolver } from './pathResolver';
import { AstProcessor } from './astProcessor';

import { I18nService } from './service';
import { CodeGenerator } from './generator';

import { SUPPORTED_LOCALES } from './constants';


const handleExtractTranslations = (outputDir: string, translations: Record<string, string>, namespace: string) => {
  // 确保 translations 目录存在
  const translationsDir = outputDir;
  fs.ensureDirSync(translationsDir);

  // 处理每个语言文件
  SUPPORTED_LOCALES.forEach(locale => {
    const translationsPath = path.join(translationsDir, `${locale}.json`);

    if (locale === 'en') {
      // 处理英文翻译文件（包含实际内容）
      if (fs.existsSync(translationsPath)) {
        // 如果文件存在，读取并更新
        const existingTranslations = fs.readJSONSync(translationsPath, { throws: false }) || {};

        // 检查命名空间是否存在
        if (existingTranslations[namespace]) {
          // 如果命名空间存在，合并该命名空间下的翻译
          existingTranslations[namespace] = {
            ...existingTranslations[namespace],
            ...translations
          };
        } else {
          // 如果命名空间不存在，创建新的命名空间
          existingTranslations[namespace] = translations;
        }

        // 写回文件
        fs.writeJSONSync(translationsPath, existingTranslations, { spaces: 2 });
      } else {
        // 创建新的英文翻译文件
        const newTranslations = {
          [namespace]: translations
        };
        fs.writeJSONSync(translationsPath, newTranslations, { spaces: 2 });
      }
    } else {
      // 处理其他语言文件（创建空结构）
      if (!fs.existsSync(translationsPath)) {
        // 如果其他语言文件不存在，创建与英文相同结构但值为空的文件
        const emptyTranslations = {
          [namespace]: Object.fromEntries(
            Object.keys(translations).map(key => [key, ''])
          )
        };
        fs.writeJSONSync(translationsPath, emptyTranslations, { spaces: 2 });
      } else {
        // 如果文件已存在，添加新的命名空间和键（如果不存在）
        const existingTranslations = fs.readJSONSync(translationsPath, { throws: false }) || {};
        if (!existingTranslations[namespace]) {
          existingTranslations[namespace] = Object.fromEntries(
            Object.keys(translations).map(key => [key, ''])
          );
          fs.writeJSONSync(translationsPath, existingTranslations, { spaces: 2 });
        } else {
          // 确保所有新的键都被添加
          const updatedTranslations = {
            ...existingTranslations[namespace],
            ...Object.fromEntries(
              Object.keys(translations)
                .filter(key => !existingTranslations[namespace][key])
                .map(key => [key, ''])
            )
          };
          existingTranslations[namespace] = updatedTranslations;
          fs.writeJSONSync(translationsPath, existingTranslations, { spaces: 2 });
        }
      }
    }
  });
};

// Process a single file
const processFile = async(
    namespace:string,
    filePath: string,
    outputDir: string,
    translationsPath: string,
    processingService:{
      parser: I18nParser;
      astProcessor: AstProcessor;
      generator: CodeGenerator;
    }
): Promise<void> => {
  try {
    const { parser, astProcessor, generator } = processingService;

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
    const { processedAST,translations } = astProcessor.processAST(originalAst,namespace);

    // 3. 将处理好后的ast进行格式化处理，并生成code
    const formattedCode = await generator.generateFormattedCode(processedAST);

    // 4. 更新 translations.json 文件
    handleExtractTranslations(translationsPath, translations, namespace);

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

  // 在顶部初始化配置，并将所有类实例化
  const configPath = path.resolve(process.cwd(), 'i18n-config.json'); // 自定义配置

  // 初始化服务和 context
  const service = I18nService.getInstance();

  const processingService = {
    parser: service.getParser(),
    astProcessor: service.getProcessor(),
    generator: service.getGenerator()
  };

  console.log('path Generator');
  console.log('------------------');
  console.log(`Entry point: ${srcDir}`)
  // Get command line arguments or use defaults

  const files = await resolvePath(srcDir)


  console.log('I18n Key Generator');
  console.log('------------------');

  const outputDir = path.resolve(process.cwd(), 'output');
  const translationsPath = path.resolve(outputDir, 'translations');

  // Ensure output directory exists
  fs.ensureDirSync(outputDir);


  try {
    // Process each file
    for (const file of files!) {
      await processFile(
        file.namespace ,
        file.absolutePath,
        outputDir,
        translationsPath,
        processingService
      );
    }

    console.log('\n✅ Successfully processed all files');
    console.log(`✅ Translations saved to: ${translationsPath}`);
  } catch (error) {
    console.error('❌ Error processing files:', error);
  }
}

main().catch(console.error);
