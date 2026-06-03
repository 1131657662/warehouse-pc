import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import { history } from '@umijs/max';
import { Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getCustomerList } from '@/services/customers';
import { getOutboundTrace, type OutboundTraceRow } from '@/services/outbound';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { useProTableResize } from '@/utils/proTableConfig';

const { Text, Link } = Typography;

const OutboundTracePage: React.FC = () => {
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
  }, []);

  const baseColumns: ProColumns<OutboundTraceRow>[] = useMemo(
    () => [
      {
        title: '卷号',
        dataIndex: 'roll_number',
        width: 140,
        copyable: true,
        fieldProps: { placeholder: '卷号' },
      },
      {
        title: '客户',
        dataIndex: 'customer_id',
        hideInTable: true,
        valueType: 'select',
        fieldProps: {
          showSearch: true,
          allowClear: true,
          options: customers.map((c) => ({ label: c.name, value: c.id })),
        },
      },
      {
        title: '客户',
        dataIndex: 'customer_name',
        width: 120,
        hideInSearch: true,
        ellipsis: true,
      },
      {
        title: '型号搜索',
        dataIndex: 'model_keyword',
        hideInTable: true,
        fieldProps: { placeholder: MODEL_SEARCH_PLACEHOLDER, allowClear: true },
      },
      {
        title: '品名',
        dataIndex: 'product_name',
        width: 120,
        hideInSearch: true,
        ellipsis: true,
      },
      {
        title: '克重',
        dataIndex: 'weight',
        width: 80,
        hideInSearch: true,
        render: (_, r) => (r.weight != null ? Number(r.weight).toFixed(3) : '-'),
      },
      {
        title: '规格',
        dataIndex: 'specification',
        width: 110,
        hideInSearch: true,
        ellipsis: true,
      },
      {
        title: '件重(kg)',
        dataIndex: 'piece_weight',
        width: 90,
        hideInSearch: true,
        render: (_, r) => (r.piece_weight != null ? Number(r.piece_weight).toFixed(3) : '-'),
      },
      {
        title: '出库时间',
        dataIndex: 'scan_at',
        width: 170,
        hideInSearch: true,
        valueType: 'dateTime',
      },
      {
        title: '扫码出库日期',
        dataIndex: 'scan_dateRange',
        hideInTable: true,
        valueType: 'dateRange',
        search: {
          transform: (v) => ({ scan_dateRange: v }),
        },
      },
      {
        title: '订单号',
        dataIndex: 'order_no',
        width: 150,
        copyable: true,
        render: (_, r) => (
          <Link onClick={() => history.push(`/orders/${r.order_id}/detail`)}>
            {r.order_no}
          </Link>
        ),
      },
      {
        title: '订单日期',
        dataIndex: 'order_date',
        width: 110,
        hideInSearch: true,
      },
      {
        title: '订单日期',
        dataIndex: 'order_dateRange',
        hideInTable: true,
        valueType: 'dateRange',
        search: {
          transform: (v) => ({ order_dateRange: v }),
        },
      },
      {
        title: '订单状态',
        dataIndex: 'order_status',
        width: 100,
        hideInSearch: true,
        render: (_, r) => <OrderStatusTag status={r.order_status} />,
      },
      {
        title: '扫码人',
        dataIndex: 'scan_user_name',
        width: 90,
        hideInSearch: true,
      },
      {
        title: '车号',
        dataIndex: 'vehicle_no',
        width: 90,
        hideInSearch: true,
        render: (_, r) => r.vehicle_no || '-',
      },
      {
        title: '含撤销',
        dataIndex: 'include_revoked',
        hideInTable: true,
        valueType: 'select',
        valueEnum: {
          false: { text: '仅有效出库' },
          true: { text: '含已撤销' },
        },
        initialValue: 'false',
        search: {
          transform: (v) => ({ include_revoked: v === 'true' || v === true }),
        },
      },
      {
        title: '状态',
        dataIndex: 'revoked',
        width: 80,
        hideInSearch: true,
        render: (_, r) =>
          r.revoked ? (
            <Tag color="default">已撤销</Tag>
          ) : (
            <Tag color="success">有效</Tag>
          ),
      },
      {
        title: '型号',
        hideInSearch: true,
        width: 200,
        ellipsis: true,
        render: (_, r) =>
          formatModelLabel(r.product_name, r.weight, r.specification),
      },
    ],
    [customers],
  );

  const { columns, components, tableProps } = useProTableResize(
    'outbound-trace-v1',
    baseColumns,
    { minTableWidth: 1500 },
  );

  return (
    <AppPageContainer>
      <ProTable<OutboundTraceRow>
        {...tableProps}
        components={components}
        columns={columns}
        rowKey="id"
        request={async (params) => {
          const res = await getOutboundTrace({
            current: params.current,
            pageSize: params.pageSize,
            customer_id: params.customer_id,
            model_keyword: params.model_keyword as string | undefined,
            roll_number: params.roll_number,
            order_no: params.order_no,
            order_dateRange: params.order_dateRange as [string, string] | undefined,
            scan_dateRange: params.scan_dateRange as [string, string] | undefined,
            include_revoked: params.include_revoked as boolean | undefined,
          });
          return {
            data: res.data?.list || [],
            total: res.data?.total || 0,
            success: res.success,
          };
        }}
      />
    </AppPageContainer>
  );
};

export default OutboundTracePage;
