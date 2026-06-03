import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, ProFormText, ProTable } from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import { useAccess } from '@umijs/max';
import { App, Button, Popconfirm, Space, Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';
import {
  createCustomer,
  deleteCustomer,
  getCustomerList,
  updateCustomer,
} from '@/services/customers';
import { useProTableResize } from '@/utils/proTableConfig';

type CustomerItem = API.CustomerItem;

const Customers: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message } = App.useApp();
  const access = useAccess();
  const canManageCustomers = access.isAdmin;

  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CustomerItem | null>(null);

  const handleSubmit = async (values: any) => {
    if (editRecord) {
      const res = await updateCustomer(editRecord.id, values);
      if (res.success) {
        message.success('编辑成功');
        setEditOpen(false);
        actionRef.current?.reload();
      } else {
        message.error(res.errorMessage || '编辑失败');
      }
    } else {
      const res = await createCustomer(values);
      if (res.success) {
        message.success('新增成功');
        setEditOpen(false);
        actionRef.current?.reload();
      } else {
        message.error(res.errorMessage || '新增失败');
      }
    }
    return true;
  };

  const baseColumns: ProColumns<CustomerItem>[] = useMemo(() => [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索客户名称 / 联系人 / 电话', allowClear: true },
    },
    {
      title: '客户编码',
      dataIndex: 'code',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      render: (_, r) => r.code || '-',
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      width: 80,
      hideInSearch: true,
      render: (_, r) => r.contact || '-',
    },
    {
      title: '电话',
      dataIndex: 'phone',
      width: 130,
      hideInSearch: true,
      render: (_, r) => r.phone || '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      render: (_, r) => r.address || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 150,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManageCustomers ? (
            <>
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
              <Popconfirm
                title="确认删除该客户？"
                onConfirm={async () => {
                  try {
                    const res = await deleteCustomer(record.id);
                    if (res.success) {
                      message.success('删除成功');
                      actionRef.current?.reload();
                    } else {
                      message.error(res.errorMessage || '删除失败');
                    }
                  } catch {
                    message.error('删除失败，请确认是否有管理员权限');
                  }
                }}
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          )}
        </Space>
      ),
    },
  ], [canManageCustomers, message]);

  const { columns, components, tableProps } = useProTableResize(
    'customers-table-v2',
    baseColumns,
  );

  return (
    <AppPageContainer>
      <ProTable<CustomerItem>
        {...tableProps}
        components={components}
        columns={columns}
        headerTitle="客户列表"
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          try {
            const res = await getCustomerList({
              keyword: params.keyword,
              current: params.current,
              pageSize: params.pageSize,
            });
            if (res.success && res.data) {
              return {
                data: res.data.list || [],
                total: res.data.total || 0,
                success: true,
              };
            }
            return { data: [], total: 0, success: false };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() =>
          canManageCustomers
            ? [
                <Button
                  key="add"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditRecord(null);
                    setEditOpen(true);
                  }}
                >
                  新增客户
                </Button>,
              ]
            : []
        }
      />

      <ModalForm
        title={editRecord ? '编辑客户' : '新增客户'}
        open={editOpen}
        onOpenChange={setEditOpen}
        width={480}
        initialValues={editRecord ? { ...editRecord } : {}}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="name"
          label="客户名称"
          placeholder="请输入客户名称"
          rules={[{ required: true, message: '请输入客户名称' }]}
        />
        <ProFormText name="contact" label="联系人" placeholder="请输入联系人" />
        <ProFormText name="phone" label="电话" placeholder="请输入电话" />
        <ProFormText name="address" label="地址" placeholder="请输入地址" />
      </ModalForm>
    </AppPageContainer>
  );
};

export default Customers;
