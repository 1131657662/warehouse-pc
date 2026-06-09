import { request } from '@umijs/max';

/** 库存列表 GET /api/inventory */
export async function getInventoryList(params: {
  current?: number;
  pageSize?: number;
  keyword?: string;
  customer_id?: number;
  product_name?: string;
  weight?: string;
  specification?: string;
}) {
  return request<{
    success: boolean;
    data: { list: API.InventoryItem[]; total: number };
  }>('/api/inventory', { method: 'GET', params });
}

/** 库存详情 GET /api/inventory/:id */
export async function getInventoryDetail(id: number) {
  return request<{ success: boolean; data: API.InventoryItem }>(
    `/api/inventory/${id}`,
    { method: 'GET' },
  );
}

/** 新增库存 POST /api/inventory */
export async function createInventory(body: API.InventoryForm) {
  return request<{ success: boolean; errorMessage?: string }>(
    '/api/inventory',
    { method: 'POST', data: body },
  );
}

/** 编辑库存 PUT /api/inventory/:id */
export async function updateInventory(id: number, body: API.InventoryForm) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/inventory/${id}`,
    { method: 'PUT', data: body },
  );
}

/** 单条删除 DELETE /api/inventory/:id */
export async function deleteInventory(id: number) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/inventory/${id}`,
    { method: 'DELETE' },
  );
}

/** 按四维度批量删除 POST /api/inventory/batch-delete */
export async function batchDeleteInventory(body: {
  customer_id?: number;
  product_name?: string;
  weight?: number;
  specification?: string;
}) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: { deletedCount: number };
  }>('/api/inventory/batch-delete', { method: 'POST', data: body });
}

/** 批量改客户 POST /api/inventory/batch-change-customer */
export async function batchChangeInventoryCustomer(
  rows: {
    row?: number;
    status?: string;
    customer_id: number;
    new_customer_id: number;
    roll_number: string;
  }[],
  options?: { skipErrorHandler?: boolean; timeout?: number },
) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: {
      successCount: number;
      failCount: number;
      failRows: { row: number; roll_number?: string; message?: string }[];
    };
  }>('/api/inventory/batch-change-customer', {
    method: 'POST',
    data: { rows },
    skipErrorHandler: options?.skipErrorHandler,
    timeout: options?.timeout ?? 120000,
  });
}

/** 批量更新库存 POST /api/inventory/batch-update */
export async function batchUpdateInventory(
  rows: {
    row?: number;
    status?: string;
    customer_id: number;
    product_name: string;
    weight: number | null;
    piece_weight: number | null;
    specification: string;
    roll_number: string;
    code: string;
    quantity: number;
    damaged: string;
    remark: string;
  }[],
  options?: { skipErrorHandler?: boolean; timeout?: number },
) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: {
      successCount: number;
      failCount: number;
      failRows: { row: number; roll_number?: string; message?: string }[];
    };
  }>('/api/inventory/batch-update', {
    method: 'POST',
    data: { rows },
    skipErrorHandler: options?.skipErrorHandler,
    timeout: options?.timeout ?? 120000,
  });
}

/** 批量导入 POST /api/inventory/import */
export async function importInventory(
  rows: {
    row?: number;
    status?: string;
    customer_id: number;
    product_name: string;
    weight: number | null;
    piece_weight: number | null;
    specification: string;
    roll_number: string;
    quantity: number;
    damaged: string;
    remark: string;
  }[],
  options?: {
    skipErrorHandler?: boolean;
    timeout?: number;
    batchKey?: string;
    fileName?: string;
    batchFinal?: boolean;
  },
) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: {
      successCount: number;
      skipCount: number;
      errorCount: number;
      failCount?: number;
      reportId?: number | null;
      errors: { row: number; roll_number?: string; message?: string }[];
    };
  }>('/api/inventory/import', {
    method: 'POST',
    data: {
      rows,
      batchKey: options?.batchKey,
      fileName: options?.fileName,
      batchFinal: options?.batchFinal,
    },
    skipErrorHandler: options?.skipErrorHandler,
    timeout: options?.timeout ?? 120000,
  });
}

/** 导入报告列表 GET /api/inventory/import-reports */
export async function getImportReports(params?: { current?: number; pageSize?: number }) {
  return request<{
    success: boolean;
    data: { list: API.ImportReportItem[]; total: number };
  }>('/api/inventory/import-reports', { method: 'GET', params });
}

/** 重建型号汇总 POST /api/inventory/refresh-model-summary */
export async function refreshModelSummary(body?: { customer_id?: number }) {
  return request<{ success: boolean; errorMessage?: string }>(
    '/api/inventory/refresh-model-summary',
    { method: 'POST', data: body || {} },
  );
}

/** 卷号生命周期 GET /api/inventory/lifecycle */
export async function getInventoryLifecycle(params: { id?: number; roll_number?: string }) {
  return request<{ success: boolean; data: API.RollLifecycle }>(
    '/api/inventory/lifecycle',
    { method: 'GET', params },
  );
}

/** 库存汇总 GET /api/inventory/summary */
export async function getInventorySummary(params: {
  customer_id?: number;
  product_name?: string;
  keyword?: string;
  model_keyword?: string;
  weight?: string;
  specification?: string;
}) {
  return request<{ success: boolean; data: API.InventorySummary[] }>(
    '/api/inventory/summary',
    { method: 'GET', params },
  );
}

/** 型号汇总 GET /api/inventory/model-summary — 打开选型号弹窗时预加载 */
export async function getInventoryModelSummary(customer_id: number) {
  return request<{
    success: boolean;
    data: {
      product_name: string;
      weight: number | null;
      specification: string;
      stock_qty: number;
      stock_ton: number;
    }[];
  }>('/api/inventory/model-summary', {
    method: 'GET',
    params: { customer_id },
    skipErrorHandler: true,
  });
}

/** 型号搜索 GET /api/inventory/search */
export async function searchInventory(keyword: string, customer_id?: number) {
  return request<{
    success: boolean;
    data: {
      product_name: string;
      weight: number | null;
      specification: string;
      stock_qty: number;
      stock_ton: number;
      customer_id?: number;
    }[];
  }>('/api/inventory/search', { method: 'GET', params: { keyword, customer_id } });
}
