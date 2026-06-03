import { request } from '@umijs/max';

export type PerformanceRow = {
  user_id: number;
  user_name: string;
  phone: string;
  role: string;
  scan_count: number;
  order_count: number;
  scan_tons: string;
  completed_orders: number;
};

/** GET /api/reports/performance */
export async function getPerformanceReport(params?: { start?: string; end?: string }) {
  return request<{
    success: boolean;
    data: { list: PerformanceRow[] };
  }>('/api/reports/performance', { method: 'GET', params });
}

/** GET /api/reports/low-stock */
export async function getLowStockReport(threshold?: number) {
  return request<{
    success: boolean;
    data: {
      customer_name: string;
      product_name: string;
      weight: number;
      specification: string;
      total_quantity: number;
    }[];
  }>('/api/reports/low-stock', { method: 'GET', params: { threshold } });
}
