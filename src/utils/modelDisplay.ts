/** 去尾零，保留有效小数位（支持 API 返回的长 DECIMAL 字符串） */
export function stripDecimalZeros(
  value: number | string | null | undefined,
): string {
  if (value == null || value === '') return '-';
  let s = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return s || '-';
    s = n.toFixed(12);
  }
  if (s === '-0' || s === '-0.') return '0';
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  if (s.includes('.')) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  s = s.replace(/^0+(?=\d)/, '') || '0';
  if (neg && s !== '0') return `-${s}`;
  return s;
}

function normalizeDecimalInput(
  value: number | string | null | undefined,
): string {
  if (value == null || value === '') return '0';
  const s = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  const n = Number(s);
  if (!Number.isFinite(n)) return '0';
  return stripDecimalZeros(n.toFixed(12));
}

function fromScaledBigInt(neg: boolean, bi: bigint, scale: number): string {
  const str = bi.toString().padStart(scale + 1, '0');
  const intLen = str.length - scale;
  const intPart = str.slice(0, intLen).replace(/^0+(?=\d)/, '') || '0';
  const fracPart = str.slice(intLen);
  const combined = fracPart ? `${intPart}.${fracPart}` : intPart;
  return stripDecimalZeros(neg ? `-${combined}` : combined);
}

/** 高精度十进制累加（最多 12 位小数） */
export function addDecimal(
  ...values: Array<number | string | null | undefined>
): string {
  const scale = 12;
  let sum = 0n;
  for (const v of values) {
    const s = normalizeDecimalInput(v);
    const neg = s.startsWith('-');
    const abs = neg ? s.slice(1) : s;
    const [intPart, fracPart = ''] = abs.split('.');
    const fracPadded = (fracPart + '0'.repeat(scale)).slice(0, scale);
    const bi = BigInt(intPart + fracPadded);
    sum += neg ? -bi : bi;
  }
  const neg = sum < 0n;
  const bi = neg ? -sum : sum;
  return fromScaledBigInt(neg, bi, scale);
}

function stripTrailingZerosFromNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(12).replace(/\.?0+$/, '');
}

/** 克重展示：去尾零 + g（库内为纯数字，单位 g） */
export function formatWeightDisplay(
  weight: number | string | null | undefined,
): string {
  if (weight == null || weight === '') return '-';
  const s = stripDecimalZeros(weight);
  if (s === '-') return '-';
  if (!/^-?\d+(\.\d+)?$/.test(String(weight).trim())) {
    const n = Number(weight);
    if (!Number.isFinite(n)) return String(weight).trim();
    return `${stripTrailingZerosFromNumber(n)}g`;
  }
  return `${s}g`;
}

/** 件重展示：去尾零 + kg */
export function formatPieceWeightDisplay(
  kg: number | string | null | undefined,
): string {
  const s = stripDecimalZeros(kg);
  if (s === '-') return '-';
  return `${s}kg`;
}

/** 件重 kg → 吨位（全精度字符串，不带单位） */
export function tonFromPieceWeightKg(
  kg: number | string | null | undefined,
): string {
  if (kg == null || kg === '') return '0';
  let s = String(kg).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return '0';
    return tonFromPieceWeightKg(n.toFixed(12));
  }
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  const [intPart, fracPart = ''] = s.split('.');
  const sk = fracPart.length;
  const st = sk + 3;
  const bi = BigInt((intPart || '0') + fracPart.padEnd(sk, '0'));
  const str = bi.toString().padStart(st + 1, '0');
  const intLen = str.length - st;
  const intP = str.slice(0, intLen).replace(/^0+(?=\d)/, '') || '0';
  const fracP = str.slice(intLen);
  const combined = fracP ? `${intP}.${fracP}` : intP;
  return stripDecimalZeros(neg ? `-${combined}` : combined);
}

/** 件重 kg → 吨位展示（全精度去尾零） */
export function formatTonFromPieceWeightKg(
  kg: number | string | null | undefined,
): string {
  if (kg == null || kg === '') return '-';
  return tonFromPieceWeightKg(kg);
}

/** 吨位 + 件重(kg) 累加 */
export function addTonFromPieceWeightKg(
  ton: number | string | null | undefined,
  kg: number | string | null | undefined,
): string {
  if (kg == null || kg === '') return normalizeDecimalInput(ton);
  return addDecimal(ton, tonFromPieceWeightKg(kg));
}

/** 多件重(kg) → 总吨位 */
export function sumTonFromPieceWeightsKg(
  weights: Array<number | string | null | undefined>,
): string {
  return weights.reduce<string>(
    (sum, kg) => addTonFromPieceWeightKg(sum, kg),
    '0',
  );
}

/** 吨位展示：去尾零，不带单位（调用方加「吨」） */
export function formatTonDisplay(
  ton: number | string | null | undefined,
): string {
  return stripDecimalZeros(ton);
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
    return `${stripDecimalZeros(text)}mm`;
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
