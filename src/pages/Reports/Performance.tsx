import { DownloadOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import { Button, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef } from 'react';
import { getPerformanceReport, type PerformanceRow } from '@/services/reports';
import { useProTableResize } from '@/utils/proTableConfig';

const { Text } = Typography;

function downloadCsv(rows: PerformanceRow[]) {
  const header = ['姓名', '手机号', '角色', '扫码件数', '参与订单数', '出库吨位', '完成订单数'];
  const lines = rows.map((r) => [
    r.user_name,
    r.phone,
    r.role === 'admin' ? '管理员' : '仓管员',
    r.scan_count,
    r.order_count,
    r.scan_tons,
    r.completed_orders,
  ]);
  const csv = [header, ...lines].map((line) => line.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `业绩统计_${dayjs().format('YYYYMMDD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PerformanceReport: React.FC = () => {
  const lastRows = useRef<PerformanceRow[]>([]);

  const baseColumns: ProColumns<PerformanceRow>[] = useMemo(() => [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索姓名 / 手机号', allowClear: true },
    },
    {
      title: '角色',
      dataIndex: 'role_s',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        placeholder: '选择角色',
        allowClear: true,
        options: [
          { label: '管理员', value: 'admin' },
          { label: '仓管员', value: 'warehouse' },
        ],
      },
    },
    { title: '姓名', dataIndex: 'user_name', width: 100, ellipsis: true, hideInSearch: true },
    { title: '手机号', dataIndex: 'phone', width: 140, hideInSearch: true },
    {
      title: '角色',
      dataIndex: 'role',
      width: 80,
      hideInSearch: true,
      render: (_, r) => (r.role === 'admin' ? '管理员' : '仓管员'),
    },
    { title: '扫码件数', dataIndex: 'scan_count', width: 90, align: 'center', hideInSearch: true, sorter: (a, b) => a.scan_count - b.scan_count },
    { title: '参与订单数', dataIndex: 'order_count', width: 100, align: 'center', hideInSearch: true },
    { title: '出库吨位', dataIndex: 'scan_tons', width: 90, align: 'center', hideInSearch: true },
    { title: '创建并完成订单', dataIndex: 'completed_orders', width: 120, align: 'center', hideInSearch: true },
    {
      title: '日期范围',
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
      initialValue: [dayjs().subtract(6, 'day'), dayjs()],
    },
  ], []);

  const { columns, components, tableProps } = useProTableResize(
    'reports-performance-v1',
    baseColumns,
  );

  return (
    <AppPageContainer>
      <ProTable<PerformanceRow>
        {...tableProps}
        components={components}
        columns={columns}
        headerTitle="员工业绩统计"
        rowKey="user_id"
        toolBarRender={() => [
          <Button
            key="export"
            icon={<DownloadOutlined />}
            disabled={lastRows.current.length === 0}
            onClick={() => downloadCsv(lastRows.current)}
          >
            导出 CSV
          </Button>,
        ]}
        request={async (params) => {
          const range = params.dateRange as [string, string] | undefined;
          const res = await getPerformanceReport({
            start: range?.[0],
            end: range?.[1],
          });
          let list = res.data?.list || [];
          if (params.keyword) {
            const kw = params.keyword.toLowerCase();
            list = list.filter(
              (r) =>
                r.user_name?.toLowerCase().includes(kw) ||
                r.phone?.toLowerCase().includes(kw),
            );
          }
          if (params.role_s) {
            list = list.filter((r) => r.role === params.role_s);
          }
          lastRows.current = list;
          return { data: list, total: list.length, success: res.success };
        }}
      />
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        统计有效扫码（未撤销）件数及出库吨位；「创建并完成订单」为所选日期内由该用户创建且已完成的订单数。
      </Text>
    </AppPageContainer>
  );
};

export default PerformanceReport;
