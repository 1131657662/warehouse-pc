import type { Key, MouseEvent } from 'react';

export { useProTableResize } from './useResizableProColumns';

/** 调整默认行高/列宽时递增，用于脱离旧的 localStorage 列宽缓存 */
export const PRO_TABLE_LAYOUT_REV = 'r2';

const PAGE_SIZE_PREFIX = 'wh-pagesize:';

function loadPageSize(persistenceKey: string): number {
  try {
    const v = localStorage.getItem(PAGE_SIZE_PREFIX + persistenceKey);
    const n = v ? parseInt(v, 10) : 0;
    return n > 0 ? n : 10;
  } catch {
    return 10;
  }
}

/** 列配置持久化到 localStorage（列顺序、显隐、宽度） */
export function getColumnsState(persistenceKey: string) {
  return {
    persistenceKey: `${persistenceKey}@${PRO_TABLE_LAYOUT_REV}`,
    persistenceType: 'localStorage' as const,
  };
}

/** 统一分页：条数、跳转、总数文案。persistenceKey 用于本地记忆每页条数 */
export function getDefaultProTablePagination(
  extra?: Record<string, unknown>,
  persistenceKey?: string,
) {
  const defaultPageSize = persistenceKey ? loadPageSize(persistenceKey) : 10;
  return {
    defaultPageSize,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
    hideOnSinglePage: false,
    onShowSizeChange: persistenceKey
      ? (_: number, size: number) => {
          try { localStorage.setItem(PAGE_SIZE_PREFIX + persistenceKey, String(size)); } catch { /* */ }
        }
      : undefined,
    ...extra,
  };
}

/** 统一查询区：标签宽度、栅格、查询/重置文案 */
export function getDefaultProTableSearch(extra?: Record<string, unknown>) {
  return {
    labelWidth: 80,
    layout: 'horizontal',
    defaultCollapsed: false,
    span: { xs: 24, sm: 12, md: 8, lg: 8, xl: 8, xxl: 8 },
    searchGutter: [16, 12],
    searchText: '查询',
    resetText: '重置',
    collapseRender: (collapsed: boolean) => (collapsed ? '展开筛选' : '收起筛选'),
    submitterColSpanProps: { span: 8 },
    ...extra,
  };
}

/** ProTable 统一：边框、工具栏列设置（可拖拽排序）、本地持久化 */
export function getProTableProps(
  persistenceKey: string,
  extra?: Record<string, unknown>,
) {
  const {
    search: searchOverride,
    pagination: paginationOverride,
    ...restExtra
  } = extra ?? {};

  return {
    bordered: true,
    cardBordered: true,
    className: 'wh-pro-table',
    size: 'middle',
    scroll: { x: 'max-content' as const },
    options: {
      reload: true,
      density: true,
      setting: {
        draggable: true,
        checkable: true,
      },
    },
    columnsState: getColumnsState(persistenceKey),
    search:
      searchOverride === false
        ? false
        : getDefaultProTableSearch(
            searchOverride && typeof searchOverride === 'object'
              ? searchOverride
              : undefined,
          ),
    pagination:
      paginationOverride === false
        ? false
        : getDefaultProTablePagination(
            paginationOverride && typeof paginationOverride === 'object'
              ? paginationOverride
              : undefined,
            persistenceKey,
          ),
    ...restExtra,
  };
}

/** 点击行选中时，忽略操作列内的链接/按钮 */
export function shouldIgnoreProTableRowClick(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  return !!target.closest(
    'a, button, .ant-btn, .ant-dropdown, input, textarea, select, .ant-select, .ant-checkbox, .ant-radio, .ant-radio-wrapper, .ant-switch, [role="button"], .wh-table-resize-handle',
  );
}

/** 单选：点击整行选中；再次点击同一行取消选中 */
export function createRowClickHandlers<T>(
  record: T,
  selectedKey: Key | undefined,
  getKey: (row: T) => Key,
  onSelect: (row: T | null) => void,
) {
  return {
    onClick: (e: MouseEvent) => {
      if (shouldIgnoreProTableRowClick(e.target)) return;
      if (selectedKey !== undefined && getKey(record) === selectedKey) {
        onSelect(null);
      } else {
        onSelect(record);
      }
    },
    className: [
      'wh-row-selectable',
      selectedKey !== undefined && getKey(record) === selectedKey
        ? 'wh-row-selected'
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
