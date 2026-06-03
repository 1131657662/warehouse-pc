import { request } from '@umijs/max';

export type ReportConfigItem = {
  id: number;
  name: string;
  report_url: string;
  template_id: string;
  description?: string;
  is_default: boolean;
  export_type: 'preview' | 'pdf';
  created_at?: string;
  updated_at?: string;
};

/** 列表 GET /api/report-configs */
export async function getReportConfigList() {
  return request<{
    success: boolean;
    data?: { list: ReportConfigItem[]; total: number };
    errorMessage?: string;
  }>('/api/report-configs', { method: 'GET' });
}

/** 默认配置 GET /api/report-configs/default（打印时调用） */
export async function getDefaultReportConfig() {
  return request<{
    success: boolean;
    data?: ReportConfigItem;
    errorMessage?: string;
  }>('/api/report-configs/default', { method: 'GET' });
}

export async function createReportConfig(body: {
  name: string;
  report_url: string;
  template_id: string;
  description?: string;
  export_type?: 'preview' | 'pdf';
}) {
  return request<{ success: boolean; errorMessage?: string }>('/api/report-configs', {
    method: 'POST',
    data: body,
  });
}

export async function updateReportConfig(
  id: number,
  body: {
    name?: string;
    report_url?: string;
    template_id?: string;
    description?: string;
    export_type?: 'preview' | 'pdf';
  },
) {
  return request<{ success: boolean; errorMessage?: string }>(`/api/report-configs/${id}`, {
    method: 'PUT',
    data: body,
  });
}

export async function deleteReportConfig(id: number) {
  return request<{ success: boolean; errorMessage?: string }>(`/api/report-configs/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultReportConfig(id: number) {
  return request<{ success: boolean; errorMessage?: string }>(
    `/api/report-configs/${id}/set-default`,
    { method: 'PUT' },
  );
}
