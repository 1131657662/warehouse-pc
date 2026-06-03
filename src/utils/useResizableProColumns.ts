import type { ProColumns } from '@ant-design/pro-components';
import ResizableHeaderCell from '@/components/Table/ResizableHeaderCell';
import { getProTableProps, PRO_TABLE_LAYOUT_REV } from '@/utils/proTableConfig';
import { useCallback, useMemo, useRef, useState } from 'react';

const DEFAULT_COL_WIDTH = 100;

export function getColumnWidthStorageKey(persistenceKey: string) {
  return `wh-col-widths:${persistenceKey}@${PRO_TABLE_LAYOUT_REV}`;
}

function clampWidth(value: number) {
  return Math.round(Math.max(40, Math.min(2000, value)));
}

/** 读取 ProTable columnsState 里可能存在的列宽 */
function loadWidthsFromColumnsState(persistenceKey: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(persistenceKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { width?: number }>;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.width === 'number' && Number.isFinite(v.width)) {
        result[k] = clampWidth(v.width);
      }
    }
    return result;
  } catch {
    return {};
  }
}

function loadWidths(storageKey: string, persistenceKey: string): Record<string, number> {
  try {
    const fromState = loadWidthsFromColumnsState(persistenceKey);
    const raw = localStorage.getItem(storageKey);
    const fromCustom: Record<string, number> = raw
      ? (JSON.parse(raw) as Record<string, number>)
      : {};
    const merged = { ...fromState, ...fromCustom };
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        cleaned[k] = clampWidth(v);
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function getProColumnKey(col: ProColumns): string {
  if (col.key != null) return String(col.key);
  if (col.dataIndex != null) {
    return Array.isArray(col.dataIndex)
      ? col.dataIndex.join('.')
      : String(col.dataIndex);
  }
  if (col.valueType === 'option') return '__option__';
  return String(col.title ?? '');
}

function readDefaultWidth(col: ProColumns): number {
  if (typeof col.width === 'number') return col.width;
  if (col.valueType === 'option') return 128;
  if (col.valueType === 'date' || col.valueType === 'dateTime') return 108;
  if (col.valueType === 'dateRange') return 240;
  if (col.align === 'center') return 72;
  return DEFAULT_COL_WIDTH;
}

function isTableColumn(col: ProColumns) {
  return col.hideInTable !== true && col.valueType !== 'index';
}

export type UseResizableProColumnsOptions = {
  /** rowSelection 等左侧占用的列数，仅用于计算 scroll.x */
  leadingColumnCount?: number;
  minTableWidth?: number;
};

/** 为 ProTable 列启用表头拖拽改宽，宽度写入 localStorage */
export function useResizableProColumns<T>(
  persistenceKey: string,
  sourceColumns: ProColumns<T>[],
  options?: UseResizableProColumnsOptions,
) {
  const storageKey = getColumnWidthStorageKey(persistenceKey);
  const columnsStateKey = `${persistenceKey}@${PRO_TABLE_LAYOUT_REV}`;
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    loadWidths(storageKey, columnsStateKey),
  );

  const resizeHandlersRef = useRef<Record<string, (w: number) => void>>({});
  const persistWidth = useCallback(
    (colKey: string, nextWidth: number) => {
      const w = Math.round(Math.max(40, Math.min(2000, nextWidth)));
      setWidths((prev) => {
        if (prev[colKey] === w) return prev;
        const merged = { ...prev, [colKey]: w };
        localStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
      });
    },
    [storageKey],
  );

  const columns = useMemo(() => {
    const cols = sourceColumns.map((col) => {
      if (!isTableColumn(col)) return col;

      const colKey = getProColumnKey(col);
      const width = widths[colKey] ?? readDefaultWidth(col);

      resizeHandlersRef.current[colKey] = (w: number) => persistWidth(colKey, w);

      return {
        ...col,
        width,
        ellipsis: col.ellipsis ?? true,
        onHeaderCell: () => ({
          width,
          onResize: resizeHandlersRef.current[colKey],
        }),
      } as ProColumns<T>;
    });

    return cols;
  }, [sourceColumns, widths, persistWidth]);

  const components = useMemo(
    () => ({
      header: {
        cell: ResizableHeaderCell,
      },
    }),
    [],
  );

  return { columns, components };
}

/** ProTable 统一配置 + 可拖拽列宽 + 本地持久化 */
export function useProTableResize<T>(
  persistenceKey: string,
  sourceColumns: ProColumns<T>[],
  options?: UseResizableProColumnsOptions & {
    tableExtra?: Record<string, unknown>;
  },
) {
  const { tableExtra, ...resizeOpts } = options ?? {};
  const { columns, components } = useResizableProColumns(
    persistenceKey,
    sourceColumns,
    resizeOpts,
  );

  const extraClass =
    typeof tableExtra?.className === 'string' ? tableExtra.className : '';
  return {
    columns,
    components,
    tableProps: getProTableProps(persistenceKey, {
      tableLayout: 'fixed',
      ...tableExtra,
      className: ['wh-pro-table', extraClass].filter(Boolean).join(' '),
    }),
  };
}
