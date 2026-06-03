/**
 * 拖动中：只改 colgroup col 的宽度。
 * table-layout:fixed 下 col 宽度决定整列（含 thead/tbody），无需逐 cell 操作。
 */
export function syncColumnWidthAtTh(th: HTMLTableCellElement, widthPx: number) {
  const columnIndex = th.cellIndex;
  if (columnIndex < 0) return;

  const anchorTable = th.closest('table');
  if (!anchorTable) return;

  const anchorColCount = anchorTable.querySelectorAll('colgroup col').length;
  const container = anchorTable.closest('.ant-table-container');
  const tables = container
    ? Array.from(container.querySelectorAll('table'))
    : [anchorTable];

  const w = `${widthPx}px`;

  for (const table of tables) {
    if (table.querySelectorAll('colgroup col').length !== anchorColCount) continue;
    const col = table.querySelectorAll('colgroup col')[columnIndex] as HTMLElement | undefined;
    if (col) col.style.width = w;
  }
}
