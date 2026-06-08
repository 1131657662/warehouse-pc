import {
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  ScanOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Button, Dropdown, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import OrderListFulfillmentCell from '@/components/Order/OrderListFulfillmentCell';
import OrderStatusTabs, {
  type OrderStatusTab,
} from '@/components/Order/OrderStatusTabs';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import { getCustomerList } from '@/services/customers';
import { cancelOrder, getOrderList } from '@/services/orders';
import { openOrderReport } from '@/utils/openOrderReport';
import {
  createRowClickHandlers,
  useProTableResize,
} from '@/utils/proTableConfig';
import { downloadAuthenticatedFile } from '@/utils/scanLogs';

const { Text } = Typography;

type OrderItem = API.OrderItem;

const STATUS_TAB_QUERY: Record<OrderStatusTab, string[] | undefined> = {
  pending: ['pending'],
  scanning: ['scanning'],
  completed: ['completed'],
  all_active: ['pending', 'scanning', 'completed'],
  cancelled: ['cancelled'],
};

const OrdersList: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message, modal } = App.useApp();
  const access = useAccess();
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [statusTab, setStatusTab] = useState<OrderStatusTab>('pending');
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [scanningCount, setScanningCount] = useState<number | null>(null);

  const refreshActiveCounts = useCallback(async () => {
    try {
      const [pendingRes, scanningRes] = await Promise.all([
        getOrderList({ current: 1, pageSize: 1, status: ['pending'] }),
        getOrderList({ current: 1, pageSize: 1, status: ['scanning'] }),
      ]);
      setPendingCount(pendingRes.success ? (pendingRes.data?.total ?? 0) : 0);
      setScanningCount(
        scanningRes.success ? (scanningRes.data?.total ?? 0) : 0,
      );
    } catch {
      setPendingCount(0);
      setScanningCount(0);
    }
  }, []);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
    void refreshActiveCounts();
  }, [refreshActiveCounts]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshActiveCounts();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshActiveCounts]);

  const handleStatusTabChange = useCallback(
    (value: OrderStatusTab) => {
      setStatusTab(value);
      setSelectedOrder(null);
      void refreshActiveCounts();
      actionRef.current?.reload();
    },
    [refreshActiveCounts],
  );

  const handleCancel = useCallback(
    async (id: number) => {
      const res = await cancelOrder(id);
      if (res.success) {
        message.success('订单已取消');
        actionRef.current?.reload();
        void refreshActiveCounts();
        setSelectedOrder(null);
      } else {
        message.error(res.errorMessage || '取消失败');
      }
    },
    [message, refreshActiveCounts],
  );

  const handleDownload = async (record: OrderItem) => {
    setDownloadingId(record.id);
    const hide = message.loading('正在导出...', 0);
    try {
      await downloadAuthenticatedFile(
        `/api/orders/${record.id}/export-scan`,
        `${record.order_no}_出库明细.xlsx`,
      );
      message.success('下载成功');
    } catch (e: any) {
      message.error(e?.message || '下载失败');
    } finally {
      hide();
      setDownloadingId(null);
    }
  };

  const buildMoreMenu = useCallback(
    (record: OrderItem | null): MenuProps['items'] => {
      if (!record) {
        return [
          { key: 'empty', label: '请先点击选中一行订单', disabled: true },
        ];
      }
      const items: MenuProps['items'] = [];

      items.push({
        key: 'detail',
        label: '查看详情',
        onClick: () => history.push(`/orders/${record.id}/detail`),
      });
      if (record.status === 'pending' && (record.scanned_count || 0) === 0) {
        items.push({
          key: 'edit',
          icon: <EditOutlined />,
          label: '编辑订单',
          onClick: () => history.push(`/orders/create?editId=${record.id}`),
        });
      }
      if (
        (record.status === 'pending' || record.status === 'scanning') &&
        access.canPcOutbound
      ) {
        items.push({
          key: 'outbound',
          icon: <ScanOutlined />,
          label: '出库作业',
          onClick: () => history.push(`/orders/${record.id}/outbound`),
        });
      }
      if (
        (record.status === 'pending' || record.status === 'scanning') &&
        (record.scanned_count || 0) === 0 &&
        access.canPcOutbound
      ) {
        items.push({
          key: 'cancel',
          icon: <StopOutlined />,
          label: '取消订单',
          danger: true,
          onClick: () => {
            modal.confirm({
              title: '确认取消该订单？',
              content: `订单号：${record.order_no}`,
              okText: '确认取消',
              okButtonProps: { danger: true },
              onOk: () => handleCancel(record.id),
            });
          },
        });
      }
      if (items.length === 0) {
        return [{ key: 'empty', label: '当前状态无批量操作', disabled: true }];
      }
      return items;
    },
    [access.canPcOutbound, handleCancel, modal],
  );

  const baseColumns: ProColumns<OrderItem>[] = useMemo(
    () => [
      {
        title: '订单号',
        dataIndex: 'order_no',
        width: 140,
        fixed: 'left',
        colSize: 1,
        ellipsis: true,
        fieldProps: {
          placeholder: '订单号',
          allowClear: true,
          style: { minWidth: 160, width: '100%' },
        },
        render: (_, record) => (
          <a onClick={() => history.push(`/orders/${record.id}/detail`)}>
            {record.order_no}
          </a>
        ),
      },
      {
        title: '客户',
        dataIndex: 'customer_name',
        width: 120,
        ellipsis: true,
        hideInSearch: true,
      },
      {
        title: '客户',
        dataIndex: 'customer_id',
        hideInTable: true,
        valueType: 'select',
        colSize: 1,
        fieldProps: {
          placeholder: '选择客户',
          allowClear: true,
          showSearch: true,
          style: { minWidth: 200, width: '100%' },
          options: customers.map((c) => ({ label: c.name, value: c.id })),
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        hideInSearch: true,
        render: (_, record) => (
          <OrderStatusTag status={record.status} temp={record.temp} />
        ),
      },
      {
        key: 'fulfillment',
        title: '出库进度',
        hideInSearch: true,
        width: 148,
        render: (_, record) => <OrderListFulfillmentCell record={record} />,
      },
      {
        title: '车号',
        dataIndex: 'vehicle_no',
        width: 92,
        hideInSearch: true,
        ellipsis: true,
        render: (_, r) => r.vehicle_no || '—',
      },
      {
        title: '箱号',
        dataIndex: 'container_no',
        width: 92,
        hideInSearch: true,
        ellipsis: true,
        render: (_, r) => r.container_no || '—',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 130,
        hideInSearch: true,
        ellipsis: true,
        render: (_, r) =>
          r.remark ? (
            <Text ellipsis={{ tooltip: r.remark }} style={{ maxWidth: 108 }}>
              {r.remark}
            </Text>
          ) : (
            '—'
          ),
      },
      {
        title: '日期',
        dataIndex: 'order_date',
        width: 105,
        hideInSearch: true,
      },
      {
        title: '仅临时单',
        dataIndex: 'temp_only',
        hideInTable: true,
        valueType: 'select',
        colSize: 1,
        fieldProps: {
          placeholder: '是否临时单',
          allowClear: true,
          style: { minWidth: 160, width: '100%' },
          options: [{ label: '仅临时单', value: 'temp' }],
        },
      },
      {
        title: '日期范围',
        dataIndex: 'dateRange',
        hideInTable: true,
        valueType: 'dateRange',
        colSize: 1,
        fieldProps: {
          style: { minWidth: 260, width: '100%' },
        },
      },
      {
        title: '操作',
        valueType: 'option',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4} split={<span style={{ color: '#EAEAEA' }}>|</span>}>
            <a
              key="view"
              onClick={() => history.push(`/orders/${record.id}/detail`)}
            >
              <EyeOutlined style={{ marginRight: 2 }} />
              查看
            </a>
            <a
              key="print"
              onClick={async (e) => {
                e.stopPropagation();
                const result = await openOrderReport(
                  record.id,
                  record.order_no,
                );
                if (!result.ok) message.error(result.message);
              }}
            >
              <PrinterOutlined style={{ marginRight: 2 }} />
              打印
            </a>
            <a
              key="download"
              onClick={() => handleDownload(record)}
              style={{
                pointerEvents: downloadingId === record.id ? 'none' : undefined,
                opacity: downloadingId === record.id ? 0.5 : 1,
              }}
            >
              <DownloadOutlined style={{ marginRight: 2 }} />
              {downloadingId === record.id ? '生成中…' : '下载'}
            </a>
          </Space>
        ),
      },
    ],
    [customers, downloadingId],
  );

  const { columns, components, tableProps } = useProTableResize(
    'orders-table-v6',
    baseColumns,
    { leadingColumnCount: 1, minTableWidth: 1020 },
  );

  return (
    <AppPageContainer title="订单管理">
      <ProTable<OrderItem>
        {...tableProps}
        components={components}
        columns={columns}
        cardBordered
        actionRef={actionRef}
        rowKey="id"
        headerTitle={
          <OrderStatusTabs
            value={statusTab}
            pendingCount={pendingCount}
            scanningCount={scanningCount}
            onChange={handleStatusTabChange}
          />
        }
        onRow={(record) =>
          createRowClickHandlers(
            record,
            selectedOrder?.id,
            (r) => r.id,
            setSelectedOrder,
          )
        }
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedOrder ? [selectedOrder.id] : [],
          onChange: (_, rows) => setSelectedOrder(rows[0] || null),
        }}
        tableAlertRender={false}
        request={async (params) => {
          const tabStatus = STATUS_TAB_QUERY[statusTab];
          const tempOnly = params.temp_only === 'temp';
          const status = tempOnly ? [...(tabStatus || []), 'temp'] : tabStatus;
          const res = await getOrderList({
            current: params.current!,
            pageSize: params.pageSize!,
            order_no: params.order_no,
            customer_id: params.customer_id,
            status,
            dateRange: Array.isArray(params.dateRange)
              ? params.dateRange.join(',')
              : params.dateRange,
          });
          return {
            data: res.data?.list || [],
            total: res.data?.total || 0,
            success: res.success,
          };
        }}
        toolBarRender={() => [
          <Dropdown key="more" menu={{ items: buildMoreMenu(selectedOrder) }}>
            <Button type={selectedOrder ? 'primary' : 'default'}>
              订单操作 <DownOutlined />
            </Button>
          </Dropdown>,
          access.canPcOutbound ? (
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => history.push('/orders/create')}
            >
              创建订单
            </Button>
          ) : null,
        ]}
      />
    </AppPageContainer>
  );
};

export default OrdersList;
