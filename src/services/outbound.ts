import { request } from '@umijs/max';

export type OutboundTraceRow = {
  id: number;
  inventory_id: number | null;
  roll_number: string;
  product_name: string;
  weight: number | null;
  specification: string;
  piece_weight: number | null;
  damaged: string;
  scan_at: string;
  revoked: boolean;
  is_fuzzy: boolean;
  scan_user_name: string;
  order_id: number;
  order_no: string;
  order_date: string;
  order_status: string;
  order_temp: boolean;
  completed_at: string | null;
  customer_id: number | null;
  customer_name: string;
  vehicle_no: string;
  container_no: string;
};

/** 出库追溯 GET /api/outbound/trace */
export async function getOutboundTrace(params: {
  current?: number;
  pageSize?: number;
  customer_id?: number;
  product_name?: string;
  weight?: number;
  specification?: string;
  keyword?: string;
  model_keyword?: string;
  roll_number?: string;
  order_no?: string;
  order_dateRange?: [string, string];
  scan_dateRange?: [string, string];
  include_revoked?: boolean;
}) {
  return request<{
    success: boolean;
    data: { list: OutboundTraceRow[]; total: number };
    errorMessage?: string;
  }>('/api/outbound/trace', { method: 'GET', params });
}
