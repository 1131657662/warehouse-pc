import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { App, Button, Card, Popconfirm, Space, Tabs, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import AppPageContainer from '@/components/AppPageContainer';
import {
  createUser,
  deleteUser,
  getUserList,
  updateUser,
} from '@/services/users';
import { useProTableResize } from '@/utils/proTableConfig';

type UserItem = API.UserItem;

const roleMap: Record<string, { color: string; text: string }> = {
  admin: { color: 'red', text: '管理员' },
  warehouse: { color: 'blue', text: '仓管员' },
};

const Users: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const { message } = App.useApp();

  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<UserItem | null>(null);

  const handleSubmit = async (values: any) => {
    if (editRecord) {
      const body: Record<string, unknown> = {
        name: values.name,
        phone: values.phone,
        role: values.role,
        status: values.status,
        can_create_temp_order: values.can_create_temp_order ? 1 : 0,
        can_pc_outbound: values.can_pc_outbound ? 1 : 0,
      };
      if (values.password) body.password = values.password;
      const res = await updateUser(editRecord.id, body);
      if (res.success) {
        message.success('编辑成功');
        setEditOpen(false);
        actionRef.current?.reload();
      } else {
        message.error(res.errorMessage || '编辑失败');
      }
    } else {
      const res = await createUser({
        ...values,
        can_create_temp_order: values.can_create_temp_order ? 1 : 0,
        can_pc_outbound: values.can_pc_outbound ? 1 : 0,
      });
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

  const handleToggleStatus = async (record: UserItem) => {
    const newStatus = record.status === 1 ? 0 : 1;
    const res = await updateUser(record.id, { status: newStatus });
    if (res.success) {
      message.success(newStatus === 1 ? '已启用' : '已禁用');
      actionRef.current?.reload();
    } else {
      message.error(res.errorMessage || '操作失败');
    }
  };

  const columns: ProColumns<UserItem>[] = [
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
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      hideInSearch: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 80,
      hideInSearch: true,
      render: (_, r) => {
        const cfg = roleMap[r.role] || { color: 'default', text: r.role };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '临时单',
      dataIndex: 'can_create_temp_order',
      width: 70,
      hideInSearch: true,
      render: (_, r) =>
        r.role === 'admin' || r.can_create_temp_order === 1 ? (
          <Tag color="green">是</Tag>
        ) : (
          <Tag>否</Tag>
        ),
    },
    {
      title: 'PC出库',
      dataIndex: 'can_pc_outbound',
      width: 70,
      hideInSearch: true,
      render: (_, r) =>
        r.role === 'admin' || r.can_pc_outbound === 1 ? (
          <Tag color="green">是</Tag>
        ) : (
          <Tag>否</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      hideInSearch: true,
      render: (_, r) => (
        <Tag color={r.status === 1 ? 'green' : 'default'}>
          {r.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
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
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
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
            title={record.status === 1 ? '确认禁用该用户？' : '确认启用该用户？'}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button type="link" size="small" danger={record.status === 1}>
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认删除该用户？此操作不可撤销。"
            onConfirm={async () => {
              const res = await deleteUser(record.id);
              if (res.success) {
                message.success('删除成功');
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
  ];

  const { columns: userColumns, components, tableProps } = useProTableResize(
    'users-table-v2',
    columns,
  );

  const userTable = (
      <ProTable<UserItem>
        {...tableProps}
        components={components}
        columns={userColumns}
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        request={async (params) => {
          try {
            const res = await getUserList({
              current: params.current,
              pageSize: params.pageSize,
              keyword: params.keyword,
              role: params.role_s,
            });
            return {
              data: res.data?.list || [],
              total: res.data?.total || 0,
              success: res.success,
            };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
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
            新增用户
          </Button>,
        ]}
      />
  );

  return (
    <AppPageContainer>
      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: '用户列表',
            children: userTable,
          },
          {
            key: 'perm',
            label: '权限说明',
            children: (
              <Card>
                <Typography.Title level={5}>权限项说明</Typography.Title>
                <Typography.Paragraph>
                  <strong>可创建临时出库单</strong>：允许在 App「我的」或 PC 订单列表创建临时单（单号规则与常规订单相同），无计划型号上限。
                </Typography.Paragraph>
                <Typography.Paragraph>
                  <strong>可 PC 出库作业</strong>：允许在 PC 出库作业页搜索卷号、批量挑选出库、撤销与提交完成。
                </Typography.Paragraph>
                <Typography.Paragraph type="secondary">
                  管理员默认拥有全部权限。仓管员默认关闭 PC 出库和临时单，需管理员手动开启。
                </Typography.Paragraph>
              </Card>
            ),
          },
        ]}
      />

      <ModalForm
        title={editRecord ? '编辑用户' : '新增用户'}
        open={editOpen}
        onOpenChange={setEditOpen}
        width={480}
        initialValues={
          editRecord
            ? {
                ...editRecord,
                password: undefined,
                can_create_temp_order: !!editRecord.can_create_temp_order,
                can_pc_outbound: editRecord.can_pc_outbound === 1,
              }
            : {
                role: 'warehouse',
                status: 1,
                can_create_temp_order: false,
                can_pc_outbound: false,
              }
        }
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="name"
          label="姓名"
          placeholder="请输入姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        />
        <ProFormText
          name="phone"
          label="手机号"
          placeholder="请输入手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}
        />
        <ProFormText
          name="password"
          label={editRecord ? '密码（留空不修改）' : '密码'}
          placeholder={editRecord ? '留空则不修改密码' : '请输入密码'}
          fieldProps={{ type: 'password' as const }}
          rules={
            editRecord
              ? []
              : [{ required: true, message: '请输入密码' }]
          }
        />
        <ProFormSelect
          name="role"
          label="角色"
          placeholder="选择角色"
          options={[
            { label: '管理员', value: 'admin' },
            { label: '仓管员', value: 'warehouse' },
          ]}
          rules={[{ required: true, message: '请选择角色' }]}
        />
        <ProFormSwitch
          name="can_create_temp_order"
          label="可创建临时出库单"
          tooltip="开启后 App/PC 可现场创建临时单"
        />
        <ProFormSwitch
          name="can_pc_outbound"
          label="可 PC 出库作业"
        />
        {editRecord && (
          <ProFormSelect
            name="status"
            label="状态"
            options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]}
          />
        )}
      </ModalForm>
    </AppPageContainer>
  );
};

export default Users;
