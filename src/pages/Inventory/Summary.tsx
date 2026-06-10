import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { App, Button, Drawer, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import RollLifecycleDrawer from '@/components/Inventory/RollLifecycleDrawer';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { getCustomerList } from '@/services/customers';
import {
  getInventoryList,
  getInventorySummary,
  refreshModelSummary,
} from '@/services/inventory';
import {
  formatDamagedCell,
  formatPieceWeightDisplay,
  formatSpecDisplay,
  formatTonDisplay,
  formatWeightDisplay,
} from '@/utils/modelDisplay';
import { useProTableResize } from '@/utils/proTableConfig';

const InventorySummaryPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rolls, setRolls] = useState<API.InventoryItem[]>([]);
  const [rollsLoading, setRollsLoading] = useState(false);
  const [activeRow, setActiveRow] = useState<API.InventorySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleRoll, setLifecycleRoll] = useState<{
    id?: number;
    rollNumber?: string;
  }>({});

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

  const openLifecycle = (item: API.InventoryItem) => {
    setLifecycleRoll({ id: item.id, rollNumber: item.roll_number });
    setLifecycleOpen(true);
  };

  const handleRefreshSummary = () => {
    modal.confirm({
      title: '重建型号汇总？',
      content:
        '将从库存明细重算全部客户的型号汇总表，大批量导入后若选型号数据异常可执行此操作。',
      onOk: async () => {
        setRefreshing(true);
        try {
          const res = await refreshModelSummary();
          if (res.success) {
            message.success(res.errorMessage || '重建完成');
          } else {
            message.error(res.errorMessage || '重建失败');
          }
        } finally {
          setRefreshing(false);
        }
      },
    });
  };

  const baseColumns: ProColumns<API.InventorySummary>[] = useMemo(
    () => [
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
      {
        title: '客户',
        dataIndex: 'customer_name',
        width: 140,
        ellipsis: true,
        hideInSearch: true,
      },
      {
        title: '品名',
        dataIndex: 'product_name',
        width: 140,
        ellipsis: true,
        hideInSearch: true,
      },
      {
        title: '克重',
        dataIndex: 'weight',
        width: 80,
        align: 'center',
        hideInSearch: true,
        render: (_, r) => formatWeightDisplay(r.weight),
      },
      {
        title: '规格',
        dataIndex: 'specification',
        width: 120,
        hideInSearch: true,
        render: (_, r) => formatSpecDisplay(r.specification),
      },
      {
        title: '编号',
        dataIndex: 'code_count',
        width: 120,
        ellipsis: true,
        hideInSearch: true,
        render: (_, r) => {
          const count = r.code_count || 0;
          const preview = r.code_preview || '';
          const firstCode = (preview.split('、')[0] || preview).trim();
          if (count === 0) return '—';
          if (count === 1) return firstCode || preview;
          return (
            <a onClick={() => openRolls(r)}>
              {firstCode || preview} 等 {count} 个
            </a>
          );
        },
      },
      {
        title: '件数',
        dataIndex: 'total_quantity',
        width: 90,
        align: 'center',
        hideInSearch: true,
      },
      {
        title: '在途占用',
        dataIndex: 'total_reserved',
        width: 90,
        align: 'center',
        hideInSearch: true,
        render: (_, r) =>
          r.total_reserved > 0 ? (
            <Tag color="orange">{r.total_reserved}</Tag>
          ) : (
            '0'
          ),
      },
      {
        title: '吨位',
        dataIndex: 'total_ton',
        width: 90,
        align: 'center',
        hideInSearch: true,
        render: (_: any, r: API.InventorySummary) =>
          formatTonDisplay(r.total_ton),
      },
      {
        key: 'actions',
        title: '操作',
        width: 100,
        fixed: 'right',
        hideInSearch: true,
        render: (_, row) => <a onClick={() => openRolls(row)}>查看卷号</a>,
      },
    ],
    [customers],
  );

  const { columns, components, tableProps } = useProTableResize(
    'inventory-summary-v2',
    baseColumns,
  );

  return (
    <AppPageContainer>
      <ProTable<API.InventorySummary>
        {...tableProps}
        components={components}
        columns={columns}
        headerTitle="库存型号汇总"
        toolBarRender={() => [
          <Button
            key="refresh"
            loading={refreshing}
            onClick={handleRefreshSummary}
          >
            重建型号汇总
          </Button>,
        ]}
        rowKey={(r) =>
          `${r.customer_id}|${r.product_name}|${r.weight}|${r.specification}`
        }
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
        width={640}
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
            {
              title: '卷号',
              dataIndex: 'roll_number',
              render: (v: string, r) => (
                <a onClick={() => openLifecycle(r)}>{v}</a>
              ),
            },
            {
              title: '编号',
              dataIndex: 'code',
              width: 100,
              render: (v: string) => v || '-',
            },
            {
              title: '件重(kg)',
              dataIndex: 'piece_weight',
              width: 100,
              render: (v: number | null) => formatPieceWeightDisplay(v),
            },
            {
              title: '破损',
              dataIndex: 'damaged',
              width: 100,
              ellipsis: true,
              render: (v: string) => formatDamagedCell(v),
            },
            {
              title: '状态',
              dataIndex: 'reserve_status',
              width: 90,
              render: (s: string) =>
                s === 'reserved' ? (
                  <Tag color="orange">在途</Tag>
                ) : (
                  <Tag color="green">可用</Tag>
                ),
            },
            {
              title: '操作',
              width: 80,
              render: (_, r) => (
                <a onClick={() => openLifecycle(r)}>生命周期</a>
              ),
            },
          ]}
        />
      </Drawer>
      <RollLifecycleDrawer
        open={lifecycleOpen}
        inventoryId={lifecycleRoll.id}
        rollNumber={lifecycleRoll.rollNumber}
        onClose={() => setLifecycleOpen(false)}
      />
    </AppPageContainer>
  );
};

export default InventorySummaryPage;
