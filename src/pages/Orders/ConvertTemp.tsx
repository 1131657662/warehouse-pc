import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormDatePicker,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  Alert,
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
import { convertTempOrder, getOrderDetail } from '@/services/orders';

const { Text } = Typography;

interface DetailRow {
  key: string;
  product_name: string;
  weight: number | null;
  specification: string;
  stock_qty: number;
  stock_ton: number;
  stock_codes: string;
  actual_qty: number;
  planned_qty: number;
  estimated_ton: number;
  remark: string;
}

const ConvertTempPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { message } = App.useApp();
  const access = useAccess();
  const [form] = ProForm.useForm();

  const [loadingData, setLoadingData] = useState(true);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [orderNo, setOrderNo] = useState('');

  const customerIdWatch: number | undefined = ProForm.useWatch(
    'customer_id',
    form,
  );

  useEffect(() => {
    if (!access.canPcOutbound) return;
    if (!orderId || Number.isNaN(orderId)) {
      message.error('无效的订单 ID');
      history.replace('/orders');
      return;
    }
    setLoadingData(true);
    getOrderDetail(orderId)
      .then((res) => {
        if (!res.success || !res.data) {
          message.error('加载订单失败');
          history.replace('/orders');
          return;
        }
        const order = res.data;
        if (!order.temp) {
          message.warning('该订单不是临时单');
          history.replace(`/orders/${orderId}/detail`);
          return;
        }
        if (order.status === 'completed' || order.status === 'cancelled') {
          message.warning('已完成或已取消的订单不可转正');
          history.replace(`/orders/${orderId}/detail`);
          return;
        }
        setOrderNo(order.order_no);
        setCustomerId(order.customer_id);
        form.setFieldsValue({
          customer_id: order.customer_id,
          order_date: dayjs(order.order_date),
          vehicle_no: order.vehicle_no,
          container_no: order.container_no,
          remark: order.remark,
        });
        const rows: DetailRow[] = (order.summary || [])
          .filter((s) => s.actual_qty > 0 || s.is_unplanned)
          .map((s) => ({
            key: `${Date.now()}_${Math.random()}`,
            product_name: s.product_name,
            weight: s.weight,
            specification: s.specification,
            stock_qty: 0,
            stock_ton: 0,
            stock_codes: s.scanned_codes || s.stock_codes || s.codes || '',
            actual_qty: s.actual_qty,
            planned_qty:
              Math.max(s.actual_qty, s.planned_qty || 0) || s.actual_qty,
            estimated_ton: Number(s.estimated_ton || s.actual_ton || 0),
            remark: '',
          }));
        setDetails(rows);
      })
      .finally(() => setLoadingData(false));
  }, [orderId, access.canPcOutbound, form, message]);

  const effectiveCustomerId = customerIdWatch ?? customerId;

  const existingModelKeys = useMemo(
    () => new Set(details.map((d) => modelKey(d))),
    [details],
  );

  const handleAddModels = (models: InventoryModelOption[]) => {
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
        actual_qty: 0,
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
    setDetails(next);
    setModelOpen(false);
    message.success(`已加入 ${added} 个型号，请填写计划件数`);
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
        if (field === 'planned_qty' && updated.stock_qty > 0) {
          updated.estimated_ton = Number(
            (
              (updated.stock_ton / updated.stock_qty) *
              (updated.planned_qty as number)
            ).toFixed(3),
          );
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
      title: '已扫',
      width: 72,
      align: 'center',
      render: (_, r) =>
        r.actual_qty > 0 ? <Text strong>{r.actual_qty}</Text> : '—',
    },
    {
      title: '可用库存',
      width: 120,
      render: (_, r) =>
        r.stock_qty > 0 ? (
          <Space direction="vertical" size={0}>
            <Text>{r.stock_qty} 件</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              约 {r.stock_ton.toFixed(3)} 吨
            </Text>
          </Space>
        ) : (
          '—'
        ),
    },
    {
      title: '计划件数',
      dataIndex: 'planned_qty',
      width: 120,
      render: (v, record) => (
        <InputNumber
          min={record.actual_qty || 1}
          max={record.stock_qty > 0 ? record.stock_qty : undefined}
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
      width: 120,
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
      render: (_, record) =>
        record.actual_qty > 0 ? null : (
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

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (details.length === 0) {
      message.warning('请至少添加一条计划明细');
      return;
    }
    for (const d of details) {
      if (!d.planned_qty || d.planned_qty <= 0) {
        message.warning(`请填写「${d.product_name}」的计划件数`);
        return;
      }
      if (d.planned_qty < d.actual_qty) {
        message.warning(
          `${d.product_name} 计划件数不能小于已扫件数（${d.actual_qty}）`,
        );
        return;
      }
      if (d.stock_qty > 0 && d.planned_qty > d.stock_qty) {
        message.warning(`${d.product_name} 计划件数不能超过可用库存`);
        return;
      }
    }
    setSubmitting(true);
    const body = {
      order_date: dayjs.isDayjs(values.order_date)
        ? values.order_date.format('YYYY-MM-DD')
        : String(values.order_date || '').slice(0, 10),
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
      const res = await convertTempOrder(orderId, body);
      if (res.success) {
        message.success('临时单已转为正式单');
        history.push(`/orders/${orderId}/detail`);
      } else {
        message.error(res.errorMessage || '转正失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!access.canPcOutbound) {
    return (
      <AppPageContainer>
        <ProCard>您没有操作出库单的权限。</ProCard>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer
      title={`临时单转正${orderNo ? ` · ${orderNo}` : ''}`}
      onBack={() => history.push(`/orders/${orderId}/detail`)}
    >
      {loadingData ? (
        <Spin />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="为临时单补全计划明细后转为正式订单。已扫型号计划件数须 ≥ 已扫件数；未扫过的型号可删除。"
          />
          <ProForm
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            submitter={false}
          >
            <ProFormDatePicker
              name="order_date"
              label="下单日期"
              rules={[{ required: true }]}
            />
            <ProFormText name="vehicle_no" label="车号" />
            <ProFormText name="container_no" label="箱号" />
            <ProFormTextArea
              name="remark"
              label="备注"
              fieldProps={{ rows: 2 }}
            />

            <ProCard
              title="计划明细"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!effectiveCustomerId}
                  onClick={() => setModelOpen(true)}
                >
                  添加型号
                </Button>
              }
              style={{ marginTop: 8 }}
            >
              {details.length === 0 ? (
                <Empty description="请添加计划型号，或从已扫汇总中确认" />
              ) : (
                <Table
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={detailColumns}
                  dataSource={details}
                  scroll={{ x: 900 }}
                />
              )}
            </ProCard>

            <Space style={{ marginTop: 24 }}>
              <Button
                type="primary"
                loading={submitting}
                onClick={() => form.submit()}
              >
                确认转正
              </Button>
              <Button onClick={() => history.push(`/orders/${orderId}/detail`)}>
                取消
              </Button>
            </Space>
          </ProForm>

          <AddModelModal
            open={modelOpen}
            customerId={effectiveCustomerId}
            existingKeys={existingModelKeys}
            onCancel={() => setModelOpen(false)}
            onConfirm={handleAddModels}
          />
        </>
      )}
    </AppPageContainer>
  );
};

export default ConvertTempPage;
