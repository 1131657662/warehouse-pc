import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormDatePicker,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  App,
  Button,
  Empty,
  Input,
  InputNumber,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import AddModelModal, {
  type InventoryModelOption,
  modelKey,
} from '@/components/Order/AddModelModal';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { getCustomerList } from '@/services/customers';
import {
  getInventoryList,
  getInventoryModelSummary,
} from '@/services/inventory';
import { createOrder, getOrderDetail, updateOrder } from '@/services/orders';
import {
  applyStockCodeMap,
  buildModelCodeLabelMap,
  mergeSummaryStockCodes,
} from '@/utils/inventoryModelCodes';

const { Text } = Typography;

interface DetailRow {
  key: string;
  product_name: string;
  weight: number | null;
  specification: string;
  stock_qty: number;
  stock_ton: number;
  stock_codes: string;
  planned_qty: number;
  estimated_ton: number;
  remark: string;
}

function buildDetailRowsFromItems(items: API.OrderDetailItem[]): DetailRow[] {
  const modelMap = new Map<
    string,
    {
      planned_qty: number;
      remark: string;
      stock_qty: number;
      stock_ton: number;
      estimated_ton: number;
    }
  >();
  for (const item of items) {
    const key = `${item.product_name}|${item.weight}|${item.specification}`;
    const lineTon = Number(item.estimated_ton || 0);
    if (modelMap.has(key)) {
      const row = modelMap.get(key);
      if (!row) continue;
      row.planned_qty += item.planned_qty;
      row.estimated_ton += lineTon;
    } else {
      modelMap.set(key, {
        planned_qty: item.planned_qty,
        remark: item.remark,
        stock_qty: item.planned_qty ?? 0,
        stock_ton: lineTon,
        estimated_ton: lineTon,
      });
    }
  }
  return Array.from(modelMap.entries()).map(([key, m]) => {
    const [product_name, weightStr, specification] = key.split('|');
    const weight = parseFloat(weightStr);
    return {
      key: `${Date.now()}_${Math.random()}`,
      product_name,
      weight: Number.isNaN(weight) ? null : weight,
      specification,
      stock_qty: m.stock_qty,
      stock_ton: m.stock_ton,
      stock_codes: '',
      planned_qty: m.planned_qty,
      estimated_ton: m.estimated_ton,
      remark: m.remark,
    };
  });
}

