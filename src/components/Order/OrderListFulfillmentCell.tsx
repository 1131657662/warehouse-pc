import { Progress, Typography } from 'antd';
import type { CSSProperties } from 'react';

const { Text } = Typography;

type Props = {
  record: API.OrderItem;
};

import { formatTonDisplay } from '@/utils/modelDisplay';

const fmtTon = (v: number) => (v > 0 ? formatTonDisplay(v) : '—');

const accentColor = '#0070F3';
const doneColor = '#30A46C';

const actualNum: CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

const planNum: CSSProperties = {
  fontSize: 12,
  color: 'rgba(0,0,0,0.45)',
  fontVariantNumeric: 'tabular-nums',
};

function RatioLine({
  unit,
  actual,
  plan,
  showPlan,
  color,
}: {
  unit: string;
  actual: string;
  plan: string;
  showPlan: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        lineHeight: 1.25,
      }}
    >
      <Text type="secondary" style={{ fontSize: 11, width: 12, flexShrink: 0 }}>
        {unit}
      </Text>
      <span style={{ ...actualNum, color }}>{actual}</span>
      {showPlan ? (
        <>
          <Text type="secondary" style={{ fontSize: 11 }}>
            /
          </Text>
          <span style={planNum}>{plan}</span>
        </>
      ) : null}
    </div>
  );
}

const OrderListFulfillmentCell: React.FC<Props> = ({ record }) => {
  const actualQty = record.actual_qty_total ?? record.scanned_count ?? 0;
  const actualTon = Number(record.actual_ton_total ?? record.scanned_tons ?? 0);

  if (record.temp) {
    return (
      <Text style={{ fontSize: 12, lineHeight: 1.4 }}>
        <Text strong style={{ color: accentColor }}>
          {actualQty}
        </Text>
        <Text type="secondary"> 件 · </Text>
        <Text strong>{fmtTon(actualTon)}</Text>
        <Text type="secondary"> 吨</Text>
      </Text>
    );
  }

  const plannedQty = record.planned_total ?? 0;
  const plannedTon = Number(record.planned_ton_total ?? 0);
  const hasPlan = plannedQty > 0;

  const percent = hasPlan
    ? Math.min(100, Math.round((actualQty / plannedQty) * 100))
    : actualQty > 0
      ? 100
      : 0;
  const done = hasPlan && actualQty >= plannedQty;
  const mainColor = done ? doneColor : accentColor;

  return (
    <div style={{ width: '100%', maxWidth: 124 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 3,
        }}
      >
        <RatioLine
          unit="件"
          actual={String(actualQty)}
          plan={hasPlan ? String(plannedQty) : '—'}
          showPlan={hasPlan}
          color={mainColor}
        />
        <Text type="secondary" style={{ fontSize: 10, flexShrink: 0 }}>
          {percent}%
        </Text>
      </div>
      <Progress
        percent={percent}
        size="small"
        showInfo={false}
        strokeColor={done ? doneColor : accentColor}
        status={done ? 'success' : percent > 0 ? 'active' : 'normal'}
        style={{ marginBottom: 3 }}
      />
      <RatioLine
        unit="吨"
        actual={fmtTon(actualTon)}
        plan={hasPlan && plannedTon > 0 ? fmtTon(plannedTon) : '—'}
        showPlan={hasPlan && plannedTon > 0}
        color={mainColor}
      />
    </div>
  );
};

export default OrderListFulfillmentCell;
