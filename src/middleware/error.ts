import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * 错误处理中间件
 */
export async function errorHandler(error: Error, c: Context) {
  console.error('Error:', error);

  if (error instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      error.status
    );
  }

  return c.json(
    {
      success: false,
      error: 'Internal server error',
    },
    500
  );
}

/**
 * 404 处理
 */
export function notFoundHandler(c: Context) {
  return c.json(
    {
      success: false,
      error: 'Not found',
    },
    404
  );
}

