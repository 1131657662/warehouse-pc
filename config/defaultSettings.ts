import type { ProLayoutProps } from '@ant-design/pro-components';

const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  colorPrimary: '#0070F3',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: '茂智物流',
  pwa: false,
  logo: '/logo.svg',
  iconfontUrl: '',
  token: {
    header: {
      colorBgHeader: '#fff',
      colorTextMenu: '#171717',
      heightLayoutHeader: 52,
    },
    sider: {
      colorMenuBackground: '#FAFAFA',
      colorTextMenu: '#666666',
      colorTextMenuSelected: '#171717',
      colorTextMenuItemHover: '#171717',
      colorBgMenuItemHover: '#fff',
      colorBgMenuItemSelected: '#fff',
      colorTextMenuActive: '#171717',
    },
    pageContainer: {
      colorBgPageContainer: '#FAFAFA',
      paddingBlockPageContainerContent: 24,
      paddingInlinePageContainerContent: 32,
    },
  },
};

export default Settings;
