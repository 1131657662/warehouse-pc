import { request } from '@umijs/max';

/** 仪表盘统计 GET /api/dashboard/stats */
export async function getDashboardStats() {
  return request<{
    success: boolean;
    data: {
      totalInventory: number;
      todayOrders: number;
      pendingScan: number;
      completedToday: number;
      todayOutboundTons?: number;
      orderTrend: { date: string; count: number }[];
      pendingOrders: API.OrderItem[];
      lowStock?: {
        customer_name: string;
        product_name: string;
        weight: number;
        specification: string;
        total_quantity: number;
      }[];
    };
  }>('/api/dashboard/stats', { method: 'GET' });
}
