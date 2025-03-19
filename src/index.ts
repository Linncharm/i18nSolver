import path from 'path';
import fs from 'fs-extra';
import { I18nParser } from './parser';

// Main function to run the i18n key generator
async function main() {
  // Get command line arguments
  // const args = process.argv.slice(2);
  const inputPath = path.join(__dirname, './test-component.tsx') || './test-component.tsx';
  const outputPath =
    path.join(__dirname, './output/test-component.i18n.tsx') || './test-component.i18n.tsx';
  const translationsPath =
    path.join(__dirname, './output/translations.json') || './translations.json';
  const configPath = path.join(__dirname, './i18n-config.json') || './i18n-config.json';

  console.log('I18n Key Generator');
  console.log('------------------');
  console.log(`Input file: ${inputPath}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`Translations output: ${translationsPath}`);

  // Create parser with optional config
  const parser = new I18nParser(fs.existsSync(configPath) ? configPath : undefined);

  try {
    // Parse the file
    const result = await parser.parseFile(inputPath, outputPath);

    // Save translations
    parser.saveTranslations(translationsPath);

    console.log(`\n✅ Successfully processed ${Object.keys(result.translations).length} strings`);
    console.log(`✅ Generated output saved to: ${outputPath}`);
    console.log(`✅ Translations saved to: ${translationsPath}`);
  } catch (error) {
    console.error('❌ Error processing file:', error);
  }
}

main().catch(console.error);
