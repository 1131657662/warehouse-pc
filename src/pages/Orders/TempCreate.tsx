import AppPageContainer from '@/components/AppPageContainer';
import { history, useAccess } from '@umijs/max';
import { App, Button, Card, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getCustomerList } from '@/services/customers';
import { createOrder } from '@/services/orders';

const TempCreatePage: React.FC = () => {
  const { message } = App.useApp();
  const access = useAccess();
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<API.CustomerItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCustomerList().then((res) => {
      if (res.success) setCustomers(res.data?.list || []);
    });
  }, []);

  if (!access.canCreateTempOrder) {
    return (
      <AppPageContainer>
        <Card>您没有创建临时出库单的权限。</Card>
      </AppPageContainer>
    );
  }

  const onFinish = async (values: {
    customer_id: number;
    vehicle_no?: string;
    container_no?: string;
    remark?: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await createOrder({
        customer_id: values.customer_id,
        order_date: dayjs().format('YYYY-MM-DD'),
        vehicle_no: values.vehicle_no,
        container_no: values.container_no,
        remark: values.remark,
        temp: true,
        items: [],
      });
      if (res.success && res.data?.id) {
        message.success('临时单已创建');
        history.push(`/orders/${res.data.id}/outbound`);
      } else {
        message.error(res.errorMessage || '创建失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPageContainer
      title="临时出库"
      onBack={() => history.push('/orders')}
    >
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 480 }}>
          <Form.Item
            name="customer_id"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={customers.map((c) => ({ label: c.name, value: c.id }))}
              placeholder="选择客户"
            />
          </Form.Item>
          <Form.Item name="vehicle_no" label="车号">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="container_no" label="箱号">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            创建并出库
          </Button>
        </Form>
      </Card>
    </AppPageContainer>
  );
};

export default TempCreatePage;
