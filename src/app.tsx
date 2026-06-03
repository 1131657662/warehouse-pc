import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import React from 'react';
import { ConfigProvider } from 'antd';
import {
  AvatarDropdown,
  AvatarName,
} from '@/components';
import LayoutBreadcrumbBar from '@/components/LayoutBreadcrumbBar';
import { patchBreadcrumbItems } from '@/utils/layoutBreadcrumb';
import { getProfile } from '@/services/auth';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { getToken } from './utils/token';
import '@ant-design/v5-patch-for-react-19';

const isDev = process.env.NODE_ENV === 'development' || process.env.CI;
const loginPath = '/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const res = await getProfile();
      return res.data;
    } catch (_error) {
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果不是登录页面，且有 Token，则获取用户信息
  const { location } = history;
  if (location.pathname !== loginPath && getToken()) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    footerRender: () => null,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [],
    links: [],
    menuHeaderRender: undefined,
    /** 面包屑渲染在 mix 顶栏中间区域 */
    headerContentRender: () => {
      const { pathname } = history.location;
      if (pathname === loginPath) return null;
      return <LayoutBreadcrumbBar />;
    },
    /** 页面标题由各页面 AppPageContainer 自行控制 */
    pageTitleRender: (_props, defaultPageTitle, _info) => defaultPageTitle ?? '',
    breadcrumbRender: (routers = []) => {
      const { pathname, search } = history.location;
      return patchBreadcrumbItems(routers, pathname, search);
    },
    childrenRender: (children) => {
      return (
        <ConfigProvider
          getPopupContainer={() => document.body}
        >
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </ConfigProvider>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  // 开发环境走 Umi 代理到本地后端，生产环境同域部署
  ...errorConfig,
};
