import type { CSSProperties, FC } from 'react';
import { ORDER_STATUS_STYLE } from './orderConstants';

export type OrderStatusTab =
  | 'pending'
  | 'scanning'
  | 'completed'
  | 'all_active'
  | 'cancelled';

type MainTab = Exclude<OrderStatusTab, 'cancelled'>;

type Props = {
  value: OrderStatusTab;
  pendingCount: number | null;
  scanningCount: number | null;
  onChange: (tab: OrderStatusTab) => void;
};

const MAIN_TABS: { key: MainTab; label: string; tone: MainTab | 'neutral' }[] =
  [
    { key: 'pending', label: '待处理', tone: 'pending' },
    { key: 'scanning', label: '出库中', tone: 'scanning' },
    { key: 'completed', label: '已完成', tone: 'completed' },
    { key: 'all_active', label: '全部有效', tone: 'neutral' },
  ];

function countForTab(
  key: MainTab,
  pending: number | null,
  scanning: number | null,
) {
  if (key === 'pending') return pending;
  if (key === 'scanning') return scanning;
  return null;
}

const OrderStatusTabs: FC<Props> = ({
  value,
  pendingCount,
  scanningCount,
  onChange,
}) => (
  <div className="wh-order-status-tabs">
    <div
      className="wh-order-status-tabs__group"
      role="tablist"
      aria-label="订单状态"
    >
      {MAIN_TABS.map((tab) => {
        const active = value === tab.key;
        const count = countForTab(tab.key, pendingCount, scanningCount);
        const toneStyle =
          tab.tone !== 'neutral' ? ORDER_STATUS_STYLE[tab.tone] : undefined;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              'wh-order-status-tabs__item',
              active ? 'is-active' : '',
              active && tab.tone !== 'neutral' ? `is-${tab.tone}` : '',
              active && tab.tone === 'neutral' ? 'is-neutral' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              active && toneStyle
                ? ({
                    '--tab-accent': toneStyle.text,
                    '--tab-accent-bg': toneStyle.bg,
                  } as CSSProperties)
                : undefined
            }
            onClick={() => onChange(tab.key)}
          >
            <span>{tab.label}</span>
            {count != null ? (
              <span className="wh-order-status-tabs__count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
    <span className="wh-order-status-tabs__divider" aria-hidden />
    <button
      type="button"
      role="tab"
      aria-selected={value === 'cancelled'}
      className={[
        'wh-order-status-tabs__item',
        'wh-order-status-tabs__item--cancelled',
        value === 'cancelled' ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onChange('cancelled')}
    >
      已取消
    </button>
  </div>
);

export default OrderStatusTabs;
