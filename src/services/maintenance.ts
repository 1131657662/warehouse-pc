import { request } from '@umijs/max';

export async function getMaintenanceStatus() {
  return request<{
    success: boolean;
    data: {
      scan_logs: { mainCount: number; archiveCount: number };
      archive_months_default: number;
      latest_backup: {
        file: string;
        sizeBytes: number;
        createdAt: string;
      } | null;
    };
  }>('/api/admin/maintenance/status', { method: 'GET' });
}

export async function repairOrphanReservations(body?: {
  dryRun?: boolean;
  customerId?: number;
  orderId?: number;
}) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: { repaired: number; orphans: { id: number; roll_number: string; reserved_order_id: number }[] };
  }>('/api/admin/maintenance/repair-orphans', { method: 'POST', data: body || {} });
}

export async function rebuildOrderSummary(orderId: number) {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: { orderId: number; scannedCount: number; scannedTons: number };
  }>('/api/admin/maintenance/rebuild-order', { method: 'POST', data: { orderId } });
}

export async function archiveScanLogs(body?: { dryRun?: boolean; months?: number }) {
  return request<{ success: boolean; errorMessage?: string; data: Record<string, unknown> }>(
    '/api/admin/maintenance/archive-scan-logs',
    { method: 'POST', data: body || {} },
  );
}

export async function refreshAllModelSummary() {
  return request<{ success: boolean; errorMessage?: string }>(
    '/api/admin/maintenance/refresh-model-summary',
    { method: 'POST', data: {} },
  );
}

export async function triggerDatabaseBackup() {
  return request<{
    success: boolean;
    errorMessage?: string;
    data: { file: string; sizeBytes: number; createdAt: string };
  }>('/api/admin/maintenance/backup-database', { method: 'POST', data: {} });
}
