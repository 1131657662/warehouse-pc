import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { message, notification } from 'antd';
import { getToken, removeToken, setToken } from './utils/token';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },

    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      // 401 未认证 → 清除 Token，跳转登录
      if (error.response?.status === 401) {
        removeToken();
        history.push('/login');
        return;
      }

      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        const body = error.response.data;
        const apiMsg =
          typeof body === 'object' && body !== null
            ? body.errorMessage || body.message
            : undefined;
        if (apiMsg) {
          message.error(apiMsg);
        } else {
          message.error(`请求失败 (${error.response.status})`);
        }
      } else if (error.request) {
        message.error('None response! Please retry.');
      } else {
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器 — 自动附带 Token
  requestInterceptors: [
    (config: RequestOptions) => {
      const token = getToken();
      const headers = {
        ...config.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      return { ...config, headers };
    },
  ],

  // 响应拦截器 — 处理 Token 滑动刷新
  responseInterceptors: [
    (response) => {
      // 检查响应头 X-New-Token，有则替换本地 Token
      const newToken = response.headers['x-new-token'];
      if (newToken) {
        setToken(newToken as string);
      }

      return response;
    },
  ],
};
