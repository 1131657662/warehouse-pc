import type { PageContainerProps } from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';

/**
 * 全站统一页面容器：页头显示标题 + 返回按钮，面包屑由顶栏展示。
 * 子页面通过 onBack 控制是否显示返回箭头。
 */
const AppPageContainer: React.FC<PageContainerProps> = (props) => (
  <PageContainer breadcrumbRender={false} {...props} />
);

export default AppPageContainer;
