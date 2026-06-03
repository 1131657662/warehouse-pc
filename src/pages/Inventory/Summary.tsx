import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Drawer, Table } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getCustomerList } from '@/services/customers';
import { getInventoryList, getInventorySummary } from '@/services/inventory';
import AppPageContainer from '@/components/AppPageContainer';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { useProTableResize } from '@/utils/proTableConfig';

const InventorySummaryPage: React.FC = () => {
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rolls, setRolls] = useState<API.InventoryItem[]>([]);
  const [rollsLoading, setRollsLoading] = useState(false);
  const [activeRow, setActiveRow] = useState<API.InventorySummary | null>(null);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
  }, []);

  const openRolls = async (row: API.InventorySummary) => {
    setActiveRow(row);
    setDrawerOpen(true);
    setRollsLoading(true);
    try {
      const res = await getInventoryList({
        current: 1,
        pageSize: 200,
        customer_id: row.customer_id,
        product_name: row.product_name,
      });
      if (res.success) {
        const list = (res.data?.list || []).filter(
          (i) =>
            String(i.weight) === String(row.weight) &&
            i.specification === row.specification,
        );
        setRolls(list);
      }
    } finally {
      setRollsLoading(false);
    }
  };

  const baseColumns: ProColumns<API.InventorySummary>[] = useMemo(() => [
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
      title: '型号搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: MODEL_SEARCH_PLACEHOLDER, allowClear: true },
    },
    { title: '客户', dataIndex: 'customer_name', width: 140, ellipsis: true, hideInSearch: true },
    { title: '品名', dataIndex: 'product_name', width: 140, ellipsis: true, hideInSearch: true },
    { title: '克重', dataIndex: 'weight', width: 80, align: 'center', hideInSearch: true },
    { title: '规格', dataIndex: 'specification', width: 120, hideInSearch: true },
    { title: '件数', dataIndex: 'total_quantity', width: 90, align: 'center', hideInSearch: true },
    { title: '吨位', dataIndex: 'total_ton', width: 90, align: 'center', hideInSearch: true,
      render: (_: any, r: API.InventorySummary) => (r.total_ton != null ? Number(r.total_ton).toFixed(3) : '-'), },
    {
      key: 'actions',
      title: '操作',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, row) => (
        <a onClick={() => openRolls(row)}>查看卷号</a>
      ),
    },
  ], [customers]);

  const { columns, components, tableProps } = useProTableResize(
    'inventory-summary-v1',
    baseColumns,
  );

  return (
    <AppPageContainer>
      <ProTable<API.InventorySummary>
        {...tableProps}
        components={components}
        columns={columns}
        headerTitle="库存型号汇总"
        rowKey={(r) => `${r.customer_id}|${r.product_name}|${r.weight}|${r.specification}`}
        request={async (params) => {
          const res = await getInventorySummary({
            customer_id: params.customer_id,
            keyword: params.keyword as string | undefined,
          });
          return {
            data: res.data || [],
            total: res.data?.length || 0,
            success: res.success,
          };
        }}
      />
      <Drawer
        title={
          activeRow
            ? formatModelLabel(
                activeRow.product_name,
                activeRow.weight,
                activeRow.specification,
              )
            : '卷号明细'
        }
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Table
          rowKey="id"
          loading={rollsLoading}
          dataSource={rolls}
          size="small"
          pagination={false}
          className="wh-outbound-log-table"
          columns={[
            { title: '卷号', dataIndex: 'roll_number' },
            { title: '件重(kg)', dataIndex: 'piece_weight', width: 100,
              render: (v: number | null) => v != null ? Number(v).toFixed(1) : '-', },
            { title: '破损', dataIndex: 'damaged', width: 80 },
          ]}
        />
      </Drawer>
    </AppPageContainer>
  );
};

export default InventorySummaryPage;
