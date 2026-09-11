// src/catalog.js
import filmSchema from '../schemas/film.schema.json';
import digitizationSchema from '../schemas/digitization.schema.json';

// 1. 静态导入所有胶卷子 schema
const filmModules = import.meta.glob('../schemas/film/*.schema.json', { eager: true });

// 2. 动态构建 filmDict
function buildFilmDict() {
  const dict = {};
  const brands = filmSchema.properties?.brand?.enum || [];

  // 初始化所有品牌数组
  brands.forEach(b => { dict[b] = []; });

  // 遍历匹配到的文件模块并提取型号
  for (const [path, mod] of Object.entries(filmModules)) {
    // 从文件名截取品牌名称，如 '../schemas/film/fujifilm.schema.json' -> 'fujifilm'
    const match = path.match(/\/([^/]+)\.schema\.json$/);
    if (!match) continue;

    const filePrefix = match[1].toLowerCase();

    // 在 Schema 的合法品牌中找到对应的那一项（忽略大小写匹配）
    const matchedBrand = brands.find(b => b.toLowerCase() === filePrefix);
    if (!matchedBrand) continue;

    const content = mod?.default || mod;
    if (Array.isArray(content?.enum)) {
      dict[matchedBrand] = content.enum;
    }
  }

  return dict;
}

// 3. 构建扫描仪字典
function buildScannerDict() {
  const dict = {};
  const scannerBranch = digitizationSchema.items?.oneOf?.find(
    branch => branch.properties?.method?.const === "scanner"
  );

  if (!scannerBranch) return dict;

  const brands = scannerBranch.properties?.brand?.enum || [];
  brands.forEach(b => { dict[b] = []; });

  const rules = scannerBranch.allOf || [];
  for (const rule of rules) {
    const brand = rule.if?.properties?.brand?.const;
    const models = rule.then?.properties?.model?.enum;
    if (brand && Array.isArray(models)) {
      dict[brand] = models;
    }
  }

  return dict;
}

export const filmDict = buildFilmDict();
export const scannerDict = buildScannerDict();