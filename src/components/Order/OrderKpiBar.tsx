import { Progress } from 'antd';

type Props = {
  order: API.OrderDetail;
};

const cardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '16px 20px',
  border: '1px solid #eaeaea',
  borderRadius: 8,
  background: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#666666',
  lineHeight: 1.4,
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  lineHeight: 1.2,
  fontVariantNumeric: 'tabular-nums',
};

const unitStyle: React.CSSProperties = {
  marginLeft: 4,
  fontSize: 14,
  fontWeight: 500,
  color: '#666666',
};

const subStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 8,
  fontSize: 12,
  color: '#999999',
  lineHeight: 1.4,
  minHeight: 17,
};

const OrderKpiBar: React.FC<Props> = ({ order }) => {
  const plannedQty = (order.summary || []).reduce((s, i) => s + (i.planned_qty || 0), 0);
  const plannedTons = (order.items || []).reduce(
    (s, i) => s + Number(i.estimated_ton || 0),
    0,
  );
  const scannedCount = order.scanned_count || 0;
  const scannedTons = Number(order.scanned_tons || 0);
  const percent =
    order.temp || plannedQty <= 0
      ? scannedCount > 0
        ? 100
        : 0
      : Math.min(100, Math.round((scannedCount / plannedQty) * 100));
  const done = !order.temp && plannedQty > 0 && scannedCount >= plannedQty;
  const progressColor = done ? '#30A46C' : '#0070F3';

  if (order.temp) {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>累计出库</div>
          <div style={{ ...valueStyle, color: '#0070F3' }}>
            {scannedCount}
            <span style={unitStyle}>件</span>
          </div>
          <span style={subStyle}>临时单 · 随扫随计</span>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>累计吨位</div>
          <div style={{ ...valueStyle, color: '#0070F3' }}>
            {scannedTons.toFixed(3)}
            <span style={unitStyle}>吨</span>
          </div>
          <span style={subStyle}>按实扫卷重累计</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={cardStyle}>
        <div style={labelStyle}>已扫</div>
        <div style={{ ...valueStyle, color: '#0070F3' }}>
          {scannedCount}
          <span style={unitStyle}>件</span>
        </div>
        <span style={subStyle}>实扫 {scannedTons.toFixed(3)} 吨</span>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>计划</div>
        <div style={valueStyle}>
          {plannedQty}
          <span style={unitStyle}>件</span>
        </div>
        <span style={subStyle}>预估 {plannedTons.toFixed(3)} 吨</span>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>出库进度</div>
        <div style={{ ...valueStyle, color: progressColor }}>
          {percent}
          <span style={{ ...unitStyle, fontSize: 16 }}>%</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <Progress
            percent={percent}
            size="small"
            showInfo={false}
            strokeColor={progressColor}
            status={done ? 'success' : percent > 0 ? 'active' : 'normal'}
          />
          <span style={{ ...subStyle, marginTop: 4 }}>
            {scannedCount}/{plannedQty} 件
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderKpiBar;
