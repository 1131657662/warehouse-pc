import { DeleteOutlined, EditOutlined, PlusOutlined, StarOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import {
  createReportConfig,
  deleteReportConfig,
  getReportConfigList,
  setDefaultReportConfig,
  updateReportConfig,
  type ReportConfigItem,
} from '@/services/reportConfig';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import { useMemo, useRef, useState } from 'react';
import type { ActionType } from '@ant-design/pro-components';

const exportTypeMap = {
  preview: { label: '预览页', color: 'blue' as const },
  pdf: { label: '直接PDF', color: 'purple' as const },
};

const ReportConfigs: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message } = App.useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ReportConfigItem | null>(null);

  const handleSubmit = async (values: {
    name: string;
    report_url: string;
    template_id: string;
    description?: string;
    export_type: 'preview' | 'pdf';
  }) => {
    const body = {
      name: values.name,
      report_url: values.report_url,
      template_id: values.template_id,
      description: values.description,
      export_type: values.export_type,
    };
    const res = editRecord
      ? await updateReportConfig(editRecord.id, body)
      : await createReportConfig(body);
    if (res.success) {
      message.success(editRecord ? '保存成功' : '新增成功');
      setEditOpen(false);
      setEditRecord(null);
      actionRef.current?.reload();
    } else {
      message.error(res.errorMessage || '操作失败');
    }
    return res.success;
  };

  const columns: ProColumns<ReportConfigItem>[] = useMemo(
    () => [
      { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
      { title: '服务地址', dataIndex: 'report_url', ellipsis: true },
      { title: '模板 ID', dataIndex: 'template_id', width: 200, ellipsis: true },
      {
        title: '打开方式',
        dataIndex: 'export_type',
        width: 100,
        render: (_, r) => {
          const m = exportTypeMap[r.export_type] || exportTypeMap.preview;
          return <Tag color={m.color}>{m.label}</Tag>;
        },
      },
      {
        title: '默认',
        dataIndex: 'is_default',
        width: 80,
        render: (_, r) =>
          r.is_default ? <Tag color="success">默认</Tag> : <span style={{ color: '#999' }}>—</span>,
      },
      {
        title: '备注',
        dataIndex: 'description',
        ellipsis: true,
        render: (_, r) => r.description || '—',
      },
      {
        title: '操作',
        valueType: 'option',
        width: 220,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditRecord(record);
                setEditOpen(true);
              }}
            >
              编辑
            </Button>
            {!record.is_default ? (
              <Button
                type="link"
                size="small"
                icon={<StarOutlined />}
                onClick={async () => {
                  const res = await setDefaultReportConfig(record.id);
                  if (res.success) {
                    message.success('已设为默认');
                    actionRef.current?.reload();
                  } else {
                    message.error(res.errorMessage || '操作失败');
                  }
                }}
              >
                设为默认
              </Button>
            ) : null}
            <Popconfirm
              title="确认删除该配置？"
              onConfirm={async () => {
                const res = await deleteReportConfig(record.id);
                if (res.success) {
                  message.success('已删除');
                  actionRef.current?.reload();
                } else {
                  message.error(res.errorMessage || '删除失败');
                }
              }}
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [message],
  );

  return (
    <AppPageContainer>
      <ProTable<ReportConfigItem>
        headerTitle="报表配置"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditRecord(null);
              setEditOpen(true);
            }}
          >
            新增配置
          </Button>,
        ]}
        request={async () => {
          const res = await getReportConfigList();
          if (!res.success) {
            message.error(res.errorMessage || '加载失败');
            return { data: [], success: false, total: 0 };
          }
          return {
            data: res.data?.list || [],
            success: true,
            total: res.data?.total || 0,
          };
        }}
      />
      <div style={{ marginTop: 8, color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
        打印订单时将使用标记为「默认」的配置；URL 参数为 order_no（与积木 SQL 中 order_no 参数一致）。
      </div>

      <ModalForm
        title={editRecord ? '编辑报表配置' : '新增报表配置'}
        open={editOpen}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => {
            setEditOpen(false);
            setEditRecord(null);
          },
        }}
        initialValues={
          editRecord
            ? {
                name: editRecord.name,
                report_url: editRecord.report_url,
                template_id: editRecord.template_id,
                description: editRecord.description,
                export_type: editRecord.export_type,
              }
            : { export_type: 'preview' }
        }
        onFinish={handleSubmit}
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入名称' }]}
          placeholder="如：出库单-本地开发"
        />
        <ProFormText
          name="report_url"
          label="服务地址"
          rules={[
            { required: true, message: '请输入服务地址' },
            { type: 'url', message: '请输入有效的 http/https 地址' },
          ]}
          placeholder="http://localhost:8085"
          extra="不要带末尾斜杠；不要包含 /jmreport/view 路径"
        />
        <ProFormText
          name="template_id"
          label="模板 ID"
          rules={[{ required: true, message: '请输入模板 ID' }]}
          placeholder="1221764783561125888"
        />
        <ProFormRadio.Group
          name="export_type"
          label="打开方式"
          options={[
            { label: '预览页（浏览器内查看/打印）', value: 'preview' },
            { label: '直接导出 PDF', value: 'pdf' },
          ]}
        />
        <ProFormTextArea name="description" label="备注" fieldProps={{ rows: 2 }} />
      </ModalForm>
    </AppPageContainer>
  );
};

export default ReportConfigs;
