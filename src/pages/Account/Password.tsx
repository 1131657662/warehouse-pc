import { LockOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import AppPageContainer from '@/components/AppPageContainer';
import { history } from '@umijs/max';
import { App, Card, Typography } from 'antd';
import { changePassword } from '@/services/auth';

const { Text, Paragraph } = Typography;

const AccountPasswordPage: React.FC = () => {
  const { message } = App.useApp();

  return (
    <AppPageContainer title="修改密码" onBack={() => history.back()}>
      <Card bordered style={{ maxWidth: 480 }}>
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          修改成功后请使用新密码重新登录。密码至少 6 位，建议包含字母与数字。
        </Paragraph>
        <ProForm
          submitter={{
            searchConfig: { submitText: '保存新密码' },
            resetButtonProps: { style: { display: 'none' } },
          }}
          onFinish={async (values) => {
            const res = await changePassword({
              oldPassword: values.oldPassword,
              newPassword: values.newPassword,
            });
            if (res.success) {
              message.success('密码修改成功，请重新登录');
              history.replace('/login');
              return true;
            }
            message.error(res.errorMessage || '修改失败');
            return false;
          }}
        >
          <ProFormText.Password
            name="oldPassword"
            label="当前密码"
            placeholder="请输入当前密码"
            fieldProps={{ prefix: <LockOutlined />, size: 'large' }}
            rules={[{ required: true, message: '请输入当前密码' }]}
          />
          <ProFormText.Password
            name="newPassword"
            label="新密码"
            placeholder="至少 6 位"
            fieldProps={{ prefix: <LockOutlined />, size: 'large' }}
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '新密码至少 6 位' },
            ]}
          />
          <ProFormText.Password
            name="confirmPassword"
            label="确认新密码"
            placeholder="再次输入新密码"
            fieldProps={{ prefix: <LockOutlined />, size: 'large' }}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的新密码不一致'));
                },
              }),
            ]}
          />
        </ProForm>
        <Text type="secondary" style={{ fontSize: 13 }}>
          忘记当前密码请联系管理员在用户权限中重置。
        </Text>
      </Card>
    </AppPageContainer>
  );
};

export default AccountPasswordPage;
