import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import AppPageContainer from '@/components/AppPageContainer';
import { getCustomerList } from '@/services/customers';
import { batchChangeInventoryCustomer } from '@/services/inventory';
import {
  BATCH_CHANGE_CUSTOMER_ALIASES,
  pickImportField,
} from '@/utils/inventoryImportParse';
import { useClientTablePagination } from '@/utils/useClientTablePagination';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const CHUNK_SIZE = 500;

const TEMPLATE_HEADERS = ['原客户编码', '卷号', '新客户编码'];

interface ParsedRow {
  key: number;
  row: number;
  original_customer_code: string;
  new_customer_code: string;
  roll_number: string;
  status: 'ok' | 'error';
  message: string;
}

const InventoryBatchChangeCustomer: React.FC = () => {
  const { message: msg } = App.useApp();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [customerCodeMap, setCustomerCodeMap] = useState<
    Map<string, { id: number; name: string }>
  >(new Map());

  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    successCount: number;
    failCount: number;
    failDetails: { row: number; roll_number: string; reason: string }[];
  } | null>(null);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (!res.success) return;
      const codeMap = new Map<string, { id: number; name: string }>();
      for (const c of res.data?.list || []) {
        if (c.code) codeMap.set(c.code, { id: c.id, name: c.name });
      }
      setCustomerCodeMap(codeMap);
    });
  }, []);

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;

  const { pagination: previewPagination } = useClientTablePagination(
    'inventory-batch-change-customer-preview',
    {
      defaultPageSize: 50,
      pageSizeOptions: [20, 50, 100, 200],
      resetDeps: [rows],
    },
  );

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '批量改客户模板');
    XLSX.writeFile(wb, '库存批量改客户模板.xlsx');
  };

  const validateRow = (
    index: number,
    row: Record<string, unknown>,
    seenKeys: Map<string, number>,
    codeMap: Map<string, { id: number; name: string }>,
  ): ParsedRow => {
    const origCode = pickImportField(row, [
      ...BATCH_CHANGE_CUSTOMER_ALIASES.original_customer_code,
    ]);
    const newCode = pickImportField(row, [
      ...BATCH_CHANGE_CUSTOMER_ALIASES.new_customer_code,
    ]);
    const roll = pickImportField(row, [
      ...BATCH_CHANGE_CUSTOMER_ALIASES.roll_number,
    ]);

    const base = {
      key: index,
      row: index + 2,
      original_customer_code: origCode,
      new_customer_code: newCode,
      roll_number: roll,
    };

    if (!origCode) {
      return { ...base, status: 'error', message: '原客户编码不能为空' };
    }
    if (!codeMap.get(origCode)) {
      return { ...base, status: 'error', message: '原客户编码不存在' };
    }
    if (!roll) {
      return { ...base, status: 'error', message: '卷号不能为空' };
    }
    if (!newCode) {
      return { ...base, status: 'error', message: '新客户编码不能为空' };
    }
    if (!codeMap.get(newCode)) {
      return { ...base, status: 'error', message: '新客户编码不存在' };
    }
    if (origCode === newCode) {
      return { ...base, status: 'error', message: '新客户与原客户相同' };
    }

    const dupKey = `${origCode}::${roll}`;
    if (seenKeys.has(dupKey)) {
      return {
        ...base,
        status: 'error',
        message: `文件内重复（与第 ${seenKeys.get(dupKey)} 行冲突）`,
      };
    }
    seenKeys.set(dupKey, index + 2);

    return { ...base, status: 'ok', message: '' };
  };

  const handleFileParse = (uploadFile: File) => {
    setFile(uploadFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          sheet,
          {
            defval: '',
            raw: false,
          },
        );
        if (jsonData.length === 0) {
          msg.warning('文件为空');
          setRows([]);
          return;
        }
        const seenKeys = new Map<string, number>();
        const parsed = jsonData.map((row, i) =>
          validateRow(i, row, seenKeys, customerCodeMap),
        );
        setRows(parsed);
        msg.success(`成功解析 ${parsed.length} 条数据`);
      } catch (err: unknown) {
        msg.error(err instanceof Error ? err.message : '文件解析失败');
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(uploadFile);
    return false;
  };

  const handleSubmit = async () => {
    const toChange = rows.filter((r) => r.status === 'ok');
    if (toChange.length === 0) return;

    setSubmitting(true);
    setProgress('');
    try {
      const payload = toChange.map((r) => ({
        row: r.row,
        status: r.status,
        customer_id: customerCodeMap.get(r.original_customer_code)?.id || 0,
        new_customer_id: customerCodeMap.get(r.new_customer_code)?.id || 0,
        roll_number: r.roll_number,
      }));

      let successCount = 0;
      const allFails: {
        row?: number;
        roll_number?: string;
        message?: string;
      }[] = [];
      const totalChunks = Math.ceil(payload.length / CHUNK_SIZE);

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        setProgress(`正在修改第 ${chunkIndex}/${totalChunks} 批…`);
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const res = await batchChangeInventoryCustomer(chunk, {
          skipErrorHandler: true,
          timeout: 180000,
        });
        if (!res.success || !res.data) {
          msg.error(res.errorMessage || `第 ${chunkIndex} 批修改失败`);
          return;
        }
        successCount += res.data.successCount;
        allFails.push(...(res.data.failRows || []));
      }

      setResultData({
        successCount,
        failCount: allFails.length,
        failDetails: allFails.map((e) => ({
          row: e.row || 0,
          roll_number: e.roll_number || '',
          reason: e.message || '未知错误',
        })),
      });
      setResultOpen(true);
      msg.success(`修改完成：成功 ${successCount} 条`);
    } catch (err: unknown) {
      msg.error(err instanceof Error ? err.message : '修改请求失败');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const handleDownloadErrors = () => {
    if (!resultData) return;
    const errorRows = [
      ['行号', '卷号', '原因'],
      ...resultData.failDetails.map((d) => [
        String(d.row),
        d.roll_number,
        d.reason,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '修改失败明细');
    XLSX.writeFile(wb, '批量改客户失败明细.xlsx');
  };

  const columns: ColumnsType<ParsedRow> = [
    { title: '行', dataIndex: 'row', width: 60 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) =>
        s === 'ok' ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            可修改
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            错误
          </Tag>
        ),
    },
    { title: '原客户编码', dataIndex: 'original_customer_code', width: 120 },
    { title: '卷号', dataIndex: 'roll_number', width: 140 },
    { title: '新客户编码', dataIndex: 'new_customer_code', width: 120 },
    { title: '说明', dataIndex: 'message', ellipsis: true },
  ];

  return (
    <AppPageContainer title="批量修改客户">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={5}>使用说明</Title>
          <Text type="secondary">
            按「原客户编码 +
            卷号」定位在库卷，将客户改为「新客户编码」。仅匹配在库卷（件数 &gt;
            0）；已出库不参与匹配。已被订单占用的卷不可修改。成功后自动重算涉及客户的型号汇总。
          </Text>
        </div>

        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
        </Space>

        <Dragger
          accept=".xlsx,.xls,.csv"
          maxCount={1}
          beforeUpload={handleFileParse}
          onRemove={() => {
            setFile(null);
            setRows([]);
          }}
          fileList={
            file ? [{ uid: '-1', name: file.name, status: 'done' }] : []
          }
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 Excel 文件到此处</p>
        </Dragger>

        {rows.length > 0 && (
          <>
            <Space>
              <Text>
                共 {rows.length} 条，可修改 {okCount} 条，错误 {errorCount} 条
              </Text>
              <Button
                type="primary"
                disabled={okCount === 0 || submitting}
                loading={submitting}
                onClick={handleSubmit}
              >
                {submitting ? progress || '修改中…' : `确认修改 (${okCount})`}
              </Button>
            </Space>
            <Table
              size="small"
              columns={columns}
              dataSource={rows}
              scroll={{ x: 800, y: 480 }}
              pagination={previewPagination}
            />
          </>
        )}
      </Space>

      <Modal
        title="批量改客户结果"
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={[
          resultData && resultData.failCount > 0 ? (
            <Button key="dl" onClick={handleDownloadErrors}>
              下载失败明细
            </Button>
          ) : null,
          <Button key="ok" type="primary" onClick={() => setResultOpen(false)}>
            确定
          </Button>,
        ]}
      >
        {resultData && (
          <Space direction="vertical">
            <Text>成功：{resultData.successCount} 条</Text>
            <Text type={resultData.failCount > 0 ? 'danger' : undefined}>
              失败：{resultData.failCount} 条
            </Text>
          </Space>
        )}
      </Modal>
    </AppPageContainer>
  );
};

export default InventoryBatchChangeCustomer;
