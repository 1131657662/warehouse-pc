import { getDefaultReportConfig } from '@/services/reportConfig';
import { getPrintToken } from '@/services/orders';
import {
  buildJimuReportUrl,
  openJimuPdfViaProxy,
  openJimuReportUrl,
} from '@/utils/jimuReport';

export type OpenOrderReportResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** 读取默认配置并打开积木报表（新标签页）。PDF 经后端代理，预览仍用短期限域 Token */
export async function openOrderReport(orderId: number, orderNo: string): Promise<OpenOrderReportResult> {
  if (!orderNo?.trim()) {
    return { ok: false, message: '订单号为空' };
  }
  const configRes = await getDefaultReportConfig();
  if (!configRes.success || !configRes.data) {
    return { ok: false, message: configRes.errorMessage || '未配置默认报表，请联系管理员' };
  }
  try {
    if (configRes.data.export_type === 'pdf') {
      await openJimuPdfViaProxy(orderId);
      return { ok: true, url: `/api/orders/${orderId}/print-pdf` };
    }
    const tokenRes = await getPrintToken(orderId);
    const token = tokenRes.success && tokenRes.data?.token ? tokenRes.data.token : undefined;
    const url = buildJimuReportUrl(configRes.data, orderNo.trim(), token);
    openJimuReportUrl(url);
    return { ok: true, url };
  } catch (err: any) {
    return { ok: false, message: err?.message || '打开报表失败' };
  }
}
