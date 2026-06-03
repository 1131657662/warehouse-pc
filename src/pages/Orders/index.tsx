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
import AppPageContainer from '@/components/AppPageContainer';
import { history, useAccess } from '@umijs/max';
import { App, Button, Dropdown, Popconfirm, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OrderListFulfillmentCell from '@/components/Order/OrderListFulfillmentCell';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import { getCustomerList } from '@/services/customers';
import { cancelOrder, getOrderList } from '@/services/orders';
import { downloadAuthenticatedFile } from '@/utils/scanLogs';
import { openOrderReport } from '@/utils/openOrderReport';
import { createRowClickHandlers, useProTableResize } from '@/utils/proTableConfig';

const { Text } = Typography;

type OrderItem = API.OrderItem;

const OrdersList: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message } = App.useApp();
  const access = useAccess();
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
  }, []);

  const handleCancel = useCallback(
    async (id: number) => {
      const res = await cancelOrder(id);
      if (res.success) {
        message.success('订单已取消');
        actionRef.current?.reload();
        setSelectedOrder(null);
      } else {
        message.error(res.errorMessage || '取消失败');
      }
    },
    [message],
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
        return [{ key: 'empty', label: '请先点击选中一行订单', disabled: true }];
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
      if (record.status === 'pending' && (record.scanned_count || 0) === 0 && access.canPcOutbound) {
        items.push({
          key: 'cancel',
          icon: <StopOutlined />,
          label: (
            <Popconfirm
              title="确认取消该订单？"
              onConfirm={() => handleCancel(record.id)}
            >
              <span style={{ color: '#ff4d4f' }}>取消订单</span>
            </Popconfirm>
          ),
        });
      }
      if (items.length === 0) {
        return [{ key: 'empty', label: '当前状态无批量操作', disabled: true }];
      }
      return items;
    },
    [access.canPcOutbound, handleCancel],
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
        title: '状态',
        dataIndex: 'status_s',
        hideInTable: true,
        valueType: 'select',
        colSize: 1,
        fieldProps: {
          mode: 'multiple',
          placeholder: '筛选状态',
          allowClear: true,
          style: { minWidth: 220, width: '100%' },
          maxTagCount: 'responsive',
          options: [
            { label: '待处理', value: 'pending' },
            { label: '出库中', value: 'scanning' },
            { label: '已完成', value: 'completed' },
            { label: '已取消', value: 'cancelled' },
            { label: '仅临时单', value: 'temp' },
          ],
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
            <a key="view" onClick={() => history.push(`/orders/${record.id}/detail`)}>
              <EyeOutlined style={{ marginRight: 2 }} />
              查看
            </a>
            <a
              key="print"
              onClick={async (e) => {
                e.stopPropagation();
                const result = await openOrderReport(record.id, record.order_no);
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
          const status = params.status_s as string[] | undefined;
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
