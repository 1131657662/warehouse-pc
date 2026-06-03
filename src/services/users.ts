import { request } from '@umijs/max';

/** 用户列表 GET /api/users */
export async function getUserList(params?: {
  current?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: number;
}) {
  return request<{
    success: boolean;
    data: { list: API.UserItem[]; total: number };
  }>('/api/users', { method: 'GET', params });
}

/** 新增用户 POST /api/users */
export async function createUser(body: {
  phone: string;
  name: string;
  password: string;
  role?: string;
}) {
  return request<{ success: boolean; errorMessage?: string }>('/api/users', {
    method: 'POST',
    data: body,
  });
}

/** 编辑用户 PUT /api/users/:id */
export async function updateUser(
  id: number,
  body: {
    phone?: string;
    name?: string;
    password?: string;
    role?: string;
    status?: number;
  },
) {
  return request<{ success: boolean; errorMessage?: string }>(`/api/users/${id}`, {
    method: 'PUT',
    data: body,
  });
}

/** 删除用户 DELETE /api/users/:id */
export async function deleteUser(id: number) {
  return request<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' });
}
