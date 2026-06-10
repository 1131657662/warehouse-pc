import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type {
  ActionType,
  ProColumns,
  ProFormInstance,
} from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import {
  App,
  Button,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import RollLifecycleDrawer from '@/components/Inventory/RollLifecycleDrawer';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { useInventoryWebSocket } from '@/hooks/useInventoryWebSocket';
import { getCustomerList } from '@/services/customers';
import {
  batchDeleteInventory,
  createInventory,
  deleteInventory,
  getInventoryList,
  getInventorySummary,
  updateInventory,
} from '@/services/inventory';
import {
  formatDamagedCell,
  formatPieceWeightDisplay,
  formatSpecDisplay,
  formatTonDisplay,
  formatWeightDisplay,
} from '@/utils/modelDisplay';
import { useProTableResize } from '@/utils/proTableConfig';
import {
  buildInventoryExportQuery,
  downloadAuthenticatedFile,
} from '@/utils/scanLogs';

type InventoryItem = API.InventoryItem;

const InventoryList: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const formRef = useRef<ProFormInstance | undefined>(undefined);
  const { message } = App.useApp();
  const access = useAccess();
  const canManageInventory = access.isAdmin;

  // === 客户列表（搜索栏 + 新增/编辑共用） ===
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const loadCustomers = async () => {
    try {
      const res = await getCustomerList();
      if (res.success) setCustomers(res.data?.list || []);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    loadCustomers();
  }, []);

  // === 品名搜索栏选项（联动客户） ===
  const [productNameOptions, setProductNameOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const loadProductNameOptions = async (customerId?: number) => {
    if (!customerId) {
      setProductNameOptions([]);
      return;
    }
    try {
      const res = await getInventorySummary({ customer_id: customerId });
      if (res.success && res.data) {
        const names = [...new Set(res.data.map((i) => i.product_name))];
        setProductNameOptions(names.map((n) => ({ label: n, value: n })));
      }
    } catch {
      /* ignore */
    }
  };

  // === 新增/编辑弹窗 ===
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<InventoryItem | null>(null);
  const [_formCustomerId, setFormCustomerId] = useState<number | undefined>();

  // === 批量删除弹窗 ===
  const [batchDelOpen, setBatchDelOpen] = useState(false);
  const [delCustomerId, setDelCustomerId] = useState<number | undefined>();
  const [delProductName, setDelProductName] = useState<string | undefined>();
  const [delWeight, setDelWeight] = useState<number | undefined>();
  const [delSpec, setDelSpec] = useState<string | undefined>();
  const [delCount, setDelCount] = useState(0);
  const [summaryOptions, setSummaryOptions] = useState<{
    productNames: string[];
    weights: number[];
    specs: string[];
  }>({ productNames: [], weights: [], specs: [] });

  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleRoll, setLifecycleRoll] = useState<{
    id?: number;
    rollNumber?: string;
  }>({});
  const [wsCustomerId, setWsCustomerId] = useState<number | undefined>();

  useInventoryWebSocket(
    () => {
      actionRef.current?.reload();
    },
    true,
    wsCustomerId,
  );

  // 加载四维度联动选项
  const loadSummaryOptions = async (
    customerId?: number,
    productName?: string,
    weight?: number,
  ) => {
    if (!customerId) {
      setSummaryOptions({ productNames: [], weights: [], specs: [] });
      return;
    }
    try {
      const res = await getInventorySummary({ customer_id: customerId });
      if (!res.success) return;
      const list = res.data || [];

      if (!productName) {
        setSummaryOptions({
          productNames: [...new Set(list.map((i) => i.product_name))],
          weights: [],
          specs: [],
        });
        return;
      }

      const filtered = list.filter((i) => i.product_name === productName);
      if (!weight) {
        setSummaryOptions({
          productNames: [...new Set(list.map((i) => i.product_name))],
          weights: [...new Set(filtered.map((i) => i.weight))],
          specs: [],
        });
        return;
      }

      const filtered2 = filtered.filter((i) => i.weight === weight);
      setSummaryOptions({
        productNames: [...new Set(list.map((i) => i.product_name))],
        weights: [...new Set(filtered.map((i) => i.weight))],
        specs: [...new Set(filtered2.map((i) => i.specification))],
      });
    } catch {
      /* ignore */
    }
  };

  // 计算批量删除影响数量
  const calcDeleteCount = async () => {
    // 使用 summary 数据粗略计算，后端 batch-delete 时再做精确匹配
    if (!delCustomerId) {
      setDelCount(0);
      return;
    }
    try {
      const res = await getInventorySummary({ customer_id: delCustomerId });
      if (!res.success) return;
      let list = res.data || [];
      if (delProductName)
        list = list.filter((i) => i.product_name === delProductName);
      if (delWeight) list = list.filter((i) => i.weight === delWeight);
      if (delSpec) list = list.filter((i) => i.specification === delSpec);
      setDelCount(list.reduce((sum, i) => sum + i.total_quantity, 0));
    } catch {
      setDelCount(0);
    }
  };

  useEffect(() => {
    loadSummaryOptions(delCustomerId, delProductName, delWeight);
    calcDeleteCount();
  }, [delCustomerId, delProductName, delWeight, delSpec]);

  // 处理新增/编辑提交
  const handleEditSubmit = async (values: any) => {
    if (editRecord) {
      const res = await updateInventory(editRecord.id, values);
      if (res.success) {
        message.success('编辑成功');
        setEditOpen(false);
        actionRef.current?.reload();
      } else message.error(res.errorMessage || '编辑失败');
    } else {
      const res = await createInventory(values);
      if (res.success) {
        message.success('新增成功');
        setEditOpen(false);
        actionRef.current?.reload();
      } else message.error(res.errorMessage || '新增失败');
    }
    return true;
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    const res = await batchDeleteInventory({
      customer_id: delCustomerId,
      product_name: delProductName,
      weight: delWeight,
      specification: delSpec,
    });
    if (res.success) {
      message.success(`成功删除 ${res.data?.deletedCount || 0} 条记录`);
      setBatchDelOpen(false);
      actionRef.current?.reload();
    } else {
      message.error(res.errorMessage || '删除失败');
    }
  };

  // === 列定义 ===
  const columns: ProColumns<InventoryItem>[] = [
    // --- 搜索栏专用 ---
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      valueType: 'text',
      fieldProps: { placeholder: MODEL_SEARCH_PLACEHOLDER, allowClear: true },
      order: -1,
    },
    {
      title: '客户',
      dataIndex: 'customer_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: '选择客户',
        allowClear: true,
        showSearch: true,
        options: customers.map((c) => ({ label: c.name, value: c.id })),
        fieldNames: { label: 'label', value: 'value' },
      },
      order: 0,
    },
    {
      title: '品名',
      dataIndex: 'product_name_search',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: '选择品名（先选客户）',
        allowClear: true,
        showSearch: true,
        options: productNameOptions,
        onFocus: () => {
          const customerId = formRef.current?.getFieldValue?.('customer_id');
          loadProductNameOptions(customerId);
        },
      },
      order: 1,
    },
    {
      title: '克重',
      dataIndex: 'weight_s',
      hideInTable: true,
      valueType: 'text',
      fieldProps: { placeholder: '克重（可并入上方搜索框）', allowClear: true },
      order: 2,
    },
    {
      title: '规格',
      dataIndex: 'spec_s',
      hideInTable: true,
      valueType: 'text',
      fieldProps: { placeholder: '门幅（可并入上方搜索框）', allowClear: true },
      order: 3,
    },
    // --- 表格专用 ---
    {
      title: '客户',
      dataIndex: 'customer_name',
      width: 140,
      ellipsis: true,
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '品名',
      dataIndex: 'product_name',
      width: 140,
      ellipsis: true,
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '克重',
      dataIndex: 'weight',
      width: 80,
      align: 'center',
      sorter: true,
      hideInSearch: true,
      render: (_, r) => formatWeightDisplay(r.weight),
    },
    {
      title: '规格',
      dataIndex: 'specification',
      width: 120,
      ellipsis: true,
      sorter: true,
      hideInSearch: true,
      render: (_, r) => formatSpecDisplay(r.specification),
    },
    {
      title: '卷号',
      dataIndex: 'roll_number',
      width: 128,
      sorter: true,
      hideInSearch: true,
      render: (_, r) => (
        <a
          onClick={() => {
            setLifecycleRoll({ id: r.id, rollNumber: r.roll_number });
            setLifecycleOpen(true);
          }}
        >
          {r.roll_number}
        </a>
      ),
    },
    {
      title: '编号',
      dataIndex: 'code',
      width: 100,
      ellipsis: true,
      hideInSearch: true,
      render: (_, r) => r.code || '-',
    },
    {
      title: '件重(kg)',
      dataIndex: 'piece_weight',
      width: 90,
      align: 'center',
      sorter: true,
      hideInSearch: true,
      render: (_, r) => formatPieceWeightDisplay(r.piece_weight),
    },
    {
      title: '件数',
      dataIndex: 'quantity',
      width: 64,
      align: 'center',
      sorter: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'reserve_status',
      width: 80,
      align: 'center',
      hideInSearch: true,
      render: (_, r) =>
        r.reserve_status === 'reserved' ? (
          <a href={`/orders/${r.reserve_order_id}/detail`}>
            <Tag color="orange">占用中</Tag>
          </a>
        ) : (
          <Tag color="green">可用</Tag>
        ),
    },
    {
      title: '破损',
      dataIndex: 'damaged',
      width: 100,
      ellipsis: true,
      sorter: true,
      hideInSearch: true,
      render: (_, r) => formatDamagedCell(r.damaged),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
      render: (_, r) => r.remark || '-',
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 128,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManageInventory ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditRecord(record);
                  setFormCustomerId(record.customer_id);
                  setEditOpen(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除该条库存？"
                onConfirm={async () => {
                  try {
                    const res = await deleteInventory(record.id);
                    if (res.success) {
                      message.success('删除成功');
                      actionRef.current?.reload();
                    } else {
                      message.error(res.errorMessage || '删除失败');
                    }
                  } catch {
                    message.error('删除失败，请确认是否有管理员权限');
                  }
                }}
              >
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  // === 导出 ===
  const handleExport = async () => {
    try {
      const params = formRef.current?.getFieldsValue?.() || {};
      const query = buildInventoryExportQuery(params);
      await downloadAuthenticatedFile(
        `/api/inventory/export${query}`,
        `库存导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      message.success('导出成功');
    } catch (e: any) {
      message.error(e?.message || '导出失败');
    }
  };

  const {
    columns: resizableColumns,
    components,
    tableProps,
  } = useProTableResize('inventory-table-v2', columns, { minTableWidth: 1360 });

  return (
    <AppPageContainer>
      <ProTable<InventoryItem>
        {...tableProps}
        components={components}
        columns={resizableColumns}
        headerTitle="库存列表"
        actionRef={actionRef}
        formRef={formRef}
        rowKey="id"
        request={async (params) => {
          const nextWsCustomerId = params.customer_id
            ? Number(params.customer_id)
            : undefined;
          setWsCustomerId((prev) =>
            prev === nextWsCustomerId ? prev : nextWsCustomerId,
          );
          const res = await getInventoryList({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword,
            customer_id: params.customer_id,
            product_name: params.product_name_search,
            weight: params.weight_s,
            specification: params.spec_s,
          });
          return {
            data: res.data?.list || [],
            total: res.data?.total || 0,
            success: res.success,
          };
        }}
        toolBarRender={() => [
          <Button
            key="summary"
            onClick={() => history.push('/inventory/summary')}
          >
            型号汇总
          </Button>,
          canManageInventory ? (
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditRecord(null);
                setFormCustomerId(undefined);
                setEditOpen(true);
              }}
            >
              新增库存
            </Button>
          ) : null,
          canManageInventory ? (
            <Button
              key="import"
              icon={<ImportOutlined />}
              onClick={() => history.push('/inventory/import')}
            >
              批量导入
            </Button>
          ) : null,
          canManageInventory ? (
            <Button
              key="batchUpdate"
              icon={<EditOutlined />}
              onClick={() => history.push('/inventory/batch-update')}
            >
              批量更新
            </Button>
          ) : null,
          canManageInventory ? (
            <Button
              key="batchChangeCustomer"
              icon={<SwapOutlined />}
              onClick={() => history.push('/inventory/batch-change-customer')}
            >
              批量改客户
            </Button>
          ) : null,
          canManageInventory ? (
            <Button
              key="batchDelete"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setDelCustomerId(undefined);
                setDelProductName(undefined);
                setDelWeight(undefined);
                setDelSpec(undefined);
                setDelCount(0);
                setBatchDelOpen(true);
              }}
            >
              批量删除
            </Button>
          ) : null,
          <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>,
        ]}
      />

      {/* 新增/编辑弹窗 */}
      <ModalForm
        title={editRecord ? '编辑库存' : '新增库存'}
        open={editOpen}
        onOpenChange={setEditOpen}
        width={520}
        initialValues={
          editRecord ? { ...editRecord } : { quantity: 1, damaged: '' }
        }
        onFinish={handleEditSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormSelect
          name="customer_id"
          label="客户"
          placeholder="选择客户"
          showSearch
          options={customers.map((c) => ({ label: c.name, value: c.id }))}
          rules={[{ required: true, message: '请选择客户' }]}
          fieldProps={{
            onChange: (v: unknown) =>
              setFormCustomerId(v as number | undefined),
          }}
        />
        <ProFormText
          name="product_name"
          label="品名"
          placeholder="请输入品名"
          rules={[{ required: true, message: '请输入品名' }]}
        />
        <ProFormDigit
          name="weight"
          label="克重"
          placeholder="克重(g)"
          min={0}
        />
        <ProFormText name="specification" label="规格" placeholder="规格" />
        <ProFormText
          name="roll_number"
          label="卷号"
          placeholder="请输入卷号（唯一）"
          rules={[{ required: true, message: '请输入卷号' }]}
        />
        <ProFormText
          name="code"
          label="编号"
          placeholder="编号（可空、可重复）"
        />
        <ProFormDigit
          name="piece_weight"
          label="件重(kg)"
          placeholder="件重(kg)"
          min={0}
        />
        {!editRecord && (
          <ProFormDigit
            name="quantity"
            label="件数"
            placeholder="件数"
            min={1}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true, message: '请输入件数' }]}
          />
        )}
        <ProFormText name="damaged" label="破损" placeholder="破损描述" />
        <ProFormTextArea name="remark" label="备注" placeholder="备注信息" />
      </ModalForm>

      {/* 批量删除弹窗 */}
      <Modal
        title="批量删除库存"
        open={batchDelOpen}
        onCancel={() => setBatchDelOpen(false)}
        onOk={handleBatchDelete}
        okText="确认删除"
        okButtonProps={{ danger: true, disabled: delCount === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text strong>客户</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择客户（可留空）"
              allowClear
              showSearch
              value={delCustomerId}
              onChange={(v) => {
                setDelCustomerId(v);
                setDelProductName(undefined);
                setDelWeight(undefined);
                setDelSpec(undefined);
              }}
              options={customers.map((c) => ({ label: c.name, value: c.id }))}
            />
          </div>
          <div>
            <Typography.Text strong>品名</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择品名（可留空）"
              allowClear
              disabled={!delCustomerId}
              value={delProductName}
              onChange={(v) => {
                setDelProductName(v);
                setDelWeight(undefined);
                setDelSpec(undefined);
              }}
              options={summaryOptions.productNames.map((n) => ({
                label: n,
                value: n,
              }))}
            />
          </div>
          <div>
            <Typography.Text strong>克重</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择克重（可留空）"
              allowClear
              disabled={!delProductName}
              value={delWeight}
              onChange={(v) => {
                setDelWeight(v);
                setDelSpec(undefined);
              }}
              options={summaryOptions.weights.map((w) => ({
                label: String(w),
                value: w,
              }))}
            />
          </div>
          <div>
            <Typography.Text strong>规格</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择规格（可留空）"
              allowClear
              disabled={!delWeight}
              value={delSpec}
              onChange={setDelSpec}
              options={summaryOptions.specs.map((s) => ({
                label: s,
                value: s,
              }))}
            />
          </div>
          {delCustomerId && (
            <div
              style={{ background: '#fff7e6', padding: 12, borderRadius: 6 }}
            >
              <Typography.Text>
                将删除：<Typography.Text strong>{delCount} 条</Typography.Text>{' '}
                卷号记录
              </Typography.Text>
              <br />
              <Typography.Text type="secondary">
                ⚠️ 已出库的卷号不会被删除
              </Typography.Text>
            </div>
          )}
        </Space>
      </Modal>
      <RollLifecycleDrawer
        open={lifecycleOpen}
        inventoryId={lifecycleRoll.id}
        rollNumber={lifecycleRoll.rollNumber}
        onClose={() => setLifecycleOpen(false)}
      />
    </AppPageContainer>
  );
};

export default InventoryList;
