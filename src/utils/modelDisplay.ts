/** 去掉小数尾零，200.000 → "200"，57.8 → "57.8" */
function stripTrailingZeros(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(10).replace(/\.?0+$/, '');
}

/** 克重展示：去尾零 + g（库内为纯数字，单位 g） */
export function formatWeightDisplay(
  weight: number | string | null | undefined,
): string {
  if (weight == null || weight === '') return '-';
  const n = Number(weight);
  if (!Number.isFinite(n)) return String(weight).trim();
  return `${stripTrailingZeros(n)}g`;
}

const COMPOSITE_SPEC = /[*×xX]/;

/** 门幅/规格展示：纯数字加 mm，复合规格原样 */
export function formatSpecDisplay(
  specification: string | number | null | undefined,
): string {
  if (specification == null || specification === '') return '-';
  const text = String(specification).trim();
  if (!text) return '-';
  if (COMPOSITE_SPEC.test(text)) return text;
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return `${stripTrailingZeros(Number(text))}mm`;
  }
  return text;
}

/** 型号标签：品名 / 克重g / 门幅mm */
export function formatModelLabel(
  product_name: string,
  weight: number | string | null | undefined,
  specification?: string | null,
): string {
  const w = weight != null && weight !== '' ? formatWeightDisplay(weight) : '-';
  const s = formatSpecDisplay(specification);
  return `${product_name} / ${w} / ${s}`;
}
