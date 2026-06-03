import { PrinterOutlined } from '@ant-design/icons';
import AppPageContainer from '@/components/AppPageContainer';
import { history, useParams } from '@umijs/max';
import { App, Button, Result, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getOrderDetail } from '@/services/orders';
import { openOrderReport } from '@/utils/openOrderReport';

const { Paragraph, Text } = Typography;

/** 展示/复制用：脱敏 URL 中的 token 参数 */
function sanitizeReportUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', '***');
    }
    const isRelative = !/^https?:\/\//i.test(url);
    return isRelative
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();
  } catch {
    return url.replace(/([?&]token=)[^&]+/i, '$1***');
  }
}

const OrdersPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const invalidId = !orderId || Number.isNaN(orderId);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [orderNo, setOrderNo] = useState('');
  const [lastUrl, setLastUrl] = useState('');

  const doOpen = useCallback(async (id: number, no: string) => {
    const result = await openOrderReport(id, no);
    if (result.ok) {
      setLastUrl(result.url);
    } else {
      message.error(result.message);
    }
    return result;
  }, [message]);

  useEffect(() => {
    if (invalidId) {
      message.error('订单 ID 无效');
      history.replace('/orders');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getOrderDetail(orderId);
        if (cancelled) return;
        if (!res.success || !res.data?.order_no) {
          message.error(res.errorMessage || '订单不存在');
          return;
        }
        setOrderNo(res.data.order_no);
        await doOpen(orderId, res.data.order_no);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invalidId, orderId, doOpen, message]);

  if (invalidId) {
    return null;
  }

  if (loading) {
    return <Spin style={{ display: 'block', marginTop: 200 }} size="large" />;
  }

  return (
    <AppPageContainer title="打印出库单" onBack={() => history.push(`/orders/${orderId}/detail`)}>
      <Result
        status="info"
        title="已在新标签页打开积木报表"
        subTitle={orderNo ? `订单号：${orderNo}` : undefined}
        extra={[
          <Button
            key="reopen"
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!orderNo}
            onClick={() => doOpen(orderId, orderNo)}
          >
            重新打开
          </Button>,
          <Button key="back" onClick={() => history.push(`/orders/${orderId}/detail`)}>
            返回详情
          </Button>,
        ]}
      >
        {lastUrl ? (
          <Paragraph type="secondary" style={{ maxWidth: 640, margin: '0 auto' }}>
            若未弹出窗口，请检查浏览器拦截。链接：
            <br />
            <Text
              copyable={{ text: sanitizeReportUrl(lastUrl) }}
              style={{ fontSize: 12, wordBreak: 'break-all' }}
            >
              {sanitizeReportUrl(lastUrl)}
            </Text>
          </Paragraph>
        ) : null}
      </Result>
    </AppPageContainer>
  );
};

export default OrdersPrint;
