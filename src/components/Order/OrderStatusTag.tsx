import { Tag } from 'antd';
import { ORDER_STATUS_STYLE } from './orderConstants';

type Props = {
  status: string;
  temp?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  scanning: '出库中',
  completed: '已完成',
  cancelled: '已取消',
};

const OrderStatusTag: React.FC<Props> = ({ status, temp }) => {
  const label = STATUS_LABEL[status] || status;
  const s = ORDER_STATUS_STYLE[status] || { bg: '#f5f5f5', text: '#666' };

  return (
    <>
      <Tag
        style={{
          background: s.bg,
          color: s.text,
          border: 'none',
          borderRadius: 999,
          fontSize: 12,
          padding: '0 10px',
          lineHeight: '22px',
        }}
      >
        {label}
      </Tag>
      {temp ? (
        <Tag
          style={{
            background: '#FFF1F0',
            color: '#E5484D',
            border: 'none',
            borderRadius: 999,
            fontSize: 12,
            padding: '0 10px',
            lineHeight: '22px',
          }}
        >
          临时单
        </Tag>
      ) : null}
    </>
  );
};

export default OrderStatusTag;
