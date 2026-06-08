import { ProCard } from '@ant-design/pro-components';
import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatSpecDisplay, formatWeightDisplay } from '@/utils/modelDisplay';

const { Text } = Typography;

type SummaryRow = API.ScanSummaryItem & {
  estimated_ton?: number;
  actual_ton?: number;
};

type Props = {
  order: API.OrderDetail;
};

type MetricTone = 'default' | 'primary' | 'warning' | 'success';

function MetricCell({
  label,
  qty,
  unit = '件',
  tonLabel,
  tone = 'default',
}: {
  label: string;
  qty: string;
  unit?: string;
  tonLabel?: string;
  tone?: MetricTone;
}) {
  const valueColor =
    tone === 'primary'
      ? '#0070F3'
      : tone === 'warning'
        ? '#d97706'
        : tone === 'success'
          ? '#059669'
          : '#1a1a2e';

  return (
    <div className="wh-fulfillment-metric">
      <Text type="secondary" className="wh-fulfillment-metric-label">
        {label}
      </Text>
      <div className="wh-fulfillment-metric-qty" style={{ color: valueColor }}>
        {qty}
        <span className="wh-fulfillment-metric-unit">{unit}</span>
      </div>
      {tonLabel ? (
        <Text type="secondary" className="wh-fulfillment-metric-ton">
          {tonLabel}
        </Text>
      ) : (
        <span className="wh-fulfillment-metric-ton wh-fulfillment-metric-ton--empty" />
      )}
    </div>
  );
}

const OrderFulfillmentBoard: React.FC<Props> = ({ order }) => {
  const summary = (order.summary || []) as SummaryRow[];
  const plannedQty = summary.reduce(
    (s, r) => s + (r.is_unplanned ? 0 : r.planned_qty || 0),
    0,
  );
  const plannedTon = summary.reduce(
    (s, r) => s + (r.is_unplanned ? 0 : Number(r.estimated_ton || 0)),
    0,
  );
  const actualQty = order.scanned_count || 0;
  const actualTon = Number(order.scanned_tons || 0);
  const remainQty = order.temp ? 0 : Math.max(0, plannedQty - actualQty);
  const percent =
    order.temp || plannedQty <= 0
      ? actualQty > 0
        ? 100
        : 0
      : Math.min(100, Math.round((actualQty / plannedQty) * 100));

  const compareColumns: ColumnsType<SummaryRow> = [
    {
      title: '产品型号',
      render: (_, r) => (
        <div>
          <Space size={6}>
            <Text strong>{r.product_name}</Text>
            {r.is_unplanned ? (
              <Tag color="orange" style={{ margin: 0 }}>
                计划外
              </Tag>
            ) : null}
          </Space>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            克重 {formatWeightDisplay(r.weight)} · 规格{' '}
            {formatSpecDisplay(r.specification)}
          </Text>
        </div>
      ),
    },
    {
      title: '编号',
      width: 120,
      ellipsis: true,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.scanned_codes || r.stock_codes || r.codes || '—'}
        </Text>
      ),
    },
    {
      title: '计划',
      children: [
        {
          title: '件',
          dataIndex: 'planned_qty',
          width: 64,
          align: 'right',
          render: (v: number, r) => (
            <Text>{order.temp || r.is_unplanned ? '—' : v}</Text>
          ),
        },
        {
          title: '预估吨',
          width: 80,
          align: 'right',
          render: (_, r) => (
            <Text type="secondary">
              {order.temp || r.is_unplanned
                ? '—'
                : Number(r.estimated_ton || 0).toFixed(3)}
            </Text>
          ),
        },
      ],
    },
    {
      title: '实出',
      children: [
        {
          title: '件',
          dataIndex: 'actual_qty',
          width: 64,
          align: 'right',
          render: (v: number) => (
            <Text strong style={{ color: '#0070F3' }}>
              {v}
            </Text>
          ),
        },
        {
          title: '实出吨',
          width: 80,
          align: 'right',
          render: (_, r) => (
            <Text strong style={{ color: '#0070F3' }}>
              {Number(r.actual_ton || 0).toFixed(3)}
            </Text>
          ),
        },
      ],
    },
    {
      title: '剩余件',
      width: 72,
      align: 'right',
      render: (_, r) => {
        if (order.temp || r.is_unplanned) return '—';
        const remain = Math.max(0, (r.planned_qty || 0) - (r.actual_qty || 0));
        return <Text type={remain > 0 ? 'warning' : 'success'}>{remain}</Text>;
      },
    },
    {
      title: '进度',
      dataIndex: 'percent',
      width: 72,
      align: 'right',
      render: (v: number, r) => {
        if (order.temp) return v > 0 ? '100%' : '—';
        if (r.is_unplanned) {
          return (
            <Text type="secondary" style={{ color: '#d97706' }}>
              计划外 {r.actual_qty} 件
            </Text>
          );
        }
        return (
          <Text type="secondary">
            {r.actual_qty}/{r.planned_qty} ({v}%)
          </Text>
        );
      },
    },
  ];

  return (
    <>
      <ProCard
        title="出库履约概要"
        bordered
        style={{ marginBottom: 16 }}
        className="wh-fulfillment-board"
      >
        {order.temp ? (
          <div className="wh-fulfillment-metrics wh-fulfillment-metrics--2">
            <MetricCell
              label="累计出库"
              qty={String(actualQty)}
              tonLabel="临时单 · 随扫随计"
              tone="primary"
            />
            <MetricCell
              label="累计吨位"
              qty={actualTon.toFixed(3)}
              unit="吨"
              tonLabel="按实扫卷重累计"
              tone="primary"
            />
          </div>
        ) : (
          <>
            <div className="wh-fulfillment-metrics wh-fulfillment-metrics--3">
              <MetricCell
                label="计划出库"
                qty={String(plannedQty)}
                tonLabel={`预估 ${plannedTon.toFixed(3)} 吨`}
              />
              <MetricCell
                label="实际出库"
                qty={String(actualQty)}
                tonLabel={`实扫 ${actualTon.toFixed(3)} 吨`}
                tone="primary"
              />
              <MetricCell
                label="剩余件数"
                qty={String(remainQty)}
                tonLabel={remainQty > 0 ? '待继续出库' : '已达计划件数'}
                tone={remainQty > 0 ? 'warning' : 'success'}
              />
            </div>
            <div className="wh-fulfillment-progress">
              <div className="wh-fulfillment-progress-head">
                <Text type="secondary">件数进度</Text>
                <Text>
                  <Text strong>{actualQty}</Text>
                  <Text type="secondary"> / {plannedQty} 件</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {percent}%
                  </Text>
                </Text>
              </div>
              <div className="wh-fulfillment-progress-track" aria-hidden>
                <div
                  className="wh-fulfillment-progress-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </>
        )}
      </ProCard>

      <ProCard title="按型号对比" bordered style={{ marginBottom: 16 }}>
        <Table
          rowKey={(r) =>
            `${r.product_name}|${r.weight}|${r.specification}|${r.is_unplanned ? 'U' : 'P'}`
          }
          dataSource={summary}
          columns={compareColumns}
          pagination={false}
          size="middle"
          className="wh-outbound-log-table"
          locale={{
            emptyText: order.temp
              ? '临时单无计划型号，出库后自动汇总'
              : '暂无计划明细',
          }}
        />
      </ProCard>
    </>
  );
};

export default OrderFulfillmentBoard;
