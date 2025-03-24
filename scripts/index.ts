import path from 'path';
import fs from 'fs-extra';
import { I18nParser } from './parser';
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
    filePath: string,
    outputDir: string,
    translationsPath: string
): Promise<void> {
  try {
    console.log(`Processing file: ${filePath}`);

    // Determine output path (maintaining directory structure)
    const relativePath = path.relative(path.join(process.cwd(), 'src'), filePath);
    const outputPath = path.join(outputDir, relativePath);

    // Create directory if it doesn't exist
    fs.ensureDirSync(path.dirname(outputPath));

    // Parse and transform the file
    const result = await parser.parseFile(filePath, outputPath);

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


// Main function to run the i18n key generator
async function main() {
  // Get command line arguments or use defaults
  const srcDir = path.resolve(process.cwd(), 'src');
  const outputDir = path.resolve(process.cwd(), 'output');
  const translationsPath = path.resolve(outputDir, 'translations.json');
  const configPath = path.resolve(process.cwd(), 'i18n-config.json');

  console.log('I18n Key Generator');
  console.log('------------------');
  console.log(`Source directory: ${srcDir}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Translations output: ${translationsPath}`);

  // Create parser with optional config
  const parser = new I18nParser(fs.existsSync(configPath) ? configPath : undefined);

  // Ensure output directory exists
  fs.ensureDirSync(outputDir);

  try {
    // Find all .tsx files in the src directory (recursive)
    const files = glob.sync('**/*.tsx', { cwd: srcDir, absolute: true });

    console.log(`Found ${files.length} .tsx files to process`);

    // Process each file
    for (const file of files) {
      await processFile(parser, file, outputDir, translationsPath);
    }

    console.log('\n✅ Successfully processed all files');
    console.log(`✅ Translations saved to: ${translationsPath}`);
  } catch (error) {
    console.error('❌ Error processing files:', error);
  }
}

main().catch(console.error);