const CreateOrderPage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = ProForm.useForm();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const copyFromId = searchParams.get('copyFromId');
  const isEdit = !!editId;
  const isCopy = !!copyFromId;

  const [loadingData, setLoadingData] = useState(!!isEdit || !!isCopy);
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const customerId: number | undefined = ProForm.useWatch('customer_id', form);
  const customerName = customers.find((c) => c.id === customerId)?.name;

  const totalPlanned = details.reduce((sum, d) => sum + d.planned_qty, 0);
  const totalTon = details.reduce((sum, d) => sum + d.estimated_ton, 0);

  useEffect(() => {
    document.title = `${isEdit ? '编辑订单' : isCopy ? '复制建单' : '创建订单'} - 茂智物流`;
  }, [isEdit, isCopy]);

  useEffect(() => {
    getCustomerList({ pageSize: 500 }).then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
  }, []);

  useEffect(() => {
    if (!editId) return;
    setLoadingData(true);
    getOrderDetail(Number(editId))
      .then((res) => {
        if (!res.success || !res.data) {
          message.error('加载订单失败');
          return;
        }
        const order = res.data;
        // 有扫码记录或非待处理状态不可编辑
        if ((order.scanned_count ?? 0) > 0 || order.status !== 'pending') {
          message.error('该订单已有扫码记录或状态不允许编辑');
          history.replace('/orders');
          return;
        }
        form.setFieldsValue({
          customer_id: order.customer_id,
          order_date: dayjs(order.order_date),
          vehicle_no: order.vehicle_no,
          container_no: order.container_no,
          remark: order.remark,
        });
        setDetails(buildDetailRowsFromItems(order.items || []));
      })
      .finally(() => setLoadingData(false));
  }, [editId, form, message]);

  useEffect(() => {
    if (!copyFromId) return;
    setLoadingData(true);
    getOrderDetail(Number(copyFromId))
      .then(async (res) => {
        if (!res.success || !res.data) {
          message.error('加载源订单失败');
          history.replace('/orders');
          return;
        }
        const order = res.data;
        if (order.status !== 'completed') {
          message.warning('仅已完成订单可复制建单');
          history.replace(`/orders/${copyFromId}/detail`);
          return;
        }
        form.setFieldsValue({
          customer_id: order.customer_id,
          order_date: dayjs(),
          vehicle_no: order.vehicle_no,
          container_no: order.container_no,
          remark: order.remark,
        });
        const plannedItems = (order.items || []).filter(
          (it) => !it.is_unplanned,
        );
        let rows = buildDetailRowsFromItems(plannedItems);
        try {
          const stockRes = await getInventoryModelSummary(order.customer_id);
          if (stockRes.success && stockRes.data) {
            const stockMap = new Map(
              stockRes.data.map((s) => [
                modelKey({
                  product_name: s.product_name,
                  weight: s.weight,
                  specification: s.specification,
                }),
                s,
              ]),
            );
            rows = rows.map((r) => {
              const stock = stockMap.get(modelKey(r));
              if (!stock) return r;
              const stockQty = Number(stock.stock_qty || 0);
              const stockTon = Number(stock.stock_ton || 0);
              return {
                ...r,
                stock_qty: stockQty,
                stock_ton: stockTon,
                estimated_ton:
                  stockQty > 0
                    ? Number(((stockTon / stockQty) * r.planned_qty).toFixed(3))
                    : r.estimated_ton,
              };
            });
          }
        } catch {
          /* ignore */
        }
        rows = mergeSummaryStockCodes(rows, order.summary || []);
        try {
          const invRes = await getInventoryList({
            customer_id: order.customer_id,
            pageSize: 5000,
          });
          if (invRes.success && invRes.data?.list) {
            rows = applyStockCodeMap(
              rows,
              buildModelCodeLabelMap(invRes.data.list),
            );
          }
        } catch {
          /* ignore */
        }
        setDetails(rows);
        message.success(
          `已从 ${order.order_no} 复制明细，请核对库存与件数后创建`,
        );
      })
      .finally(() => setLoadingData(false));
  }, [copyFromId, form, message]);

  useEffect(() => {
    if (!customerId || details.length === 0) return;
    let cancelled = false;
    getInventoryList({ customer_id: customerId, pageSize: 5000 })
      .then((res) => {
        if (cancelled || !res.success) return;
        const codeMap = buildModelCodeLabelMap(res.data?.list || []);
        setDetails((prev) => applyStockCodeMap(prev, codeMap));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const existingModelKeys = useMemo(
    () => new Set(details.map((d) => modelKey(d))),
    [details],
  );

  const handleAddModels = async (models: InventoryModelOption[]) => {
    const next: DetailRow[] = [...details];
    let added = 0;
    for (const model of models) {
      const key = modelKey(model);
      if (next.some((d) => modelKey(d) === key)) continue;
      next.push({
        key: `${Date.now()}_${Math.random()}`,
        product_name: model.product_name,
        weight: model.weight,
        specification: model.specification,
        stock_qty: model.stock_qty,
        stock_ton: model.stock_ton,
        stock_codes: '',
        planned_qty: 0,
        estimated_ton: 0,
        remark: '',
      });
      added += 1;
    }
    if (added === 0) {
      message.warning('所选型号均已在明细中');
      return;
    }
    if (customerId) {
      try {
        const res = await getInventoryList({
          customer_id: customerId,
          pageSize: 5000,
        });
        if (res.success) {
          setDetails(
            applyStockCodeMap(
              next,
              buildModelCodeLabelMap(res.data?.list || []),
            ),
          );
        } else {
          setDetails(next);
        }
      } catch {
        setDetails(next);
      }
    } else {
      setDetails(next);
    }
    setModelOpen(false);
    message.success(`已加入 ${added} 个型号，请在下方填写发货件数`);
  };

  const updateDetail = (
    key: string,
    field: keyof DetailRow,
    value: number | string,
  ) => {
    setDetails((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const updated = { ...d, [field]: value };
        if (field === 'planned_qty') {
          updated.estimated_ton =
            updated.stock_qty > 0
              ? Number(
                  (
                    (updated.stock_ton / updated.stock_qty) *
                    (updated.planned_qty as number)
                  ).toFixed(3),
                )
              : 0;
        }
        return updated;
      }),
    );
  };

  const detailColumns: ColumnsType<DetailRow> = [
    { title: '#', width: 48, render: (_, __, i) => i + 1 },
    {
      title: '型号',
      width: 220,
      render: (_, r) =>
        formatModelLabel(r.product_name, r.weight, r.specification),
    },
    {
      title: '编号',
      dataIndex: 'stock_codes',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: '可用库存',
      width: 130,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.stock_qty} 件</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            约 {r.stock_ton.toFixed(3)} 吨
          </Text>
        </Space>
      ),
    },
    {
      title: '发货件数',
      dataIndex: 'planned_qty',
      width: 130,
      render: (v, record) => (
        <InputNumber
          min={0}
          max={record.stock_qty}
          value={v || undefined}
          placeholder="待填"
          status={!v || v <= 0 ? 'warning' : undefined}
          style={{ width: '100%' }}
          onChange={(val) => updateDetail(record.key, 'planned_qty', val ?? 0)}
        />
      ),
    },
    {
      title: '预估吨位',
      dataIndex: 'estimated_ton',
      width: 96,
      render: (v: number) => v.toFixed(3),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 140,
      render: (v, record) => (
        <Input
          value={v}
          onChange={(e) => updateDetail(record.key, 'remark', e.target.value)}
        />
      ),
    },
    {
      title: '',
      width: 56,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() =>
            setDetails((p) => p.filter((d) => d.key !== record.key))
          }
        />
      ),
    },
  ];

  const formatOrderDate = (raw: unknown) => {
    if (dayjs.isDayjs(raw)) return raw.format('YYYY-MM-DD');
    if (typeof raw === 'string' && raw) return raw.slice(0, 10);
    return dayjs().format('YYYY-MM-DD');
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (details.length === 0) {
      message.warning('请至少添加一条出库型号');
      return;
    }
    for (const d of details) {
      if (!d.planned_qty || d.planned_qty <= 0) {
        message.warning(`请填写「${d.product_name}」的发货件数`);
        return;
      }
      if (d.planned_qty > d.stock_qty) {
        message.warning(`${d.product_name} 发货件数不能超过可用库存`);
        return;
      }
    }
    setSubmitting(true);
    const body = {
      customer_id: values.customer_id as number,
      order_date: formatOrderDate(values.order_date),
      vehicle_no: (values.vehicle_no as string) || '',
      container_no: (values.container_no as string) || '',
      remark: (values.remark as string) || '',
      items: details.map((d) => ({
        product_name: d.product_name,
        weight: d.weight,
        specification: d.specification,
        planned_qty: d.planned_qty,
        estimated_ton: d.estimated_ton,
        remark: d.remark,
      })),
    };
    try {
      const res = isEdit
        ? await updateOrder(Number(editId), body)
        : await createOrder(body);
      if (res.success) {
        message.success(
          isEdit ? '订单已保存' : `订单 ${res.data?.order_no || ''} 已创建`,
        );
        history.push('/orders');
      } else {
        message.error(res.errorMessage || '提交失败');
      }
    } catch {
      /* BizError 已由全局 request 提示 */
    } finally {
      setSubmitting(false);
    }
  };

  const runSubmit = async () => {
    try {
      const values = await form.validateFields();
      await handleSubmit(values);
    } catch (err: unknown) {
      const errorFields = (
        err as {
          errorFields?: { name: (string | number)[]; errors: string[] }[];
        }
      )?.errorFields;
      if (errorFields?.length) {
        message.warning(errorFields[0].errors?.[0] || '请先完善订单信息');
        form.scrollToField(errorFields[0].name, {
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  if (loadingData) {
    return (
      <AppPageContainer>
        <div style={{ textAlign: 'center', padding: 120 }}>
          <Spin size="large" tip="加载订单…" />
        </div>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer
      title={isEdit ? '编辑订单' : isCopy ? '复制建单' : '创建订单'}
      onBack={() => history.push('/orders')}
      footer={[
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={runSubmit}
        >
          {isEdit ? '保存' : '创建订单'}
        </Button>,
      ]}
    >
      <ProForm
        form={form}
        layout="horizontal"
        submitter={false}
        onFinish={handleSubmit}
        onFinishFailed={() =>
          message.warning('请先完善订单信息（客户、日期为必填）')
        }
        initialValues={{ order_date: dayjs() }}
        labelCol={{ flex: '0 0 72px' }}
      >
        <ProCard title="订单信息" bordered style={{ marginBottom: 16 }}>
          <ProForm.Group>
            <ProFormSelect
              name="customer_id"
              label="客户"
              width="sm"
              rules={[{ required: true, message: '请选择客户' }]}
              showSearch
              options={customers.map((c) => ({ label: c.name, value: c.id }))}
              fieldProps={{ optionFilterProp: 'label' }}
            />
            <ProFormDatePicker
              name="order_date"
              label="日期"
              width="sm"
              rules={[{ required: true, message: '请选择日期' }]}
              fieldProps={{ format: 'YYYY-MM-DD' }}
            />
            <ProFormText name="vehicle_no" label="车号" width="sm" />
            <ProFormText name="container_no" label="箱号" width="sm" />
          </ProForm.Group>
          <ProFormTextArea
            name="remark"
            label="备注"
            fieldProps={{ rows: 2 }}
          />
        </ProCard>

        <ProCard
          title="出库明细（按型号）"
          bordered
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (!customerId) {
                  message.warning('请先选择客户');
                  return;
                }
                setModelOpen(true);
              }}
            >
              添加型号
            </Button>
          }
        >
          {details.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="尚未添加型号，点击右上角「添加型号」"
            />
          ) : (
            <>
              <Table
                bordered
                rowKey="key"
                dataSource={details}
                columns={detailColumns}
                pagination={false}
                size="middle"
                scroll={{ x: 900 }}
              />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Text type="secondary">
                  合计预发 <Text strong>{totalPlanned}</Text> 件 · 预估{' '}
                  <Text strong>{totalTon.toFixed(3)}</Text> 吨
                </Text>
              </div>
            </>
          )}
        </ProCard>
      </ProForm>

      <AddModelModal
        open={modelOpen}
        customerId={customerId}
        customerName={customerName}
        existingKeys={existingModelKeys}
        onCancel={() => setModelOpen(false)}
        onConfirm={handleAddModels}
      />
    </AppPageContainer>
  );
};

export default CreateOrderPage;
