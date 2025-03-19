import path from 'path';
import fs from 'fs-extra';
import { I18nParser } from './parser';

// Main function to run the i18n key generator
async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    const inputPath = args[0] || './test-component.tsx';
    const outputPath = args[1] || './test-component.i18n.tsx';
    const translationsPath = args[2] || './translations.json';
    const configPath = args[3] || './parsing-config.json';

    console.log('I18n Key Generator');
    console.log('------------------');
    console.log(`Input file: ${inputPath}`);
    console.log(`Output file: ${outputPath}`);
    console.log(`Translations output: ${translationsPath}`);

    // Create parser with optional config
    const parser = new I18nParser(
        fs.existsSync(configPath) ? configPath : undefined
    );

    try {
        // Parse the file
        const result = parser.parseFile(inputPath, outputPath);

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