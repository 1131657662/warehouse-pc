import { request } from '@umijs/max';

/** POST /api/scan/match */
export async function scanMatch(body: {
  orderId: number;
  barcode: string;
  customerId?: number;
}) {
  return request<{ success: boolean; data?: any; errorMessage?: string }>(
    '/api/scan/match',
    { method: 'POST', data: body },
  );
}

/** POST /api/scan/confirm */
export async function scanConfirm(body: {
  orderId: number;
  barcode: string;
  inventoryId?: number;
  _version?: number;
}) {
  return request<{ success: boolean; data?: any; errorMessage?: string }>(
    '/api/scan/confirm',
    { method: 'POST', data: body },
  );
}

/** POST /api/scan/remove */
export async function scanRemove(body: {
  orderId: number;
  barcode?: string;
  scanLogId?: number;
  _version?: number;
}) {
  return request<{ success: boolean; errorMessage?: string }>(
    '/api/scan/remove',
    { method: 'POST', data: body },
  );
}

/** POST /api/scan/bulk-remove — 批量撤销 / 撤销全部计划外 */
export async function scanBulkRemove(body: {
  orderId: number;
  scanLogIds?: number[];
  onlyUnplanned?: boolean;
}) {
  return request<{ success: boolean; errorMessage?: string; data?: { removed: number } }>(
    '/api/scan/bulk-remove',
    { method: 'POST', data: body },
  );
}
