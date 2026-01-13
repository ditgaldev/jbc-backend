import { Hono } from 'hono';
import users from './users';
import dapps from './dapps';
import tokens from './tokens';
import admin from './admin';
import upload from './upload';
import type { Env } from '../types';

const routes = new Hono<{ Bindings: Env }>();

// 健康检查
routes.get('/health', (c) => {
  return c.json({ success: true, message: 'API is running' });
});

// API 路由
routes.route('/users', users);
routes.route('/dapps', dapps);
routes.route('/tokens', tokens);
routes.route('/admin', admin);
routes.route('/upload', upload);

export default routes;

