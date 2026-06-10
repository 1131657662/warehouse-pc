import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadPersistedPageSize, persistPageSize } from './proTableConfig';

export type ClientTablePaginationOptions = {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** 变化时重置到第 1 页（如搜索关键词、重新解析文件） */
  resetDeps?: unknown[];
};

/**
 * Ant Design Table 客户端分页（受控 current/pageSize + localStorage 记忆条数）
 * 用于非 ProTable 的全量 dataSource 表格。
 */
export function useClientTablePagination(
  persistenceKey: string,
  options: ClientTablePaginationOptions = {},
): TablePaginationConfig {
  const {
    defaultPageSize = 10,
    pageSizeOptions = [10, 20, 50, 100, 200],
    resetDeps = [],
  } = options;

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(() =>
    loadPersistedPageSize(persistenceKey, defaultPageSize, pageSizeOptions),
  );

  useEffect(() => {
    setCurrent(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps 由调用方传入
  }, resetDeps);

  const onChange = useCallback(
    (page: number, size: number) => {
      setCurrent(page);
      setPageSize(size);
      persistPageSize(persistenceKey, size);
    },
    [persistenceKey],
  );

  return useMemo(
    () => ({
      current,
      pageSize,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions,
      showTotal: (total: number, range: [number, number]) =>
        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      hideOnSinglePage: false,
      onChange,
    }),
    [current, pageSize, pageSizeOptions, onChange],
  );
}
