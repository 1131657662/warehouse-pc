import {
  DownloadOutlined,
  DownOutlined,
  PrinterOutlined,
  ReloadOutlined,
  RollbackOutlined,
  ScanOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import { history, useAccess, useParams } from '@umijs/max';
import {
  App,
  Button,
  Collapse,
  Descriptions,
  Dropdown,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useOrderWebSocket } from '@/hooks/useOrderWebSocket';
import { openOrderReport } from '@/utils/openOrderReport';
import OrderFulfillmentBoard from '@/components/Order/OrderFulfillmentBoard';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import OutboundScanTable from '@/components/Order/OutboundScanTable';
import RollPickerDrawer from '@/components/Order/RollPickerDrawer';
import {
  cancelOrder,
  getOrderDetail,
  rollbackOrder,
  submitOrder,
} from '@/services/orders';
import { scanRemove, scanBulkRemove } from '@/services/scan';
import { downloadAuthenticatedFile, fetchAllScanLogs, buildInventoryExportQuery } from '@/utils/scanLogs';
import {
  getSubmitConfirmContent,
  getSubmitConfirmTitle,
} from '@/utils/orderSubmitConfirm';

const { Paragraph, Text } = Typography;

const OrdersDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const access = useAccess();
  const orderId = Number(id);
  const invalidId = !orderId || Number.isNaN(orderId);

  const [order, setOrder] = useState<API.OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<API.ScanLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** 后台刷新：不触发 PageContainer / 表格全屏 loading，避免闪屏 */
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
      document.title = `${order.order_no} - 订单详情 - 茂智物流`;
    }
  }, [order?.order_no]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLogsLoading(true);
      try {
        const [detailRes, allLogs] = await Promise.all([
          getOrderDetail(orderId),
          fetchAllScanLogs(orderId),
        ]);
        if (cancelled) return;
        if (detailRes.success) setOrder(detailRes.data);
        setLogs(allLogs);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLogsLoading(false);
        }
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

  const canOperate =
    access.canPcOutbound &&
    order &&
    (order.status === 'pending' || order.status === 'scanning');

  const canCancel =
    access.canPcOutbound &&
    order &&
    (order.status === 'pending' || order.status === 'scanning') &&
    (order.scanned_count || 0) === 0;

  const handleCancel = async () => {
    const res = await cancelOrder(orderId);
    if (res.success) {
      message.success('订单已取消');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '取消失败');
    }
  };

  const handleDownload = async () => {
    if (!order) return;
    setExporting(true);
    try {
      await downloadAuthenticatedFile(
        `/api/orders/${orderId}/export-scan`,
        `${order.order_no}_出库明细.xlsx`,
      );
      message.success('导出已下载');
    } catch (e: any) {
      message.error(e?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleRollback = async () => {
    const res = await rollbackOrder(orderId);
    if (res.success) {
      message.success('已回退到出库中');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '回退失败');
    }
  };

  const handleSubmit = async () => {
    const res = await submitOrder(orderId);
    if (res.success) {
      message.success('订单已提交完成');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '提交失败');
    }
  };

  const handleRevoke = async (barcode: string) => {
    const res = await scanRemove({ orderId, barcode });
    if (res.success) {
      message.success('已撤销');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '撤销失败');
    }
  };

  const handleBulkRevoke = async (scanLogIds: number[]) => {
    const res = await scanBulkRemove({ orderId, scanLogIds });
    if (res.success) {
      message.success(res.errorMessage || '批量撤销成功');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '批量撤销失败');
    }
  };

  const handleRevokeUnplanned = async () => {
    const res = await scanBulkRemove({ orderId, onlyUnplanned: true });
    if (res.success) {
      message.success(res.errorMessage || '已撤销全部计划外');
      await silentRefresh();
    } else {
      message.error(res.errorMessage || '撤销失败');
    }
  };

  const moreMenuItems: MenuProps['items'] = [
    canOperate
      ? {
          key: 'outbound',
          icon: <ScanOutlined />,
          label: '出库作业',
          onClick: () => history.push(`/orders/${orderId}/outbound`),
        }
      : null,
    canOperate
      ? {
          key: 'pick',
          label: '挑选卷号出库',
          onClick: () => setPickerOpen(true),
        }
      : null,
    canOperate
      ? {
          key: 'submit',
          label: '提交完成',
          onClick: () => {
            Modal.confirm({
              title: getSubmitConfirmTitle(order),
              content: getSubmitConfirmContent(order),
              okText: '确认提交',
              onOk: handleSubmit,
            });
          },
        }
      : null,
    order?.status === 'completed' && access.canPcOutbound
      ? {
          key: 'rollback',
          label: '回退到出库中',
          onClick: () => {
            Modal.confirm({
              title: '确认回退？',
              content: '订单将退回「出库中」，已扫记录保持有效，可继续增减后再次提交（不会恢复库存、不会作废扫码）',
              onOk: handleRollback,
            });
          },
        }
      : null,
    canCancel
      ? {
          key: 'cancel',
          icon: <StopOutlined />,
          label: '取消订单',
          danger: true,
          onClick: () => {
            modal.confirm({
              title: '确认取消该订单？',
              content: `订单号：${order?.order_no || ''}`,
              okText: '确认取消',
              okButtonProps: { danger: true },
              onOk: handleCancel,
            });
          },
        }
      : null,
  ].filter(Boolean) as MenuProps['items'];

  const auditColumns: ColumnsType<API.ScanLogItem> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => v || '—',
    },
    { title: '类型', width: 80, render: () => '出库' },
    {
      title: '状态',
      width: 80,
      render: (_, r) => (r.revoked ? <Tag>已作废</Tag> : <Tag color="blue">有效</Tag>),
    },
    { title: '卷号', dataIndex: 'matched_roll_number', width: 120 },
    { title: '原始条码', dataIndex: 'raw_barcode', width: 120 },
    { title: '操作人', dataIndex: 'scan_user_name', width: 90 },
  ];

  return (
    <AppPageContainer
      title="订单详情"
      onBack={() => history.push('/orders')}
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
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleDownload}>
            下载明细
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={async () => {
              if (!order?.order_no) return;
              const result = await openOrderReport(order.id, order.order_no);
              if (!result.ok) message.error(result.message);
            }}
          >
            打印
          </Button>
          <Dropdown menu={{ items: moreMenuItems }}>
            <Button>
              更多操作 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      }
    >
      {order ? (
        <>
          <ProCard bordered style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <OrderStatusTag status={order.status} temp={order.temp} />
              </Descriptions.Item>
              <Descriptions.Item label="客户">{order.customer_name}</Descriptions.Item>
              <Descriptions.Item label="车号">{order.vehicle_no || '—'}</Descriptions.Item>
              <Descriptions.Item label="箱号">{order.container_no || '—'}</Descriptions.Item>
              <Descriptions.Item label="下单日期">{order.order_date}</Descriptions.Item>
              <Descriptions.Item label="完成时间" span={3}>{order.completed_at || '—'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={3}>
                <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 2, expandable: true }}>
                  {order.remark || '—'}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </ProCard>

          <OrderFulfillmentBoard order={order} />

          <OutboundScanTable
            logs={logs}
            loading={logsLoading}
            canRevoke={!!canOperate}
            onRevoke={handleRevoke}
            onBulkRevoke={canOperate ? handleBulkRevoke : undefined}
            onRevokeUnplanned={canOperate ? handleRevokeUnplanned : undefined}
            extra={
              canOperate ? (
                <Button type="primary" size="small" onClick={() => setPickerOpen(true)}>
                  继续出库
                </Button>
              ) : null
            }
          />

          <Collapse
            style={{ marginTop: 16 }}
            items={[
              {
                key: 'audit',
                label: `操作日志（共 ${logs.length} 条）`,
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={logs}
                    columns={auditColumns}
                    pagination={{ pageSize: 10 }}
                    className="wh-outbound-log-table"
                  />
                ),
              },
            ]}
          />
        </>
      ) : null}

      <RollPickerDrawer
        open={pickerOpen}
        orderId={orderId}
        onClose={() => setPickerOpen(false)}
        onSuccess={silentRefresh}
      />
    </AppPageContainer>
  );
};

export default OrdersDetail;
