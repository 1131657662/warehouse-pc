import { ArrowLeftOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button } from 'antd';

type Props = {
  /** 路由路径；与 onClick 二选一 */
  to?: string;
  onClick?: () => void;
  label?: string;
};

/** 全站统一的页头返回按钮（不用 PageContainer.onBack 左侧箭头） */
const PageBackButton: React.FC<Props> = ({ to, onClick, label = '返回' }) => (
  <Button
    icon={<ArrowLeftOutlined />}
    onClick={() => {
      if (onClick) onClick();
      else if (to) history.push(to);
      else history.back();
    }}
  >
    {label}
  </Button>
);

export default PageBackButton;
