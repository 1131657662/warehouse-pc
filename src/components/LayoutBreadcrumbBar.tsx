import { HomeOutlined } from '@ant-design/icons';
import { Breadcrumb } from 'antd';
import { Link, matchRoutes, useAppData, useLocation } from '@umijs/max';
import { useMemo } from 'react';
import { patchBreadcrumbItems } from '@/utils/layoutBreadcrumb';

type CrumbItem = {
  title: React.ReactNode;
  path?: string;
};

function buildBreadcrumbItems(
  pathname: string,
  search: string,
  routes: ReturnType<typeof useAppData>['clientRoutes'],
): CrumbItem[] {
  const matched = matchRoutes(routes, pathname) || [];
  const items: CrumbItem[] = matched
    .map((m) => m.route)
    .filter((route) => route?.name && !route.redirect)
    .map((route) => ({
      title: route!.name as string,
      path: route!.path as string,
    }));

  if (!items.length) return items;

  return patchBreadcrumbItems(
    items as { title?: React.ReactNode; path?: string }[],
    pathname,
    search,
  ) as CrumbItem[];
}

/**
 * 顶栏面包屑导航（渲染在 ant-pro-global-header 中间 flex 区域）
 */
const LayoutBreadcrumbBar: React.FC = () => {
  const { pathname, search } = useLocation();
  const { clientRoutes } = useAppData();

  const items = useMemo(
    () => buildBreadcrumbItems(pathname, search, clientRoutes),
    [pathname, search, clientRoutes],
  );

  if (!items.length) {
    return null;
  }

  return (
    <div className="wh-layout-breadcrumb-bar">
      <div className="wh-layout-breadcrumb-bar__inner">
        <div className="wh-layout-breadcrumb-bar__crumb">
          <Breadcrumb
            items={[
              {
                title: (
                  <Link to="/dashboard">
                    <HomeOutlined />
                  </Link>
                ),
              },
              ...items.map((item, index) => {
                const isLast = index === items.length - 1;
                if (isLast) {
                  return { title: item.title };
                }
                let href = item.path;
                if (href?.includes(':')) {
                  if (href.startsWith('/orders')) href = '/orders';
                  else if (href.startsWith('/inventory')) href = '/inventory/list';
                }
                if (href) {
                  return { title: <Link to={href}>{item.title}</Link> };
                }
                return { title: item.title };
              }),
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default LayoutBreadcrumbBar;
