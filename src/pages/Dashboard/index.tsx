import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import { ProTable, StatisticCard } from '@ant-design/pro-components';
import { Line } from '@ant-design/charts';
import { history } from '@umijs/max';
import { Card, Col, List, Row, Tag } from 'antd';
import type { ProColumns } from '@ant-design/pro-components';
import { useEffect, useMemo, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import { getDashboardStats } from '@/services/dashboard';
import { getOrderList } from '@/services/orders';
import { useProTableResize } from '@/utils/proTableConfig';

/** 趋势图与待处理订单卡片内容区统一高度 */
const DASHBOARD_PAIR_BODY_HEIGHT = 280;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInventory: 0,
    todayOrders: 0,
    pendingScan: 0,
    completedToday: 0,
    todayOutboundTons: 0,
    orderTrend: [] as { date: string; count: number }[],
    lowStock: [] as {
      customer_name: string;
      product_name: string;
      weight: number;
      specification: string;
      total_quantity: number;
    }[],
  });
  const [pendingOrders, setPendingOrders] = useState<API.OrderItem[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      if (res.success && res.data) {
        setStats({
          totalInventory: res.data.totalInventory || 0,
          todayOrders: res.data.todayOrders || 0,
          pendingScan: res.data.pendingScan || 0,
          completedToday: res.data.completedToday || 0,
          orderTrend: res.data.orderTrend || [],
          todayOutboundTons: res.data.todayOutboundTons || 0,
          lowStock: res.data.lowStock || [],
        });
        setPendingOrders(res.data.pendingOrders || []);
      }
    } catch {
      // 后端无仪表盘接口时，用订单列表兜底
      try {
        const orderRes = await getOrderList({ current: 1, pageSize: 5, status: ['pending', 'scanning'] });
        if (orderRes.success) {
          const list = orderRes.data?.list || [];
          setPendingOrders(list);
          setStats((s) => ({
            ...s,
            pendingScan: list.length,
          }));
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 近7天趋势数据兜底
  const chartData =
    stats.orderTrend.length > 0
      ? stats.orderTrend
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - 6 + i);
          return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            count: 0,
          };
        });

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'count',
    smooth: true,
    height: DASHBOARD_PAIR_BODY_HEIGHT,
    point: { size: 3 },
    color: '#0070F3',
    tooltip: {
      formatter: (datum: { date: string; count: number }) => ({
        name: '订单数',
        value: datum.count,
      }),
    },
  };

  const baseOrderColumns: ProColumns<API.OrderItem>[] = useMemo(
    () => [
      {
        title: '订单号',
        dataIndex: 'order_no',
        width: 140,
        ellipsis: true,
      },
      {
        title: '客户',
        dataIndex: 'customer_name',
        width: 120,
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (_, record) => <OrderStatusTag status={record.status} temp={record.temp} />,
      },
      {
        title: '日期',
        dataIndex: 'order_date',
        width: 110,
      },
    ],
    [],
  );

  const {
    columns: orderColumns,
    components: orderTableComponents,
    tableProps: orderTableProps,
  } = useProTableResize('dashboard-pending-orders-v1', baseOrderColumns, {
    minTableWidth: 480,
    tableExtra: {
      options: false,
      search: false,
      pagination: false,
      size: 'small',
    },
  });

  return (
    <AppPageContainer>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '总库存件数',
              value: stats.totalInventory,
              prefix: <InboxOutlined />,
              suffix: '件',
            }}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '今日订单',
              value: stats.todayOrders,
              prefix: <SnippetsOutlined />,
              suffix: '单',
            }}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '待出库订单',
              value: stats.pendingScan,
              prefix: <ClockCircleOutlined />,
              suffix: '单',
              valueStyle: { color: '#F59E0B' },
            }}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            statistic={{
              title: '今日已完成',
              value: stats.completedToday,
              prefix: <CheckCircleOutlined />,
              suffix: '单',
              valueStyle: { color: '#30A46C' },
            }}
            loading={loading}
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
        <Col span={24}>
          <StatisticCard
            statistic={{
              title: '今日完成出库吨位',
              value: stats.todayOutboundTons,
              precision: 3,
              suffix: '吨',
            }}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </Col>
      </Row>

      <Row
        gutter={16}
        align="stretch"
        className="wh-dashboard-pair-row"
        style={{ marginTop: 16 }}
      >
        <Col xs={24} lg={14}>
          <Card
            title="近7天订单趋势"
            loading={loading}
            className="wh-dashboard-pair-card"
          >
            {chartData.length > 0 ? (
              <Line {...chartConfig} />
            ) : (
              <div
                className="wh-dashboard-pair-card__empty"
                style={{ color: '#999' }}
              >
                暂无数据
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title="待处理订单 Top 5"
            loading={loading}
            className="wh-dashboard-pair-card"
          >
            <ProTable<API.OrderItem>
              {...orderTableProps}
              components={orderTableComponents}
              rowKey="id"
              columns={orderColumns}
              dataSource={pendingOrders.slice(0, 5)}
              onRow={(record) => ({
                className: 'wh-row-navigate',
                onClick: () => {
                  history.push(`/orders/${record.id}/detail`);
                },
              })}
            />
          </Card>
        </Col>
      </Row>

      {stats.lowStock.length > 0 ? (
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title="低库存预警（型号少于 20 件）"
              extra={
                <a onClick={() => history.push('/inventory/summary')}>查看全部</a>
              }
              loading={loading}
            >
              <List
                dataSource={stats.lowStock}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${item.customer_name} · ${item.product_name}`}
                      description={`${item.weight} / ${item.specification}`}
                    />
                    <Tag
                      style={{
                        background: '#FFF7E6',
                        color: '#D97706',
                        border: 'none',
                        borderRadius: 999,
                        fontSize: 12,
                        padding: '0 10px',
                        lineHeight: '22px',
                      }}
                    >
                      剩 {item.total_quantity} 件
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      ) : null}
    </AppPageContainer>
  );
};

export default Dashboard;
