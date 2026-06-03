import { ReloadOutlined } from '@ant-design/icons';
import AppPageContainer from '@/components/AppPageContainer';
import { history, useAccess, useParams } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useOrderWebSocket } from '@/hooks/useOrderWebSocket';
import OrderKpiBar from '@/components/Order/OrderKpiBar';
import OutboundScanTable from '@/components/Order/OutboundScanTable';
import RollPickerDrawer from '@/components/Order/RollPickerDrawer';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { fetchAllScanLogs } from '@/utils/scanLogs';
import { getOrderDetail, submitOrder } from '@/services/orders';
import { scanConfirm, scanMatch, scanRemove, scanBulkRemove } from '@/services/scan';
import {
  getSubmitConfirmContent,
  getSubmitConfirmTitle,
} from '@/utils/orderSubmitConfirm';

const { Text } = Typography;

const OrdersOutbound: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const access = useAccess();
  const { message, modal } = App.useApp();
  const orderId = Number(id);
  const invalidId = !orderId || Number.isNaN(orderId);

  const [order, setOrder] = useState<API.OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<API.ScanLogItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [matching, setMatching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fuzzyOpen, setFuzzyOpen] = useState(false);
  const [fuzzyCandidates, setFuzzyCandidates] = useState<any[]>([]);
  const [fuzzySelected, setFuzzySelected] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const silentRefresh = useCallback(async () => {
    const [detailRes, allLogs] = await Promise.all([
      getOrderDetail(orderId),
      fetchAllScanLogs(orderId),
    ]);
    if (detailRes.success) setOrder(detailRes.data);
    setLogs(allLogs);
  }, [orderId]);

  useEffect(() => {
    if (invalidId) {
      message.error('无效的订单 ID');
      history.replace('/orders');
    }
  }, [invalidId]);

  useEffect(() => {
    if (order?.order_no) {
      document.title = `${order.order_no} - 出库作业 - 茂智物流`;
    }
  }, [order?.order_no]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, allLogs] = await Promise.all([
          getOrderDetail(orderId),
          fetchAllScanLogs(orderId),
        ]);
        if (cancelled) return;
        if (detailRes.success) setOrder(detailRes.data);
        setLogs(allLogs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const wsEnabled =
    order?.status === 'pending' || order?.status === 'scanning';

  useOrderWebSocket(orderId, silentRefresh, wsEnabled);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await silentRefresh();
      message.success('已刷新');
    } catch {
      message.error('刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  if (!access.canPcOutbound) {
    return (
      <AppPageContainer>
        <Card>您没有 PC 出库权限，请联系管理员。</Card>
      </AppPageContainer>
    );
  }

  const handleMatch = async () => {
    const code = barcode.trim();
    if (!code) {
      message.warning('请输入或搜索卷号');
      return;
    }
    setMatching(true);
    try {
      const res = await scanMatch({
        orderId,
        barcode: code,
        customerId: order?.customer_id,
      });
      if (!res.success) {
        message.error(res.errorMessage || '未找到匹配库存');
        return;
      }
      const data = res.data;
      if (Array.isArray(data)) {
        if (data.length === 0) {
          message.error('未找到匹配库存');
          return;
        }
        setFuzzyCandidates(data);
        setFuzzySelected(data[0]?.matched_roll_number || '');
        setFuzzyOpen(true);
        return;
      }
      await confirmOutboundWithPlanCheck(
        data.matched_roll_number || code,
        data.inventoryId,
        data.in_plan,
        formatModelLabel(data.product_name, data.weight, data.specification),
      );
    } finally {
      setMatching(false);
    }
  };

  const confirmOutboundWithPlanCheck = async (
    code: string,
    inventoryId?: number,
    inPlan?: boolean,
    modelLabel?: string,
  ) => {
    if (order && !order.temp && inPlan === false) {
      return new Promise<void>((resolve) => {
        modal.confirm({
          title: '计划外型号确认',
          content: (
            <div>
              <p>
                该卷型号 <strong>{modelLabel || '未知'}</strong> 不在本单计划内。
              </p>
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                确认后将作为计划外出库计入，履约看板单独显示。是否继续？
              </p>
            </div>
          ),
          okText: '确认出库',
          cancelText: '取消',
          onOk: async () => {
            await confirmOutbound(code, inventoryId);
            resolve();
          },
          onCancel: () => resolve(),
        });
      });
    }
    await confirmOutbound(code, inventoryId);
  };

  const confirmOutbound = async (code: string, inventoryId?: number) => {
    const res = await scanConfirm({
      orderId,
      barcode: code,
      inventoryId,
    });
    if (res.success) {
      message.success('出库成功');
      setBarcode('');
      setFuzzyOpen(false);
      silentRefresh();
    } else {
      message.error(res.errorMessage || '出库失败');
    }
  };

  const handleRevoke = async (roll: string) => {
    const res = await scanRemove({ orderId, barcode: roll });
    if (res.success) {
      message.success('已撤销');
      silentRefresh();
    } else {
      message.error(res.errorMessage || '撤销失败');
    }
  };

  const handleSubmit = async () => {
    const res = await submitOrder(orderId);
    if (res.success) {
      message.success('已提交完成');
      history.push(`/orders/${orderId}/detail`);
    } else {
      message.error(res.errorMessage || '提交失败');
    }
  };

  const handleBulkRevoke = async (scanLogIds: number[]) => {
    const res = await scanBulkRemove({ orderId, scanLogIds });
    if (res.success) {
      message.success(res.errorMessage || '批量撤销成功');
      silentRefresh();
    } else {
      message.error(res.errorMessage || '批量撤销失败');
    }
  };

  const handleRevokeUnplanned = async () => {
    const res = await scanBulkRemove({ orderId, onlyUnplanned: true });
    if (res.success) {
      message.success(res.errorMessage || '已撤销全部计划外');
      silentRefresh();
    } else {
      message.error(res.errorMessage || '撤销失败');
    }
  };

  const canOperate = order && ['pending', 'scanning'].includes(order.status);

  return (
    <AppPageContainer
      title="出库作业"
      onBack={() => history.push(`/orders/${orderId}/detail`)}
      loading={loading}
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleManualRefresh}
          >
            刷新
          </Button>
          {canOperate ? (
            <Popconfirm
              title={getSubmitConfirmTitle(order)}
              description={getSubmitConfirmContent(order)}
              onConfirm={handleSubmit}
            >
              <Button type="primary">提交完成</Button>
            </Popconfirm>
          ) : null}
        </Space>
      }
    >
      <Card style={{ marginBottom: 16 }}>
        {order ? (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {order.order_no} · {order.customer_name}
            </Text>
            <OrderKpiBar order={order} />
          </>
        ) : null}
      </Card>

      {canOperate ? (
        <Card title="搜索 / 录入卷号" style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
            <Input
              size="large"
              placeholder="输入卷号、品名或条码片段"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onPressEnter={handleMatch}
              style={{ fontSize: 15 }}
            />
            <Button
              type="primary"
              size="large"
              loading={matching}
              onClick={handleMatch}
              style={{ fontWeight: 500 }}
            >
              匹配出库
            </Button>
          </Space.Compact>
          <div style={{ marginTop: 12 }}>
            <Button type="link" onClick={() => setPickerOpen(true)}>
              打开卷号列表挑选
            </Button>
          </div>
        </Card>
      ) : null}

      <OutboundScanTable
        logs={logs}
        canRevoke={!!canOperate}
        onRevoke={handleRevoke}
        onBulkRevoke={canOperate ? handleBulkRevoke : undefined}
        onRevokeUnplanned={canOperate ? handleRevokeUnplanned : undefined}
      />

      <RollPickerDrawer
        open={pickerOpen}
        orderId={orderId}
        onClose={() => setPickerOpen(false)}
        onSuccess={silentRefresh}
      />

      <Modal
        title={`模糊匹配 — 找到 ${fuzzyCandidates.length} 个候选`}
        open={fuzzyOpen}
        onCancel={() => setFuzzyOpen(false)}
        onOk={() => {
          const selected = fuzzyCandidates.find(
            (c) => c.matched_roll_number === fuzzySelected,
          );
          if (selected) {
            void confirmOutboundWithPlanCheck(
              selected.matched_roll_number,
              selected.inventoryId,
              selected.in_plan,
              formatModelLabel(
                selected.product_name,
                selected.weight,
                selected.specification,
              ),
            );
          }
        }}
        okText="确认出库"
        okButtonProps={{ disabled: !fuzzySelected }}
        width={560}
      >
        <p style={{ marginBottom: 12 }}>
          输入条码：<Text strong>{barcode}</Text>
          {fuzzyCandidates.length > 1
            ? ' — 请从以下候选中选择一个'
            : ' — 仅一个匹配，确认即可'}
        </p>
        {fuzzyCandidates.length > 1 ? (
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {fuzzyCandidates.map((c, idx) => {
              const key = c.matched_roll_number || `candidate_${idx}`;
              return (
                <div
                  key={key}
                  onClick={() => setFuzzySelected(key)}
                  style={{
                    padding: '10px 12px',
                    marginBottom: 8,
                    border: `1px solid ${fuzzySelected === key ? '#0070F3' : '#eaeaea'}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: fuzzySelected === key ? '#e6f4ff' : '#fff',
                  }}
                >
                  <div>
                    <Text strong>卷号：{c.matched_roll_number}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      型号：
                      {formatModelLabel(c.product_name, c.weight, c.specification)}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '10px 12px', background: '#f6ffed', borderRadius: 6 }}>
            <p>库存卷号：{fuzzyCandidates[0]?.matched_roll_number}</p>
            <p>
              型号：
              {formatModelLabel(
                fuzzyCandidates[0]?.product_name,
                fuzzyCandidates[0]?.weight,
                fuzzyCandidates[0]?.specification,
              )}
            </p>
          </div>
        )}
      </Modal>
    </AppPageContainer>
  );
};

export default OrdersOutbound;
