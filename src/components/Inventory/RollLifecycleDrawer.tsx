import { history } from '@umijs/max';
import { Descriptions, Drawer, Spin, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import OrderStatusTag from '@/components/Order/OrderStatusTag';
import { formatModelLabel } from '@/components/Order/orderConstants';
import { getInventoryLifecycle } from '@/services/inventory';
import {
  formatDamagedCell,
  formatPieceWeightDisplay,
} from '@/utils/modelDisplay';

const { Link, Text } = Typography;

type Props = {
  open: boolean;
  inventoryId?: number;
  rollNumber?: string;
  onClose: () => void;
};

const RollLifecycleDrawer: React.FC<Props> = ({
  open,
  inventoryId,
  rollNumber,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<API.RollLifecycle | null>(null);

  useEffect(() => {
    if (!open || (!inventoryId && !rollNumber)) {
      setData(null);
      return;
    }
    setLoading(true);
    getInventoryLifecycle({
      id: inventoryId,
      roll_number: rollNumber,
    })
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setData(null);
      })
      .finally(() => setLoading(false));
  }, [open, inventoryId, rollNumber]);

  const inv = data?.inventory;

  return (
    <Drawer
      title={inv ? `卷号 ${inv.roll_number}` : '卷号生命周期'}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {inv ? (
          <>
            <Descriptions
              column={2}
              size="small"
              bordered
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="卷号">
                {inv.roll_number}
              </Descriptions.Item>
              <Descriptions.Item label="编号">
                {inv.code || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客户">
                {inv.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="型号">
                {formatModelLabel(
                  inv.product_name,
                  inv.weight,
                  inv.specification,
                )}
              </Descriptions.Item>
              <Descriptions.Item label="入库时间">
                {inv.created_at || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="件重(kg)">
                {formatPieceWeightDisplay(inv.piece_weight)}
              </Descriptions.Item>
              <Descriptions.Item label="在库件数">
                {inv.quantity}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {inv.reserve_status === 'reserved' ? (
                  <Tag color="orange">
                    在途占用
                    {inv.reserve_order_no ? (
                      <>
                        {' '}
                        <Link
                          onClick={() =>
                            history.push(
                              `/orders/${inv.reserve_order_id}/detail`,
                            )
                          }
                        >
                          {inv.reserve_order_no}
                        </Link>
                      </>
                    ) : null}
                  </Tag>
                ) : (
                  <Tag color="green">可用</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="破损" span={2}>
                {formatDamagedCell(inv.damaged)}
              </Descriptions.Item>
              {inv.remark ? (
                <Descriptions.Item label="备注" span={2}>
                  {inv.remark}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              出库记录（{data?.outbound_history?.length || 0}）
            </Text>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={data?.outbound_history || []}
              className="wh-outbound-log-table"
              columns={[
                {
                  title: '订单',
                  dataIndex: 'order_no',
                  render: (v: string, r) =>
                    v ? (
                      <Link
                        onClick={() =>
                          history.push(`/orders/${r.order_id}/detail`)
                        }
                      >
                        {v}
                      </Link>
                    ) : (
                      '—'
                    ),
                },
                {
                  title: '出库日期',
                  dataIndex: 'order_date',
                  width: 110,
                },
                {
                  title: '扫码时间',
                  dataIndex: 'scan_at',
                  width: 160,
                },
                {
                  title: '状态',
                  dataIndex: 'order_status',
                  width: 90,
                  render: (s: string, r) =>
                    r.revoked ? (
                      <Tag>已撤销</Tag>
                    ) : (
                      <OrderStatusTag status={s} />
                    ),
                },
                {
                  title: '操作人',
                  dataIndex: 'scan_user_name',
                  width: 80,
                },
              ]}
            />
          </>
        ) : (
          !loading && <Text type="secondary">未找到卷号记录</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default RollLifecycleDrawer;
