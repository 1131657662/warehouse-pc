import type { ReactNode } from 'react';

/** 一级菜单页：仅显示面包屑，不显示返回按钮 */
export const LAYOUT_PRIMARY_PATHS = new Set([
  '/dashboard',
  '/orders',
  '/customers',
  '/reports',
  '/users',
  '/inventory/list',
]);

export function resolveLayoutBackTarget(pathname: string): string | null {
  if (LAYOUT_PRIMARY_PATHS.has(pathname)) return null;
  if (pathname === '/orders/create' || pathname === '/orders/temp-create') {
    return '/orders';
  }
  const outbound = pathname.match(/^\/orders\/(\d+)\/outbound$/);
  if (outbound) return `/orders/${outbound[1]}/detail`;
  const convertTemp = pathname.match(/^\/orders\/(\d+)\/convert-temp$/);
  if (convertTemp) return `/orders/${convertTemp[1]}/detail`;
  const print = pathname.match(/^\/orders\/(\d+)\/print$/);
  if (print) return `/orders/${print[1]}/detail`;
  const detail = pathname.match(/^\/orders\/(\d+)\/detail$/);
  if (detail) return '/orders';
  if (pathname.startsWith('/inventory/') && pathname !== '/inventory/list') {
    return '/inventory/list';
  }
  return null;
}

type BreadcrumbItem = {
  title?: ReactNode;
  path?: string;
  linkPath?: string;
};

/** 根据路由修正面包屑末级文案（如编辑订单） */
export function patchBreadcrumbItems(
  items: BreadcrumbItem[] | undefined,
  pathname: string,
  search: string,
): BreadcrumbItem[] {
  if (!items?.length) return items || [];
  const next = items.map((item) => ({ ...item }));
  if (pathname === '/orders/create' && search.includes('editId=')) {
    const last = next[next.length - 1];
    if (last) last.title = '编辑订单';
  }
  if (pathname === '/orders/create' && search.includes('copyFromId=')) {
    const last = next[next.length - 1];
    if (last) last.title = '复制建单';
  }
  return next;
}
