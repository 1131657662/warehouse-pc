import * as XLSX from 'xlsx';
import { formatTonFromPieceWeightKg } from '@/utils/modelDisplay';

const STATUS_TEXT: Record<string, string> = {
  pending: '待处理',
  scanning: '出库中',
  completed: '已完成',
  cancelled: '已取消',
};

export type OrderExportRow = {
  订单号: string;
  订单日期: string;
  客户名称: string;
  车号: string;
  箱号: string;
  订单状态: string;
  订单备注: string;
  序号: number;
  品名: string;
  '克重(kg)': string | number;
  规格: string;
  卷号: string;
  编号: string;
  '单件重量(吨)': string;
  扫码人: string;
  扫码时间: string;
  匹配方式: string;
  原始条码: string;
};

/** 将有效出库扫码记录导出为 Excel（每行一件，订单信息重复） */
export function exportOrderScanExcel(
  order: API.OrderDetail,
  logs: API.ScanLogItem[],
) {
  const validLogs = logs
    .filter((l) => l.action === 'add' && !l.revoked)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const orderStatus = order.temp
    ? '临时出库'
    : STATUS_TEXT[order.status] || order.status;

  const rows: OrderExportRow[] = validLogs.map((log, idx) => {
    const weightTon = formatTonFromPieceWeightKg(log.piece_weight);
    return {
      订单号: order.order_no,
      订单日期: order.order_date,
      客户名称: order.customer_name,
      车号: order.vehicle_no || '',
      箱号: order.container_no || '',
      订单状态: orderStatus,
      订单备注: order.remark || '',
      序号: validLogs.length - idx,
      品名: log.product_name || '',
      '克重(kg)': log.weight ?? '',
      规格: log.specification || '',
      卷号: log.matched_roll_number || log.raw_barcode,
      编号: log.code || '',
      '单件重量(吨)': weightTon === '-' ? '' : weightTon,
      扫码人: log.scan_user_name || '',
      扫码时间: log.created_at || '',
      匹配方式: log.is_fuzzy ? '模糊匹配' : '精确匹配',
      原始条码: log.raw_barcode || '',
    };
  });

  if (rows.length === 0) {
    rows.push({
      订单号: order.order_no,
      订单日期: order.order_date,
      客户名称: order.customer_name,
      车号: order.vehicle_no || '',
      箱号: order.container_no || '',
      订单状态: orderStatus,
      订单备注: order.remark || '',
      序号: 0,
      品名: '',
      '克重(kg)': '',
      规格: '',
      卷号: '',
      编号: '',
      '单件重量(吨)': '',
      扫码人: '',
      扫码时间: '',
      匹配方式: '',
      原始条码: '（暂无出库记录）',
    });
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 6 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '出库明细');
  XLSX.writeFile(wb, `${order.order_no}_出库明细.xlsx`);
}
