/** 规范化 Excel 表头：去 BOM、首尾空白、中间空格 */
export function normalizeImportHeader(header: string): string {
  return String(header ?? '')
    .replace(/\ufeff/g, '')
    .trim()
    .replace(/\s+/g, '');
}

/** 从一行数据中按别名读取字段（表头允许空格/大小写差异） */
export function pickImportField(
  row: Record<string, unknown>,
  aliases: string[],
): string {
  const aliasNorms = aliases.map(normalizeImportHeader);

  for (const [key, value] of Object.entries(row)) {
    const keyNorm = normalizeImportHeader(key);
    if (!aliasNorms.includes(keyNorm)) continue;
    const text = cellToImportString(value);
    if (text) return text;
  }

  for (const alias of aliases) {
    const text = cellToImportString(row[alias]);
    if (text) return text;
  }

  return '';
}

/** 单元格转字符串（兼容 Excel 数字型卷号，避免 123456 变空） */
export function cellToImportString(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    const fixed = value.toFixed(6).replace(/\.?0+$/, '');
    return fixed;
  }
  return String(value).trim();
}

export const IMPORT_FIELD_ALIASES = {
  customer_code: ['客户编码', '客户代码', 'customer_code', 'CustomerCode'],
  customer_name: ['客户名称', '客户', 'customer_name', 'CustomerName'],
  product_name: ['品名', '产品名称', '产品', 'product_name', 'ProductName'],
  weight: ['克重', '克重(kg)', '克重（kg）', 'weight', 'Weight'],
  specification: ['规格', 'specification', 'Specification'],
  roll_number: ['卷号', '卷筒号', '条码', '条形码', '货物编号', 'roll_number', 'RollNumber', 'roll', 'Roll'],
  piece_weight: ['件重(kg)', '件重（kg）', '件重', '单件重量', 'piece_weight', 'PieceWeight'],
  quantity: ['件数', '数量', 'quantity', 'Quantity'],
  damaged: ['破损', 'damaged', 'Damaged'],
  remark: ['备注', 'remark', 'Remark'],
} as const;
