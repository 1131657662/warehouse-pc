type SubmitOrderLike = {
  temp?: boolean;
  scanned_count?: number;
  summary?: { planned_qty?: number }[];
};

export function getPlannedQty(order: SubmitOrderLike): number {
  return (order.summary || []).reduce((s, i) => s + Number(i.planned_qty || 0), 0);
}

/** 非临时单且有计划件数，但已扫件数未达计划 */
export function isSubmitUnderPlanned(order: SubmitOrderLike | null | undefined): boolean {
  if (!order || order.temp) return false;
  const planned = getPlannedQty(order);
  if (planned <= 0) return false;
  return (order.scanned_count || 0) < planned;
}

export function getSubmitConfirmTitle(order: SubmitOrderLike | null | undefined): string {
  return isSubmitUnderPlanned(order) ? '出库尚未扫满，确认提交？' : '确认提交完成？';
}

export function getSubmitConfirmContent(order: SubmitOrderLike | null | undefined): string {
  if (!order) return '提交后订单将标记为已完成，且不可再扫码出库。';
  if (order.temp) {
    return `当前已扫 ${order.scanned_count || 0} 件。提交后不可再扫码出库，请确认现场货物已出完。`;
  }
  const planned = getPlannedQty(order);
  const scanned = order.scanned_count || 0;
  if (planned > 0 && scanned < planned) {
    return `当前已扫 ${scanned} 件，计划 ${planned} 件（${Math.round((scanned / planned) * 100)}%）。若现场已全部出完可继续提交；否则请返回补扫。`;
  }
  if (planned > 0) {
    return `已扫 ${scanned}/${planned} 件，达到计划。提交后不可再扫码出库。`;
  }
  return `当前已扫 ${scanned} 件。提交后不可再扫码出库，请确认无误。`;
}
