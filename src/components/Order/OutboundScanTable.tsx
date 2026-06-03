import { ProCard } from '@ant-design/pro-components';
import { Button, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { formatModelLabel } from './orderConstants';

const { Text } = Typography;

type Props = {
  logs: API.ScanLogItem[];
  loading?: boolean;
  canRevoke?: boolean;
  onRevoke?: (barcode: string) => void;
  onBulkRevoke?: (scanLogIds: number[]) => void | Promise<void>;
  onRevokeUnplanned?: () => void | Promise<void>;
  extra?: React.ReactNode;
};

const OutboundScanTable: React.FC<Props> = ({
  logs,
  loading,
  canRevoke,
  onRevoke,
  onBulkRevoke,
  onRevokeUnplanned,
  extra,
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const outboundRows = useMemo(() => {
    const list = logs
      .filter((l) => l.action === 'add' && !l.revoked)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    if (!keyword.trim()) return list;
    const kw = keyword.trim().toLowerCase();
    return list.filter(
      (l) =>
        (l.matched_roll_number || '').toLowerCase().includes(kw) ||
        (l.product_name || '').toLowerCase().includes(kw) ||
        (l.scan_user_name || '').toLowerCase().includes(kw),
    );
  }, [logs, keyword]);

  const unplannedCount = useMemo(
    () => outboundRows.filter((r) => r.is_unplanned).length,
    [outboundRows],
  );

  const columns: ColumnsType<API.ScanLogItem> = [
    {
      title: '序号',
      width: 56,
      render: (_, __, i) => (
        <Text type="secondary">{outboundRows.length - i}</Text>
      ),
    },
    {
      title: '扫码时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: '品名',
      dataIndex: 'product_name',
      width: 120,
      render: (v: string, r) => (
        <Space size={4}>
          {v}
          {r.is_unplanned ? <Tag color="orange">计划外</Tag> : null}
        </Space>
      ),
    },
    {
      title: '克重',
      dataIndex: 'weight',
      width: 80,
      align: 'right',
      render: (v) => (v != null ? Number(v).toFixed(3) : '-'),
    },
    {
      title: '规格',
      dataIndex: 'specification',
      width: 110,
    },
    {
      title: '卷号',
      dataIndex: 'matched_roll_number',
      width: 130,
      render: (v: string, r) => v || r.raw_barcode || '-',
    },
    {
      title: '件重(kg)',
      dataIndex: 'piece_weight',
      width: 90,
      align: 'right',
      render: (v) => (v != null ? Number(v).toFixed(3) : '-'),
    },
    {
      title: '吨位',
      width: 80,
      align: 'right',
      render: (_, r) => (Number(r.piece_weight || 0) / 1000).toFixed(3),
    },
    {
      title: '扫码人',
      dataIndex: 'scan_user_name',
      width: 90,
    },
    {
      title: '匹配',
      width: 88,
      render: (_, r) =>
        r.is_fuzzy ? (
          <Tag color="orange">模糊</Tag>
        ) : (
          <Tag color="success">精确</Tag>
        ),
    },
    {
      title: '操作',
      width: 72,
      fixed: 'right',
      render: (_, r) =>
        canRevoke && onRevoke ? (
          <Popconfirm
            title="撤销该卷出库？"
            onConfirm={() => onRevoke(r.matched_roll_number || r.raw_barcode)}
          >
            <Button type="link" danger size="small">
              撤销
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  const bulkExtra = (
    <Space wrap>
      {canRevoke && onRevokeUnplanned && unplannedCount > 0 ? (
        <Popconfirm
          title={`撤销全部 ${unplannedCount} 条计划外出库？`}
          description="将恢复对应库存，计划内记录不受影响。"
          onConfirm={() => onRevokeUnplanned()}
        >
          <Button danger size="small">
            撤销全部计划外 ({unplannedCount})
          </Button>
        </Popconfirm>
      ) : null}
      {canRevoke && onBulkRevoke && selectedRowKeys.length > 0 ? (
        <Popconfirm
          title={`撤销选中的 ${selectedRowKeys.length} 条出库？`}
          onConfirm={async () => {
            await onBulkRevoke(selectedRowKeys);
            setSelectedRowKeys([]);
          }}
        >
          <Button danger size="small">
            撤销选中 ({selectedRowKeys.length})
          </Button>
        </Popconfirm>
      ) : null}
      {extra}
    </Space>
  );

  return (
    <ProCard
      title={`出库明细（${outboundRows.length} 件）`}
      bordered
      extra={bulkExtra}
    >
      <Space style={{ marginBottom: 12, width: '100%' }} direction="vertical">
        <Input.Search
          placeholder="搜索卷号 / 品名 / 扫码人"
          allowClear
          onSearch={setKeyword}
          onChange={(e) => !e.target.value && setKeyword('')}
          style={{ maxWidth: 360 }}
        />
        {canRevoke && onBulkRevoke ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            可勾选多条后批量撤销；计划外卷号可一键全部撤销
          </Text>
        ) : null}
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={outboundRows}
        columns={columns}
        rowSelection={
          canRevoke && onBulkRevoke
            ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as number[]),
              }
            : undefined
        }
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        size="middle"
        scroll={{ x: 1200 }}
        className="wh-outbound-log-table"
        locale={{ emptyText: '暂无出库记录，请前往出库作业扫码或挑选卷号' }}
      />
    </ProCard>
  );
};

export default OutboundScanTable;
