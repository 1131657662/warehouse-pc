import { request } from '@umijs/max';

/** 客户列表 GET /api/customers */
export async function getCustomerList(params?: {
  keyword?: string;
  current?: number;
  pageSize?: number;
}) {
  return request<{ success: boolean; data: { list: API.CustomerItem[]; total: number } }>(
    '/api/customers',
    { method: 'GET', params },
  );
}

/** 新增客户 POST /api/customers */
export async function createCustomer(body: {
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
}) {
  return request<{ success: boolean }>('/api/customers', {
    method: 'POST',
    data: body,
  });
}

/** 编辑客户 PUT /api/customers/:id */
export async function updateCustomer(
  id: number,
  body: { code?: string; name: string; contact?: string; phone?: string; address?: string },
) {
  return request<{ success: boolean }>(`/api/customers/${id}`, {
    method: 'PUT',
    data: body,
  });
}

/** 删除客户 DELETE /api/customers/:id */
export async function deleteCustomer(id: number) {
  return request<{ success: boolean }>(`/api/customers/${id}`, {
    method: 'DELETE',
  });
}
