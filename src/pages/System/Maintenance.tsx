import { ToolOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  InputNumber,
  Row,
  Space,
  Statistic,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import {
  archiveScanLogs,
  getMaintenanceStatus,
  rebuildOrderSummary,
  refreshAllModelSummary,
  repairOrphanReservations,
  triggerDatabaseBackup,
} from '@/services/maintenance';

const { Text, Paragraph } = Typography;

const MaintenancePage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] =
    useState<Awaited<ReturnType<typeof getMaintenanceStatus>>['data']>();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [archiveMonths, setArchiveMonths] = useState(6);
  const [busy, setBusy] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await getMaintenanceStatus();
      if (res.success) setStatus(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const run = async (
    key: string,
    fn: () => Promise<{ success: boolean; errorMessage?: string }>,
  ) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.success) {
        message.success(res.errorMessage || '操作成功');
        await loadStatus();
      } else {
        message.error(res.errorMessage || '操作失败');
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '请求失败');
    } finally {
      setBusy('');
    }
  };

  return (
    <AppPageContainer loading={loading}>
      <Paragraph type="secondary">
        数据修复与运维工具（仅管理员）。生产环境建议在低峰期执行，重要操作前先备份数据库。
      </Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="存储概览">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="scan_logs 主表"
                  value={status?.scan_logs?.mainCount ?? 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="scan_logs 归档表"
                  value={status?.scan_logs?.archiveCount ?? 0}
                />
              </Col>
            </Row>
            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="默认归档保留">
                {status?.archive_months_default ?? 6} 个月（已完成/已取消订单）
              </Descriptions.Item>
              <Descriptions.Item label="最近备份">
                {status?.latest_backup
                  ? `${status.latest_backup.file} · ${new Date(status.latest_backup.createdAt).toLocaleString()}`
                  : '暂无（请配置定时 backup 或在下方手动备份）'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="数据库备份">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                调用 mysqldump 写入服务器 BACKUP_DIR（默认 ./backups）。可配置
                BACKUP_WEBHOOK_URL 告警。
              </Text>
              <Button
                type="primary"
                loading={busy === 'backup'}
                onClick={() =>
                  modal.confirm({
                    title: '立即备份数据库？',
                    onOk: () => run('backup', triggerDatabaseBackup),
                  })
                }
              >
                立即备份
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="孤儿占用修复">
            <Paragraph type="secondary">
              修复 quantity=0 且有 reserved_order_id、但无有效扫码记录的库存卷。
            </Paragraph>
            <Space wrap>
              <Button
                loading={busy === 'orphan-dry'}
                onClick={() =>
                  run('orphan-dry', () =>
                    repairOrphanReservations({ dryRun: true }),
                  )
                }
              >
                试运行
              </Button>
              <Button
                danger
                loading={busy === 'orphan'}
                onClick={() =>
                  modal.confirm({
                    title: '确认修复孤儿占用？',
                    onOk: () =>
                      run('orphan', () =>
                        repairOrphanReservations({ dryRun: false }),
                      ),
                  })
                }
              >
                执行修复
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="按订单重建汇总">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                从扫码日志（含归档表）重算 scanned_count / scanned_tons
                与明细实出，不改变已完成/已取消状态。
              </Text>
              <Space>
                <InputNumber
                  min={1}
                  placeholder="订单 ID"
                  value={orderId ?? undefined}
                  onChange={(v) => setOrderId(v ?? null)}
                />
                <Button
                  type="primary"
                  disabled={!orderId}
                  loading={busy === 'rebuild'}
                  onClick={() =>
                    modal.confirm({
                      title: `重建订单 #${orderId} 汇总？`,
                      onOk: () =>
                        run('rebuild', () => rebuildOrderSummary(orderId!)),
                    })
                  }
                >
                  重建
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="scan_logs 按月归档">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                将已完成/已取消且超过保留期的订单日志迁入
                scan_logs_archive，减轻主表压力。
              </Text>
              <Space>
                <span>保留近</span>
                <InputNumber
                  min={1}
                  max={60}
                  value={archiveMonths}
                  onChange={(v) => setArchiveMonths(v ?? 6)}
                />
                <span>个月</span>
              </Space>
              <Space wrap>
                <Button
                  loading={busy === 'archive-dry'}
                  onClick={() =>
                    run('archive-dry', () =>
                      archiveScanLogs({ dryRun: true, months: archiveMonths }),
                    )
                  }
                >
                  试运行
                </Button>
                <Button
                  danger
                  loading={busy === 'archive'}
                  onClick={() =>
                    modal.confirm({
                      title: '确认执行归档？',
                      content:
                        '归档后日志从主表删除，只读查询会自动合并归档表。',
                      onOk: () =>
                        run('archive', () =>
                          archiveScanLogs({
                            dryRun: false,
                            months: archiveMonths,
                          }),
                        ),
                    })
                  }
                >
                  执行归档
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="型号汇总重建">
            <Paragraph type="secondary">
              从库存明细重算 inventory_model_summary 全表（导入异常时可使用）。
            </Paragraph>
            <Button
              loading={busy === 'model'}
              onClick={() =>
                modal.confirm({
                  title: '重建全部型号汇总？',
                  onOk: () => run('model', refreshAllModelSummary),
                })
              }
            >
              重建全部
            </Button>
          </Card>
        </Col>
      </Row>
    </AppPageContainer>
  );
};

export default MaintenancePage;
