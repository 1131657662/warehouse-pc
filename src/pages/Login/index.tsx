import { LockOutlined, MobileOutlined } from '@ant-design/icons';
import { ProForm, ProFormText } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { App, Typography } from 'antd';
import React from 'react';
import { flushSync } from 'react-dom';
import { login } from '@/services/auth';
import { setToken } from '@/utils/token';
import './index.less';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();

  const handleSubmit = async (values: { phone: string; password: string }) => {
    try {
      const res = await login(values);
      if (res.success) {
        setToken(res.data.token);
        message.success('登录成功');
        if (initialState?.fetchUserInfo) {
          const userInfo = await initialState.fetchUserInfo();
          if (userInfo) {
            flushSync(() => {
              setInitialState((s) => ({ ...s, currentUser: userInfo }));
            });
          }
        }
        const urlParams = new URL(window.location.href).searchParams;
        const raw = urlParams.get('redirect');
        // 仅允许以 / 开头的相对路径，排除 //evil.com 协议相对 URL
        const safe = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
        window.location.href = safe;
        return;
      }
      message.error(res.errorMessage || '登录失败');
    } catch {
      message.error('登录失败，请重试');
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand__inner">
          <img src="/logo.svg" alt="茂智物流" className="login-brand__logo-img" />
          <Title level={1} className="login-brand__title">茂智物流</Title>
          <Text className="login-brand__desc">卷筒纸出库扫码管理系统</Text>
          <Text className="login-brand__sub">PC 管理端</Text>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-form-card">
          <Title level={3} className="login-form-card__title">登录</Title>
          <Text className="login-form-card__hint">使用手机号和密码登录</Text>
          <ProForm
            submitter={{
              searchConfig: { submitText: '登录' },
              submitButtonProps: {
                size: 'large',
                block: true,
                className: 'login-form-card__btn',
              },
            }}
            onFinish={handleSubmit}
            initialValues={{ phone: '' }}
            autoFocusFirstInput
          >
            <ProFormText
              name="phone"
              fieldProps={{
                size: 'large',
                prefix: <MobileOutlined />,
              }}
              placeholder="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1\d{10}$/, message: '手机号格式错误' },
              ]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            />
          </ProForm>
        </div>
      </div>
    </div>
  );
};

export default Login;

