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
import { batchUpdateInventory } from '@/services/inventory';
import {
  IMPORT_FIELD_ALIASES,
  pickImportField,
} from '@/utils/inventoryImportParse';
import {
  formatPieceWeightDisplay,
  formatSpecDisplay,
  formatWeightDisplay,
} from '@/utils/modelDisplay';
import { useClientTablePagination } from '@/utils/useClientTablePagination';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const CHUNK_SIZE = 500;

const TEMPLATE_HEADERS = [
  '客户编码',
  '卷号',
  '品名',
  '克重',
  '规格',
  '编号',
  '件重(kg)',
  '件数',
  '破损',
  '备注',
];

interface ParsedRow {
  key: number;
  row: number;
  customer_code: string;
  roll_number: string;
  product_name: string;
  weight: number | null;
  piece_weight: number | null;
  specification: string;
  code: string;
  quantity: number;
  damaged: string;
  remark: string;
  status: 'ok' | 'error';
  message: string;
}

const InventoryBatchUpdate: React.FC = () => {
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
    'inventory-batch-update-preview',
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
    XLSX.utils.book_append_sheet(wb, ws, '批量更新模板');
    XLSX.writeFile(wb, '库存批量更新模板.xlsx');
  };

  const validateRow = (
    index: number,
    row: Record<string, unknown>,
    seenKeys: Map<string, number>,
    codeMap: Map<string, { id: number; name: string }>,
  ): ParsedRow => {
    const str = (aliases: readonly string[], def = '') =>
      pickImportField(row, [...aliases]) || def;

    const customerCode = str(IMPORT_FIELD_ALIASES.customer_code);
    const roll = str(IMPORT_FIELD_ALIASES.roll_number);
    const productName = str(IMPORT_FIELD_ALIASES.product_name);
    const weightStr = str(IMPORT_FIELD_ALIASES.weight);
    const pieceWeightStr = str(IMPORT_FIELD_ALIASES.piece_weight);
    const qtyStr = str(IMPORT_FIELD_ALIASES.quantity);

    const base = {
      key: index,
      row: index + 2,
      customer_code: customerCode,
      roll_number: roll,
      product_name: productName,
      weight: weightStr ? parseFloat(weightStr) : null,
      piece_weight: pieceWeightStr ? parseFloat(pieceWeightStr) : null,
      specification: str(IMPORT_FIELD_ALIASES.specification),
      code: str(IMPORT_FIELD_ALIASES.code),
      quantity: qtyStr ? parseInt(qtyStr, 10) : 0,
      damaged: str(IMPORT_FIELD_ALIASES.damaged),
      remark: str(IMPORT_FIELD_ALIASES.remark),
    };

    if (!customerCode) {
      return { ...base, status: 'error', message: '客户编码不能为空' };
    }
    const codeEntry = codeMap.get(customerCode);
    if (!codeEntry) {
      return { ...base, status: 'error', message: '客户编码不存在' };
    }
    if (!roll) {
      return { ...base, status: 'error', message: '卷号不能为空' };
    }

    const dupKey = `${customerCode}::${roll}`;
    if (seenKeys.has(dupKey)) {
      return {
        ...base,
        status: 'error',
        message: `文件内重复（与第 ${seenKeys.get(dupKey)} 行冲突）`,
      };
    }
    seenKeys.set(dupKey, index + 2);

    if (!productName) {
      return {
        ...base,
        status: 'error',
        message: '品名不能为空（空列将清空，品名必填）',
      };
    }
    if (!qtyStr || base.quantity < 1) {
      return { ...base, status: 'error', message: '件数必须大于 0' };
    }
    if (weightStr && Number.isNaN(base.weight)) {
      return { ...base, status: 'error', message: '克重格式无效' };
    }
    if (pieceWeightStr && Number.isNaN(base.piece_weight)) {
      return { ...base, status: 'error', message: '件重格式无效' };
    }

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
    const toUpdate = rows.filter((r) => r.status === 'ok');
    if (toUpdate.length === 0) return;

    setSubmitting(true);
    setProgress('');
    try {
      const payload = toUpdate.map((r) => ({
        row: r.row,
        status: r.status,
        customer_id: customerCodeMap.get(r.customer_code)?.id || 0,
        product_name: r.product_name,
        weight: r.weight,
        piece_weight: r.piece_weight,
        specification: r.specification,
        roll_number: r.roll_number,
        code: r.code,
        quantity: r.quantity,
        damaged: r.damaged,
        remark: r.remark,
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
        setProgress(`正在更新第 ${chunkIndex}/${totalChunks} 批…`);
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const res = await batchUpdateInventory(chunk, {
          skipErrorHandler: true,
          timeout: 180000,
        });
        if (!res.success || !res.data) {
          msg.error(res.errorMessage || `第 ${chunkIndex} 批更新失败`);
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
      msg.success(`更新完成：成功 ${successCount} 条`);
    } catch (err: unknown) {
      msg.error(err instanceof Error ? err.message : '更新请求失败');
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
    XLSX.utils.book_append_sheet(wb, ws, '更新失败明细');
    XLSX.writeFile(wb, '批量更新失败明细.xlsx');
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
            可更新
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            错误
          </Tag>
        ),
    },
    { title: '客户编码', dataIndex: 'customer_code', width: 100 },
    { title: '卷号', dataIndex: 'roll_number', width: 120 },
    { title: '品名', dataIndex: 'product_name', width: 100 },
    {
      title: '克重',
      dataIndex: 'weight',
      width: 80,
      render: (v: number | null) => formatWeightDisplay(v),
    },
    {
      title: '规格',
      dataIndex: 'specification',
      width: 80,
      render: (v: string) => formatSpecDisplay(v),
    },
    { title: '编号', dataIndex: 'code', width: 80 },
    {
      title: '件重',
      dataIndex: 'piece_weight',
      width: 90,
      render: (v: number | null) => formatPieceWeightDisplay(v),
    },
    { title: '件数', dataIndex: 'quantity', width: 60 },
    { title: '破损', dataIndex: 'damaged', width: 80 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '说明', dataIndex: 'message', ellipsis: true },
  ];

  return (
    <AppPageContainer title="批量更新库存">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={5}>使用说明</Title>
          <Text type="secondary">
            按「客户编码 + 卷号」匹配在库卷（件数 &gt; 0），覆盖更新 Excel
            中的字段；空列会清空对应字段（品名、件数除外）。已被订单占用的卷不可修改；已出库卷不会匹配。
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
                共 {rows.length} 条，可更新 {okCount} 条，错误 {errorCount} 条
              </Text>
              <Button
                type="primary"
                disabled={okCount === 0 || submitting}
                loading={submitting}
                onClick={handleSubmit}
              >
                {submitting ? progress || '更新中…' : `确认更新 (${okCount})`}
              </Button>
            </Space>
            <Table
              size="small"
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1200, y: 480 }}
              pagination={previewPagination}
            />
          </>
        )}
      </Space>

      <Modal
        title="批量更新结果"
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

export default InventoryBatchUpdate;
