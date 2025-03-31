import { PathResolver } from './pathResolver';

async function testPathResolver() {
  // 创建 PathResolver 实例，配置包含和排除的文件模式
  const pathResolver = new PathResolver({
    srcDir: 'src',
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
    console.log('\n文件详情:');
    files.forEach((file, index) => {
      console.log(`\n文件 ${index + 1}:`);
      console.log('绝对路径:', file.absolutePath);
      console.log('命名空间:', file.namespace);
    });

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testPathResolver();