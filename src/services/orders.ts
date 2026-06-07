import { request } from '@umijs/max';

/** 订单列表 GET /api/orders */
export async function getOrderList(params: {
  current?: number;
  pageSize?: number;
  order_no?: string;
  customer_id?: number;
  status?: string[];
  dateRange?: [string, string];
}) {
  return request<{
    success: boolean;
    data: { list: API.OrderItem[]; total: number };
  }>('/api/orders', { method: 'GET', params });
}

/** 创建订单 POST /api/orders */
export async function createOrder(body: {
  customer_id: number;
  order_date: string;
  vehicle_no?: string;
  container_no?: string;
  remark?: string;
  temp?: boolean;
  items?: {
    product_name: string;
    weight: number | null;
    specification: string;
    planned_qty: number;
    estimated_ton?: number;
    remark?: string;
  }[];
}) {
  return request<{ success: boolean; errorMessage?: string; data?: { id: number; order_no: string } }>(
    '/api/orders',
    { method: 'POST', data: body },
  );
}

/** 订单详情 GET /api/orders/:id */
export async function getOrderDetail(id: number) {
  return request<{ success: boolean; data: API.OrderDetail }>(
    `/api/orders/${id}`,
    { method: 'GET' },
  );
}

/** 编辑订单 PUT /api/orders/:id */
export async function updateOrder(id: number, body: any) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}`,
    { method: 'PUT', data: body },
  );
}

/** 取消订单 PUT /api/orders/:id/cancel */
export async function cancelOrder(id: number) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}/cancel`,
    { method: 'PUT' },
  );
}

/** 回退到出库中 PUT /api/orders/:id/rollback */
export async function rollbackOrder(id: number) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}/rollback`,
    { method: 'PUT' },
  );
}

/** 手动批量出库 POST /api/orders/:id/manual-out */
export async function manualOutbound(
  id: number,
  body: {
    roll_numbers?: string[];
    select_all_under_model?: boolean;
    product_name?: string;
    weight?: number | null;
    specification?: string;
  },
) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}/manual-out`,
    { method: 'POST', data: body },
  );
}

/** 提交完成 PUT /api/orders/:id/submit */
export async function submitOrder(id: number, body?: { _version?: number }) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}/submit`,
    { method: 'PUT', data: body },
  );
}

/** 临时单转正 PUT /api/orders/:id/convert-temp */
export async function convertTempOrder(
  id: number,
  body: {
    order_date?: string;
    vehicle_no?: string;
    container_no?: string;
    remark?: string;
    items: {
      product_name: string;
      weight: number | null;
      specification: string;
      planned_qty: number;
      estimated_ton?: number;
      remark?: string;
    }[];
  },
) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/orders/${id}/convert-temp`,
    { method: 'POST', data: body },
  );
}

/** 可出库卷号 GET /api/orders/:id/available-rolls */
export async function getAvailableRolls(
  id: number,
  params?: {
    keyword?: string;
    product_name?: string;
    weight?: number | null;
    specification?: string;
    current?: number;
    pageSize?: number;
  },
) {
  return request<{
    success: boolean;
    data: {
      list: API.AvailableRoll[];
      total: number;
      current: number;
      pageSize: number;
    };
  }>(
    `/api/orders/${id}/available-rolls`,
    { method: 'GET', params },
  );
}

/** 扫码汇总 GET /api/orders/:id/scan-summary */
export async function getScanSummary(id: number) {
  return request<{ success: boolean; data: API.ScanSummaryItem[] }>(
    `/api/orders/${id}/scan-summary`,
    { method: 'GET' },
  );
}

/** 扫码明细 GET /api/orders/:id/scan-logs */
export async function getScanLogs(
  id: number,
  params?: { current?: number; pageSize?: number; filter?: 'valid' | 'revoked' },
) {
  return request<{ success: boolean; data: { list: API.ScanLogItem[]; total: number } }>(
    `/api/orders/${id}/scan-logs`,
    { method: 'GET', params },
  );
}

/** 获取打印限域 Token POST /api/orders/:id/print-token */
export async function getPrintToken(id: number) {
  return request<{ success: boolean; data?: { token: string } }>(
    `/api/orders/${id}/print-token`,
    { method: 'POST' },
  );
}

/** 导出订单扫码明细 GET /api/orders/:id/export-scan */
export async function downloadOrderScanExport(id: number) {
  return `/api/orders/${id}/export-scan`;
}
