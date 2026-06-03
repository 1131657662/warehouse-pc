import { getScanLogs } from '@/services/orders';

const DEFAULT_PAGE_SIZE = 200;

/** 分页拉取订单全部扫码日志（避免 pageSize 截断） */
export async function fetchAllScanLogs(
  orderId: number,
  options?: { filter?: 'valid' | 'revoked'; pageSize?: number },
): Promise<API.ScanLogItem[]> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  let current = 1;
  let total = Infinity;
  const all: API.ScanLogItem[] = [];

  while (all.length < total) {
    const res = await getScanLogs(orderId, {
      current,
      pageSize,
      filter: options?.filter,
    });
    if (!res.success) break;
    total = res.data?.total ?? 0;
    const batch = res.data?.list ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    current += 1;
  }
  return all;
}

/** 带 Token 下载后端导出文件（xlsx 等） */
export async function downloadAuthenticatedFile(apiPath: string, filename: string) {
  const { getToken } = await import('@/utils/token');
  const token = getToken();
  const res = await fetch(apiPath, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `导出失败 (${res.status})`;
    try {
      const data = await res.json();
      if (data?.errorMessage) msg = data.errorMessage;
    } catch {
      /* 非 JSON */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 构建库存导出 query（与列表筛选一致） */
export function buildInventoryExportQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  if (params.keyword) q.set('keyword', String(params.keyword));
  if (params.customer_id) q.set('customer_id', String(params.customer_id));
  if (params.product_name_search) q.set('product_name_search', String(params.product_name_search));
  if (params.weight_s) q.set('weight_s', String(params.weight_s));
  if (params.spec_s) q.set('spec_s', String(params.spec_s));
  const s = q.toString();
  return s ? `?${s}` : '';
}
