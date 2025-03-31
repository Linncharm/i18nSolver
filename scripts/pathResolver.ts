import path from 'path';
import { glob } from 'glob';

interface FileInfo {
  absolutePath: string;
  namespace: string;
  content?: string;
}

interface PathResolverConfig {
  include: string[];
  exclude: string[];
  srcDir: string;
}

export class PathResolver {
  private config: PathResolverConfig;

  constructor(config: PathResolverConfig) {
    this.config = {
      srcDir: path.resolve(process.cwd(), config.srcDir || 'src'),
      include: config.include || ['**/*.tsx'],
      exclude: config.exclude || [],
    };
  }

  private getNamespace(filePath: string): string {
    const relativePath = path.relative(this.config.srcDir, filePath);
    const dirs = relativePath.split(path.sep);

    // 移除文件名
    dirs.pop();

    // 从后向前查找第一个非括号的目录名
    for (let i = dirs.length - 1; i >= 0; i--) {
      if (!dirs[i].startsWith('(') && !dirs[i].endsWith(')')) {
        const rawFileName = path.basename(filePath, path.extname(filePath));

        // 转换文件名为 PascalCase
        const fileName = rawFileName
          .split(/[-_]/)  // 按照 - 或 _ 分割
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))  // 每个部分首字母大写
          .join('');


        return `${dirs[i].charAt(0).toUpperCase() + dirs[i].slice(1)}${fileName}`;
      }
    }

    const rawFileName = path.basename(filePath, path.extname(filePath));

    // 转换文件名为 PascalCase
    const fileName = rawFileName
      .split(/[-_]/)  // 按照 - 或 _ 分割
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))  // 每个部分首字母大写
      .join('');
    return `Root${fileName.charAt(0).toUpperCase() + fileName.slice(1)}`;
  }

  public async resolveFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    // 构建 glob 模式
    const includePatterns = this.config.include.map(pattern =>
      path.join(this.config.srcDir, pattern)
    );

    const excludePatterns = this.config.exclude.map(pattern =>
      path.join(this.config.srcDir, pattern)
    );

    // 获取所有匹配的文件
    const matchedFiles = await glob(includePatterns, {
      ignore: excludePatterns,
      absolute: true,
    });

    // 处理每个文件
    for (const filePath of matchedFiles) {
      try {
        //const content = await fs.readFile(filePath, 'utf-8');
        const namespace = this.getNamespace(filePath);

        files.push({
          absolutePath: filePath,
          namespace,
        });
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    return files;
  }
}
