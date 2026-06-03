import type { ReportConfigItem } from '@/services/reportConfig';
import { getToken } from '@/utils/token';

/** 积木报表 SQL 参数名，与模板中 ${order_no} 一致 */
export const JIMU_ORDER_PARAM = 'order_no';

/**
 * 拼接积木报表预览地址
 */
export function buildJimuReportUrl(
  config: Pick<ReportConfigItem, 'report_url' | 'template_id' | 'export_type'>,
  orderNo: string,
  token?: string | null,
): string {
  const base = config.report_url.replace(/\/+$/, '');

  if (config.export_type === 'pdf') {
    const exportParams = [
      {
        reportId: config.template_id,
        exportType: 'pdf',
        queryParam: { order_no: orderNo },
      },
    ];
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    params.set('exportParams', JSON.stringify(exportParams));
    return `${base}/jmreport/exportReport?${params.toString()}`;
  }

  // 预览模式
  const params = new URLSearchParams();
  params.set(JIMU_ORDER_PARAM, orderNo);
  if (token) params.set('token', token);
  return `${base}/jmreport/view/${config.template_id}?${params.toString()}`;
}

/** 预览模式：直接打开新标签 */
export function openJimuReportUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * PDF 模式：经后端代理拉取 PDF，避免浏览器直连积木跨域/鉴权问题
 */
export async function openJimuPdfViaProxy(orderId: number): Promise<void> {
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) throw new Error('弹窗被浏览器拦截，请允许本站弹窗后重试');
  try {
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}/print-pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let msg = `请求失败: ${res.status}`;
      try {
        const data = await res.json();
        if (data?.errorMessage) msg = data.errorMessage;
      } catch {
        /* 非 JSON 响应 */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(pdfBlob);
    newTab.location.href = objectUrl;
  } catch (err) {
    newTab.close();
    throw err;
  }
}

/**
 * PDF 模式（直连积木，仅备用）：fetch 为 blob 后在浏览器新标签页中直接展示。
 */
export async function openJimuPdfInNewTab(url: string): Promise<void> {
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) throw new Error('弹窗被浏览器拦截，请允许本站弹窗后重试');
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`请求失败: ${res.status}`);
    const blob = await res.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(pdfBlob);
    newTab.location.href = objectUrl;
  } catch (err) {
    newTab.close();
    throw err;
  }
}
