import { request } from '@umijs/max';

/** 登录 POST /api/auth/login */
export async function login(body: { phone: string; password: string }) {
  return request<{
    success: boolean;
    data: { token: string; user: API.CurrentUser };
    errorMessage?: string;
  }>('/api/auth/login', {
    method: 'POST',
    data: body,
  });
}

/** 获取当前用户 GET /api/auth/profile */
export async function getProfile() {
  return request<{
    success: boolean;
    data: API.CurrentUser;
  }>('/api/auth/profile', {
    method: 'GET',
  });
}

/** 修改密码 PUT /api/auth/password */
export async function changePassword(body: {
  oldPassword: string;
  newPassword: string;
}) {
  return request<{ success: boolean }>('/api/auth/password', {
    method: 'PUT',
    data: body,
  });
}
