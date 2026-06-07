import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import AppPageContainer from '@/components/AppPageContainer';
import { history } from '@umijs/max';
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
import { getCustomerList } from '@/services/customers';
import { getImportReports, importInventory } from '@/services/inventory';
import {
  IMPORT_FIELD_ALIASES,
  pickImportField,
} from '@/utils/inventoryImportParse';
import { downloadAuthenticatedFile } from '@/utils/scanLogs';

const { Dragger } = Upload;
const { Text, Title } = Typography;

/** 每批提交行数，避免请求体过大与超时 */
const IMPORT_CHUNK_SIZE = 500;

// Excel 模板列头
const TEMPLATE_HEADERS = ['客户编码', '客户名称', '品名', '克重', '规格', '卷号', '件重(kg)', '件数', '破损', '备注'];

interface ParsedRow {
  key: number;
  row: number;
  customer_code: string;
  customer_name: string;
  product_name: string;
  weight: number | null;
  piece_weight: number | null;
  specification: string;
  roll_number: string;
  quantity: number;
  damaged: string;
  remark: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

const ImportPage: React.FC = () => {
  const { message: msg } = App.useApp();

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // 客户列表（用于校验客户编码+名称是否存在 + ID 映射）
  const [customerCodeMap, setCustomerCodeMap] = useState<Map<string, { id: number; name: string }>>(new Map());
  const [customerNameMap, setCustomerNameMap] = useState<Map<string, { id: number; code: string }>>(new Map());
  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) {
        const codeMap = new Map<string, { id: number; name: string }>();
        const nameMap = new Map<string, { id: number; code: string }>();
        for (const c of res.data?.list || []) {
          if (c.code) codeMap.set(c.code, { id: c.id, name: c.name });
          nameMap.set(c.name, { id: c.id, code: c.code || '' });
        }
        setCustomerCodeMap(codeMap);
        setCustomerNameMap(nameMap);
      }
    });
  }, []);

  // 导入结果
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    total: number;
    successCount: number;
    skipCount: number;
    failCount: number;
    skipDetails: { row: number; roll_number: string; reason: string }[];
    failDetails: { row: number; reason: string }[];
    reportId?: number | null;
  } | null>(null);

  const [recentReports, setRecentReports] = useState<API.ImportReportItem[]>([]);

  const loadRecentReports = () => {
    getImportReports({ current: 1, pageSize: 10 }).then((res) => {
      if (res.success) setRecentReports(res.data?.list || []);
    });
  };

  useEffect(() => {
    loadRecentReports();
  }, []);

  // 统计
  const okCount = rows.filter((r) => r.status === 'ok').length;
  const warningCount = rows.filter((r) => r.status === 'warning').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;

  // 下载模板
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    // 设置列宽
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '库存导入模板');
    XLSX.writeFile(wb, '库存导入模板.xlsx');
  };

  // 校验单行
  const validateRow = (
    index: number,
    row: Record<string, string>,
    seenRollNumbers: Map<string, number>,
    codeMap: Map<string, { id: number; name: string }>,
    nameMap: Map<string, { id: number; code: string }>,
  ): ParsedRow => {
    const str = (aliases: readonly string[], def = '') =>
      pickImportField(row, [...aliases]) || def;

    const roll = str(IMPORT_FIELD_ALIASES.roll_number);
    const productName = str(IMPORT_FIELD_ALIASES.product_name);
    const customerCode = str(IMPORT_FIELD_ALIASES.customer_code);
    const customerName = str(IMPORT_FIELD_ALIASES.customer_name);
    const weightStr = str(IMPORT_FIELD_ALIASES.weight);
    const pieceWeightStr = str(IMPORT_FIELD_ALIASES.piece_weight);
    const qtyStr = str(IMPORT_FIELD_ALIASES.quantity, '1');
    const damagedStr = str(IMPORT_FIELD_ALIASES.damaged);

    const pieceWeight = pieceWeightStr ? parseFloat(pieceWeightStr) : null;

    const base = {
      key: index,
      row: index + 2,
      customer_code: customerCode,
      product_name: productName,
      weight: null as number | null,
      piece_weight: pieceWeight,
      specification: str(IMPORT_FIELD_ALIASES.specification),
      roll_number: roll,
      quantity: parseInt(qtyStr) || 1,
      damaged: damagedStr,
      remark: str(IMPORT_FIELD_ALIASES.remark),
    };

    // ❌ 品名为空
    if (!productName) {
      return { ...base, customer_name: customerName, status: 'error' as const, message: '品名不能为空' };
    }

    // ❌ 卷号为空
    if (!roll) {
      return { ...base, customer_name: customerName, status: 'error' as const, message: '卷号不能为空' };
    }

    // ❌ 文件内卷号重复
    if (seenRollNumbers.has(roll)) {
      return { ...base, customer_name: customerName, status: 'error' as const, message: `文件内卷号重复（与第${seenRollNumbers.get(roll)}行冲突）` };
    }
    seenRollNumbers.set(roll, index + 2);

    // ❌ 客户名称为空
    if (!customerName) {
      return { ...base, customer_name: customerName, status: 'error' as const, message: '客户名称不能为空' };
    }

    // ❌ 客户名称不存在
    const nameEntry = nameMap.get(customerName);
    if (!nameEntry) {
      return { ...base, customer_name: customerName, status: 'error' as const, message: '客户名称不存在' };
    }

    // 如果填了客户编码，需校验编码存在且与名称匹配
    if (customerCode) {
      const codeEntry = codeMap.get(customerCode);
      if (!codeEntry) {
        return { ...base, customer_name: customerName, status: 'error' as const, message: '客户编码不存在' };
      }
      if (codeEntry.id !== nameEntry.id) {
        return { ...base, customer_name: customerName, status: 'error' as const, message: `客户编码与名称不匹配（编码对应"${codeEntry.name}"，名称对应编码"${nameEntry.code || '无'}"）` };
      }
    }

    // ⚠️ 克重为空（警告但可导入）
    const weight = weightStr ? parseFloat(weightStr) : null;
    if (!weightStr) {
      return { ...base, customer_name: customerName, status: 'warning' as const, message: '缺克重（可导入）', weight: null };
    }

    return { ...base, customer_name: customerName, weight, status: 'ok' as const, message: '' };
  };

  // 解析文件
  const handleFileParse = (file: File) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          msg.error('文件中未找到工作表，请确认文件格式正确');
          setRows([]);
          return;
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        });

        if (jsonData.length === 0) {
          msg.warning('文件为空或无法解析');
          setRows([]);
          return;
        }

        const seenRollNumbers = new Map<string, number>();
        const parsed = jsonData.map((row, i) =>
          validateRow(i, row, seenRollNumbers, customerCodeMap, customerNameMap),
        );
        setRows(parsed);
        msg.success(`成功解析 ${parsed.length} 条数据`);
      } catch (err: any) {
        console.error('文件解析失败:', err);
        msg.error('文件解析失败：' + (err?.message || '请检查文件格式，确认使用下载的模板'));
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止 Upload 自动上传
  };

  // 确认导入（分批提交，支持万级行数）
  const handleImport = async () => {
    const toImport = rows.filter((r) => r.status !== 'error');
    if (toImport.length === 0) return;

    setImporting(true);
    setImportProgress('');
    try {
      const payload = toImport.map((r) => ({
        row: r.row,
        status: r.status,
        customer_id:
          customerNameMap.get(r.customer_name)?.id
          || customerCodeMap.get(r.customer_code)?.id
          || 0,
        product_name: r.product_name,
        weight: r.weight,
        piece_weight: r.piece_weight,
        specification: r.specification,
        roll_number: r.roll_number,
        quantity: r.quantity,
        damaged: r.damaged,
        remark: r.remark,
      }));

      let successCount = 0;
      let skipCount = 0;
      const allErrors: { row?: number; roll_number?: string; message?: string }[] = [];
      const totalChunks = Math.ceil(payload.length / IMPORT_CHUNK_SIZE);
      const batchKey = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let reportId: number | null = null;

      for (let i = 0; i < payload.length; i += IMPORT_CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / IMPORT_CHUNK_SIZE) + 1;
        setImportProgress(`正在导入第 ${chunkIndex}/${totalChunks} 批…`);
        const chunk = payload.slice(i, i + IMPORT_CHUNK_SIZE);
        const res = await importInventory(chunk, {
          skipErrorHandler: true,
          timeout: 180000,
          batchKey,
          fileName: file?.name || '',
          batchFinal: chunkIndex === totalChunks,
        });

        if (!res.success || !res.data) {
          const errMsg = res.errorMessage || `第 ${chunkIndex} 批导入失败`;
          msg.error(errMsg);
          return;
        }

        successCount += res.data.successCount;
        skipCount += res.data.skipCount;
        allErrors.push(...(res.data.errors || []));
        if (res.data.reportId) reportId = res.data.reportId;
      }

      const skipDetails = allErrors
        .filter((e) => e.message === '卷号已存在')
        .map((e) => ({
          row: e.row || 0,
          roll_number: e.roll_number || '',
          reason: e.message || '',
        }));
      const failDetails = allErrors
        .filter((e) => e.message !== '卷号已存在')
        .map((e) => ({ row: e.row || 0, reason: e.message || '未知错误' }));

      setResultData({
        total: successCount + allErrors.length,
        successCount,
        skipCount,
        failCount: allErrors.length - skipCount,
        skipDetails,
        failDetails,
        reportId,
      });
      setResultOpen(true);
      loadRecentReports();
      msg.success(`导入完成：成功 ${successCount} 条`);
    } catch (err: unknown) {
      const apiMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { errorMessage?: string } } }).response?.data?.errorMessage
          : undefined;
      msg.error(apiMsg || (err instanceof Error ? err.message : '导入请求失败，请重试'));
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  const handleDownloadReport = async (reportId?: number | null) => {
    const id = reportId ?? resultData?.reportId;
    if (!id) {
      handleDownloadErrors();
      return;
    }
    try {
      await downloadAuthenticatedFile(
        `/api/inventory/import-reports/${id}/download`,
        `导入报告_${id}.xlsx`,
      );
    } catch (e) {
      msg.error(e instanceof Error ? e.message : '下载失败');
    }
  };

  // 下载失败明细（本地兜底）
  const handleDownloadErrors = () => {
    if (!resultData) return;
    const errorRows = [
      ['行号', '卷号', '原因'],
      ...resultData.skipDetails.map((d) => [String(d.row), d.roll_number, d.reason]),
      ...resultData.failDetails.map((d) => [String(d.row), '', d.reason]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入失败明细');
    XLSX.writeFile(wb, '导入失败明细.xlsx');
  };

  // 预览表格列定义
  const columns: ColumnsType<ParsedRow> = [
    { title: '行', dataIndex: 'row', width: 60 },
    { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => {
      if (s === 'ok') return <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>;
      if (s === 'warning') return <Tag icon={<ExclamationCircleOutlined />} color="warning">警告</Tag>;
      return <Tag icon={<CloseCircleOutlined />} color="error">错误</Tag>;
    }},
    { title: '客户编码', dataIndex: 'customer_code', width: 100 },
    { title: '客户', dataIndex: 'customer_name', width: 120 },
    { title: '品名', dataIndex: 'product_name', width: 120 },
    { title: '克重', dataIndex: 'weight', width: 80, render: (v: number | null) => v ?? '-' },
    { title: '规格', dataIndex: 'specification', width: 100 },
    { title: '卷号', dataIndex: 'roll_number', width: 130 },
    { title: '件重(kg)', dataIndex: 'piece_weight', width: 90, render: (v: number | null) => v != null ? v : '-' },
    { title: '件数', dataIndex: 'quantity', width: 60 },
    { title: '破损', dataIndex: 'damaged', width: 60 },
    { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true },
    { title: '说明', dataIndex: 'message', width: 200, render: (m: string, r) => {
      if (!m) return '-';
      return <Text type={r.status === 'error' ? 'danger' : 'warning'}>{m}</Text>;
    }},
  ];

  return (
    <AppPageContainer>
      {/* ① 下载模板 */}
      <div style={{ marginBottom: 16 }}>
        <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
          下载 Excel 模板
        </Button>
      </div>

      {/* ② 上传文件 */}
      <div style={{ marginBottom: 24 }} className="wh-import-dragger">
        <Dragger
          accept=".xlsx,.csv"
          maxCount={1}
          beforeUpload={handleFileParse}
          onRemove={() => {
            setFile(null);
            setRows([]);
          }}
          fileList={file ? [{ uid: '-1', name: file.name, status: 'done' }] : []}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .csv；卷号列请命名为「卷号」（也兼容：条码、卷筒号）。请使用上方模板，首行为表头
          </p>
        </Dragger>
      </div>

      {/* ③ 数据预览 */}
      {rows.length > 0 && (
        <>
          <Table
            rowKey="key"
            dataSource={rows}
            columns={columns}
            scroll={{ x: 1300 }}
            size="small"
            className="wh-outbound-log-table"
            pagination={{
              pageSize: 50,
              defaultPageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [20, 50, 100, 200],
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />

          {/* ④ 导入统计 */}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#fafafa',
              borderRadius: 6,
              border: '1px solid #eaeaea',
              display: 'flex',
              gap: 32,
              alignItems: 'center',
            }}
          >
            <Text>共 {rows.length} 条</Text>
            <Text style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> {okCount} 条正常
            </Text>
            <Text style={{ color: '#faad14' }}>
              <ExclamationCircleOutlined /> {warningCount} 条警告（可导入）
            </Text>
            <Text style={{ color: '#ff4d4f' }}>
              <CloseCircleOutlined /> {errorCount} 条错误（跳过）
            </Text>
            <Space style={{ marginLeft: 'auto' }} direction="vertical" align="end" size={4}>
              {importProgress ? (
                <Text type="secondary" style={{ fontSize: 13 }}>{importProgress}</Text>
              ) : null}
              <Button
                type="primary"
                loading={importing}
                disabled={okCount + warningCount === 0}
                onClick={handleImport}
              >
                确认导入（{okCount + warningCount} 条）
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* ⑤ 导入完成弹窗 */}
      <Modal
        title="导入完成"
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={[
          resultData && (
            <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownloadReport()}>
              {resultData.reportId ? '下载完整报告' : '下载失败明细 Excel'}
            </Button>
          ),
          <Button key="close" type="primary" onClick={() => setResultOpen(false)}>
            关闭
          </Button>,
        ]}
        width={560}
      >
        {resultData && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> 成功导入：<Text strong>{resultData.successCount}</Text> 条</Text>
            </div>
            <div>
              <Text>⏭️ 跳过（已存在）：<Text strong style={{ color: '#faad14' }}>{resultData.skipCount}</Text> 条</Text>
            </div>
            <div>
              <Text><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 失败（验证不通过）：<Text strong style={{ color: '#ff4d4f' }}>{resultData.failCount}</Text> 条</Text>
            </div>

            {resultData.skipDetails.length > 0 && (
              <div>
                <Text type="secondary">跳过详情（卷号已存在）：</Text>
                {resultData.skipDetails.slice(0, 10).map((d, i) => (
                  <div key={i} style={{ fontSize: 13, marginLeft: 12 }}>
                    第 {d.row} 行：卷号 {d.roll_number} {d.reason}
                  </div>
                ))}
                {resultData.skipDetails.length > 10 && (
                  <Text type="secondary">...还有 {resultData.skipDetails.length - 10} 条</Text>
                )}
              </div>
            )}

            {resultData.failDetails.length > 0 && (
              <div>
                <Text type="secondary">失败详情：</Text>
                {resultData.failDetails.slice(0, 10).map((d, i) => (
                  <div key={i} style={{ fontSize: 13, marginLeft: 12, color: '#ff4d4f' }}>
                    第 {d.row} 行：{d.reason}
                  </div>
                ))}
                {resultData.failDetails.length > 10 && (
                  <Text type="secondary">...还有 {resultData.failDetails.length - 10} 条</Text>
                )}
              </div>
            )}
          </Space>
        )}
      </Modal>

      {recentReports.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Title level={5}>最近导入报告</Title>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={recentReports}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 60 },
              { title: '文件', dataIndex: 'file_name', ellipsis: true },
              { title: '成功', dataIndex: 'success_count', width: 70 },
              { title: '跳过', dataIndex: 'skip_count', width: 70 },
              { title: '失败', dataIndex: 'fail_count', width: 70 },
              { title: '操作人', dataIndex: 'created_by_name', width: 90 },
              { title: '时间', dataIndex: 'created_at', width: 160 },
              {
                title: '操作',
                width: 90,
                render: (_, r) => (
                  <Button type="link" size="small" onClick={() => handleDownloadReport(r.id)}>
                    下载
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}
    </AppPageContainer>
  );
};

export default ImportPage;
