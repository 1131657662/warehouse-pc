import { modelKey } from '@/components/Order/AddModelModal';

type ModelParts = {
  product_name: string;
  weight: number | null;
  specification: string;
};

export function buildModelCodeLabelMap(
  items: (ModelParts & { code?: string })[],
): Map<string, string> {
  const sets = new Map<string, Set<string>>();
  for (const item of items) {
    const c = (item.code || '').trim();
    if (!c) continue;
    const key = modelKey(item);
    if (!sets.has(key)) sets.set(key, new Set());
    sets.get(key)?.add(c);
  }
  return new Map([...sets.entries()].map(([k, s]) => [k, [...s].join('、')]));
}

export function mergeSummaryStockCodes<
  T extends ModelParts & { stock_codes?: string },
>(rows: T[], summary: API.ScanSummaryItem[]): T[] {
  const codeMap = new Map(
    summary.map((s) => [modelKey(s), s.stock_codes || s.codes || '']),
  );
  return rows.map((r) => ({
    ...r,
    stock_codes: codeMap.get(modelKey(r)) || r.stock_codes || '',
  }));
}

export function applyStockCodeMap<
  T extends ModelParts & { stock_codes?: string },
>(rows: T[], codeMap: Map<string, string>): T[] {
  return rows.map((r) => ({
    ...r,
    stock_codes: codeMap.get(modelKey(r)) || '',
  }));
}
