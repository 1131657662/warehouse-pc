// 模拟用户数据
const mockUser = {
  id: 1,
  phone: '13800000000',
  name: '管理员',
  role: 'admin' as const,
  status: 1,
  avatar:
    'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
};

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.mock-token-for-dev';

export default {
  // 登录
  'POST /api/auth/login': (req: any, res: any) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.json({ success: false, errorMessage: '手机号和密码不能为空' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      res.json({ success: false, errorMessage: '手机号格式错误' });
      return;
    }
    res.json({
      success: true,
      data: {
        token: mockToken,
        user: { ...mockUser, phone },
      },
    });
  },

  // 获取当前用户
  'GET /api/auth/profile': (_req: any, res: any) => {
    res.json({ success: true, data: mockUser });
  },

  // 修改密码
  'PUT /api/auth/password': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // ===== 仪表盘 Mock =====

  'GET /api/dashboard/stats': (_req: any, res: any) => {
    const today = new Date();
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 6 + i);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count: Math.floor(Math.random() * 8) + 1,
      };
    });
    res.json({
      success: true,
      data: {
        totalInventory: 20,
        todayOrders: 3,
        pendingScan: 2,
        completedToday: 1,
        orderTrend: trend,
        pendingOrders: [
          { id: 1, order_no: 'CK0525-001', order_date: '2026-05-25', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A12345', container_no: 'C001', status: 'scanning', remark: '', created_by: 1, completed_at: null, scanned_count: 3, created_at: '2026-05-25 09:00', updated_at: '2026-05-25 09:00' },
          { id: 3, order_no: 'CK0528-001', order_date: '2026-05-28', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A88888', container_no: 'C003', status: 'pending', remark: '急单', created_by: 1, completed_at: null, scanned_count: 0, created_at: '2026-05-28 08:30', updated_at: '2026-05-28 08:30' },
          { id: 5, order_no: 'CK0530-001', order_date: '2026-05-30', customer_id: 2, customer_name: '客户乙', vehicle_no: '浙B22222', container_no: 'C005', status: 'scanning', remark: '', created_by: 1, completed_at: null, scanned_count: 1, created_at: '2026-05-30 07:00', updated_at: '2026-05-30 07:00' },
        ],
      },
    });
  },

  // ===== 用户管理 Mock =====

  // 用户列表
  'GET /api/users': (_req: any, res: any) => {
    res.json({
      success: true,
      data: {
        list: [
          { id: 1, name: '管理员', phone: '13800000000', role: 'admin', status: 1, created_at: '2026-01-01 00:00', updated_at: '2026-01-01 00:00' },
          { id: 2, name: '张仓管', phone: '13800001111', role: 'warehouse', status: 1, created_at: '2026-01-15 09:00', updated_at: '2026-01-15 09:00' },
          { id: 3, name: '李仓管', phone: '13800002222', role: 'warehouse', status: 0, created_at: '2026-02-20 10:30', updated_at: '2026-03-01 14:00' },
          { id: 4, name: '王管理员', phone: '13800003333', role: 'admin', status: 1, created_at: '2026-03-10 08:00', updated_at: '2026-03-10 08:00' },
        ],
        total: 4,
      },
    });
  },

  // 创建用户
  'POST /api/users': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 更新用户
  'PUT /api/users/:id': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 删除用户
  'DELETE /api/users/:id': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 客户列表
  'GET /api/customers': (_req: any, res: any) => {
    res.json({
      success: true,
      data: [
        { id: 1, name: '客户甲', contact: '张三', phone: '13800001111', address: '浙江省杭州市', created_at: '2026-01-15' },
        { id: 2, name: '客户乙', contact: '李四', phone: '13800002222', address: '浙江省宁波市', created_at: '2026-02-20' },
        { id: 3, name: '客户丙', contact: '王五', phone: '13800003333', address: '浙江省温州市', created_at: '2026-03-10' },
      ],
    });
  },

  // 库存列表
  'GET /api/inventory': (_req: any, res: any) => {
    res.json({
      success: true,
      data: {
        list: [
          { id: 1, customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A001', quantity: 1, damaged: 0, remark: '', created_at: '2026-01-20', updated_at: '2026-01-20' },
          { id: 2, customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A002', quantity: 1, damaged: 0, remark: '', created_at: '2026-01-20', updated_at: '2026-01-20' },
          { id: 3, customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '150*200', roll_number: 'A003', quantity: 1, damaged: 0, remark: '', created_at: '2026-01-20', updated_at: '2026-01-20' },
          { id: 4, customer_id: 1, customer_name: '客户甲', product_name: '产品B', weight: 3.0, specification: '100*200', roll_number: 'B001', quantity: 1, damaged: 1, remark: '边角破损', created_at: '2026-02-01', updated_at: '2026-02-01' },
          { id: 5, customer_id: 2, customer_name: '客户乙', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A010', quantity: 1, damaged: 0, remark: '', created_at: '2026-02-10', updated_at: '2026-02-10' },
          { id: 6, customer_id: 2, customer_name: '客户乙', product_name: '产品C', weight: 1.8, specification: '80*150', roll_number: 'C001', quantity: 1, damaged: 0, remark: '', created_at: '2026-02-15', updated_at: '2026-02-15' },
          { id: 7, customer_id: 2, customer_name: '客户乙', product_name: '产品C', weight: 1.8, specification: '80*150', roll_number: 'C002', quantity: 1, damaged: 0, remark: '', created_at: '2026-02-15', updated_at: '2026-02-15' },
          { id: 8, customer_id: 3, customer_name: '客户丙', product_name: '产品A', weight: 2.5, specification: '200*300', roll_number: 'A100', quantity: 1, damaged: 0, remark: '', created_at: '2026-03-01', updated_at: '2026-03-01' },
          { id: 9, customer_id: 3, customer_name: '客户丙', product_name: '产品D', weight: 5.0, specification: '150*250', roll_number: 'D001', quantity: 1, damaged: 0, remark: '大件', created_at: '2026-03-05', updated_at: '2026-03-05' },
          { id: 10, customer_id: 3, customer_name: '客户丙', product_name: '产品D', weight: 5.0, specification: '150*250', roll_number: 'D002', quantity: 1, damaged: 0, remark: '大件', created_at: '2026-03-05', updated_at: '2026-03-05' },
          { id: 11, customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A004', quantity: 1, damaged: 0, remark: '', created_at: '2026-03-10', updated_at: '2026-03-10' },
          { id: 12, customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A005', quantity: 1, damaged: 0, remark: '', created_at: '2026-03-10', updated_at: '2026-03-10' },
          { id: 13, customer_id: 2, customer_name: '客户乙', product_name: '产品B', weight: 3.0, specification: '120*180', roll_number: 'B010', quantity: 1, damaged: 2, remark: '运输破损', created_at: '2026-03-15', updated_at: '2026-03-15' },
          { id: 14, customer_id: 3, customer_name: '客户丙', product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A101', quantity: 1, damaged: 0, remark: '', created_at: '2026-04-01', updated_at: '2026-04-01' },
          { id: 15, customer_id: 1, customer_name: '客户甲', product_name: '产品E', weight: 1.2, specification: '60*100', roll_number: 'E001', quantity: 1, damaged: 0, remark: '轻量', created_at: '2026-04-05', updated_at: '2026-04-05' },
          { id: 16, customer_id: 2, customer_name: '客户乙', product_name: '产品E', weight: 1.2, specification: '60*100', roll_number: 'E002', quantity: 1, damaged: 0, remark: '', created_at: '2026-04-05', updated_at: '2026-04-05' },
          { id: 17, customer_id: 1, customer_name: '客户甲', product_name: '产品B', weight: 3.0, specification: '100*200', roll_number: 'B002', quantity: 1, damaged: 0, remark: '', created_at: '2026-04-10', updated_at: '2026-04-10' },
          { id: 18, customer_id: 3, customer_name: '客户丙', product_name: '产品B', weight: 3.0, specification: '100*200', roll_number: 'B100', quantity: 1, damaged: 0, remark: '', created_at: '2026-04-12', updated_at: '2026-04-12' },
          { id: 19, customer_id: 2, customer_name: '客户乙', product_name: '产品D', weight: 5.0, specification: '150*250', roll_number: 'D010', quantity: 1, damaged: 0, remark: '大件', created_at: '2026-04-20', updated_at: '2026-04-20' },
          { id: 20, customer_id: 1, customer_name: '客户甲', product_name: '产品C', weight: 1.8, specification: '80*150', roll_number: 'C010', quantity: 1, damaged: 0, remark: '', created_at: '2026-04-25', updated_at: '2026-04-25' },
        ],
        total: 20,
      },
    });
  },

  // 库存汇总
  'GET /api/inventory/summary': (_req: any, res: any) => {
    res.json({
      success: true,
      data: [
        { customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '100*200', total_quantity: 3, total_damaged: 0 },
        { customer_id: 1, customer_name: '客户甲', product_name: '产品A', weight: 2.5, specification: '150*200', total_quantity: 1, total_damaged: 0 },
        { customer_id: 1, customer_name: '客户甲', product_name: '产品B', weight: 3.0, specification: '100*200', total_quantity: 2, total_damaged: 1 },
        { customer_id: 1, customer_name: '客户甲', product_name: '产品C', weight: 1.8, specification: '80*150', total_quantity: 1, total_damaged: 0 },
        { customer_id: 1, customer_name: '客户甲', product_name: '产品E', weight: 1.2, specification: '60*100', total_quantity: 1, total_damaged: 0 },
        { customer_id: 2, customer_name: '客户乙', product_name: '产品A', weight: 2.5, specification: '100*200', total_quantity: 1, total_damaged: 0 },
        { customer_id: 2, customer_name: '客户乙', product_name: '产品B', weight: 3.0, specification: '120*180', total_quantity: 1, total_damaged: 2 },
        { customer_id: 2, customer_name: '客户乙', product_name: '产品C', weight: 1.8, specification: '80*150', total_quantity: 2, total_damaged: 0 },
        { customer_id: 2, customer_name: '客户乙', product_name: '产品D', weight: 5.0, specification: '150*250', total_quantity: 1, total_damaged: 0 },
        { customer_id: 2, customer_name: '客户乙', product_name: '产品E', weight: 1.2, specification: '60*100', total_quantity: 1, total_damaged: 0 },
        { customer_id: 3, customer_name: '客户丙', product_name: '产品A', weight: 2.5, specification: '100*200', total_quantity: 1, total_damaged: 0 },
        { customer_id: 3, customer_name: '客户丙', product_name: '产品A', weight: 2.5, specification: '200*300', total_quantity: 1, total_damaged: 0 },
        { customer_id: 3, customer_name: '客户丙', product_name: '产品B', weight: 3.0, specification: '100*200', total_quantity: 1, total_damaged: 0 },
        { customer_id: 3, customer_name: '客户丙', product_name: '产品D', weight: 5.0, specification: '150*250', total_quantity: 2, total_damaged: 0 },
      ],
    });
  },

  // ===== 订单 Mock =====

  // 库存搜索（用于创建订单时按品名+克重+规格搜索）
  'GET /api/inventory/search': (req: any, res: any) => {
    const { barcode } = req.query || {};
    // 汇总数据用于创建订单时的型号搜索
    const summary = [
      { product_name: '产品A', weight: 2.5, specification: '100*200', stock_qty: 3, stock_ton: 0.0075, customer_id: 1, customer_name: '客户甲' },
      { product_name: '产品A', weight: 2.5, specification: '150*200', stock_qty: 1, stock_ton: 0.0025, customer_id: 1, customer_name: '客户甲' },
      { product_name: '产品B', weight: 3.0, specification: '100*200', stock_qty: 2, stock_ton: 0.006, customer_id: 1, customer_name: '客户甲' },
      { product_name: '产品C', weight: 1.8, specification: '80*150', stock_qty: 1, stock_ton: 0.0018, customer_id: 1, customer_name: '客户甲' },
      { product_name: '产品E', weight: 1.2, specification: '60*100', stock_qty: 1, stock_ton: 0.0012, customer_id: 1, customer_name: '客户甲' },
      { product_name: '产品A', weight: 2.5, specification: '100*200', stock_qty: 1, stock_ton: 0.0025, customer_id: 2, customer_name: '客户乙' },
      { product_name: '产品B', weight: 3.0, specification: '120*180', stock_qty: 1, stock_ton: 0.003, customer_id: 2, customer_name: '客户乙' },
      { product_name: '产品C', weight: 1.8, specification: '80*150', stock_qty: 2, stock_ton: 0.0036, customer_id: 2, customer_name: '客户乙' },
      { product_name: '产品D', weight: 5.0, specification: '150*250', stock_qty: 1, stock_ton: 0.005, customer_id: 2, customer_name: '客户乙' },
      { product_name: '产品E', weight: 1.2, specification: '60*100', stock_qty: 1, stock_ton: 0.0012, customer_id: 2, customer_name: '客户乙' },
      { product_name: '产品A', weight: 2.5, specification: '100*200', stock_qty: 1, stock_ton: 0.0025, customer_id: 3, customer_name: '客户丙' },
      { product_name: '产品A', weight: 2.5, specification: '200*300', stock_qty: 1, stock_ton: 0.0025, customer_id: 3, customer_name: '客户丙' },
      { product_name: '产品B', weight: 3.0, specification: '100*200', stock_qty: 1, stock_ton: 0.003, customer_id: 3, customer_name: '客户丙' },
      { product_name: '产品D', weight: 5.0, specification: '150*250', stock_qty: 2, stock_ton: 0.01, customer_id: 3, customer_name: '客户丙' },
    ];
    res.json({ success: true, data: summary });
  },

  // 订单列表
  'GET /api/orders': (_req: any, res: any) => {
    res.json({
      success: true,
      data: {
        list: [
          { id: 1, order_no: 'CK0525-001', order_date: '2026-05-25', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A12345', container_no: 'C001', status: 'scanning', remark: '', created_by: 1, completed_at: null, scanned_count: 3, created_at: '2026-05-25 09:00', updated_at: '2026-05-25 09:00' },
          { id: 2, order_no: 'CK0526-001', order_date: '2026-05-26', customer_id: 2, customer_name: '客户乙', vehicle_no: '浙B67890', container_no: 'C002', status: 'completed', remark: '', created_by: 1, completed_at: '2026-05-26 16:30', scanned_count: 3, created_at: '2026-05-26 10:00', updated_at: '2026-05-26 16:30' },
          { id: 3, order_no: 'CK0528-001', order_date: '2026-05-28', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A88888', container_no: 'C003', status: 'pending', remark: '急单', created_by: 1, completed_at: null, scanned_count: 0, created_at: '2026-05-28 08:30', updated_at: '2026-05-28 08:30' },
          { id: 4, order_no: 'CK0529-001', order_date: '2026-05-29', customer_id: 3, customer_name: '客户丙', vehicle_no: '浙C11111', container_no: '', status: 'cancelled', remark: '客户取消', created_by: 1, completed_at: null, scanned_count: 0, created_at: '2026-05-29 11:00', updated_at: '2026-05-29 14:00' },
          { id: 5, order_no: 'CK0530-001', order_date: '2026-05-30', customer_id: 2, customer_name: '客户乙', vehicle_no: '浙B22222', container_no: 'C005', status: 'scanning', remark: '', created_by: 1, completed_at: null, scanned_count: 1, created_at: '2026-05-30 07:00', updated_at: '2026-05-30 07:00' },
        ],
        total: 5,
      },
    });
  },

  // 创建订单
  'POST /api/orders': (_req: any, res: any) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(Math.floor(Math.random() * 900) + 100).slice(0, 3);
    res.json({
      success: true,
      data: { id: 99, order_no: `CK${dateStr}-${seq}` },
    });
  },

  // 编辑订单
  'PUT /api/orders/:id': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 订单详情
  'GET /api/orders/:id': (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const orderBase = {
      1: { order_no: 'CK0525-001', order_date: '2026-05-25', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A12345', container_no: 'C001', status: 'scanning', remark: '', created_by: 1, completed_at: null, created_at: '2026-05-25 09:00', updated_at: '2026-05-25 09:30' },
      2: { order_no: 'CK0526-001', order_date: '2026-05-26', customer_id: 2, customer_name: '客户乙', vehicle_no: '浙B67890', container_no: 'C002', status: 'completed', remark: '', created_by: 1, completed_at: '2026-05-26 16:30', created_at: '2026-05-26 10:00', updated_at: '2026-05-26 16:30' },
      3: { order_no: 'CK0528-001', order_date: '2026-05-28', customer_id: 1, customer_name: '客户甲', vehicle_no: '浙A88888', container_no: 'C003', status: 'pending', remark: '急单', created_by: 1, completed_at: null, created_at: '2026-05-28 08:30', updated_at: '2026-05-28 08:30' },
      4: { order_no: 'CK0529-001', order_date: '2026-05-29', customer_id: 3, customer_name: '客户丙', vehicle_no: '浙C11111', container_no: '', status: 'cancelled', remark: '客户取消', created_by: 1, completed_at: null, created_at: '2026-05-29 11:00', updated_at: '2026-05-29 14:00' },
      5: { order_no: 'CK0530-001', order_date: '2026-05-30', customer_id: 2, customer_name: '客户乙', vehicle_no: '浙B22222', container_no: 'C005', status: 'scanning', remark: '', created_by: 1, completed_at: null, created_at: '2026-05-30 07:00', updated_at: '2026-05-30 07:30' },
    }[id] || { order_no: 'CKXXXX-XXX', order_date: '2026-05-30', customer_id: 1, customer_name: '客户甲', vehicle_no: '', container_no: '', status: 'pending', remark: '', created_by: 1, completed_at: null, created_at: '2026-05-30', updated_at: '2026-05-30' };

    const items: Record<number, any[]> = {
      1: [
        { id: 1, order_id: 1, product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A001', planned_qty: 2, actual_qty: 1, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-25 09:15', stock_qty: 3, stock_ton: 0.0075 },
        { id: 2, order_id: 1, product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A002', planned_qty: 2, actual_qty: 1, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-25 09:16', stock_qty: 3, stock_ton: 0.0075 },
        { id: 3, order_id: 1, product_name: '产品A', weight: 2.5, specification: '150*200', roll_number: 'A003', planned_qty: 1, actual_qty: 1, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-25 09:20', stock_qty: 1, stock_ton: 0.0025 },
        { id: 4, order_id: 1, product_name: '产品B', weight: 3.0, specification: '100*200', roll_number: null, planned_qty: 3, actual_qty: 0, damaged: 0, remark: '', is_manual: 0, scan_user_id: null, scanned_at: null, stock_qty: 2, stock_ton: 0.006 },
      ],
      2: [
        { id: 5, order_id: 2, product_name: '产品C', weight: 1.8, specification: '80*150', roll_number: 'C001', planned_qty: 2, actual_qty: 2, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-26 10:30', stock_qty: 1, stock_ton: 0.0018 },
        { id: 6, order_id: 2, product_name: '产品C', weight: 1.8, specification: '80*150', roll_number: 'C002', planned_qty: 2, actual_qty: 2, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-26 10:32', stock_qty: 1, stock_ton: 0.0018 },
        { id: 7, order_id: 2, product_name: '产品D', weight: 5.0, specification: '150*250', roll_number: 'D010', planned_qty: 1, actual_qty: 1, damaged: 0, remark: '', is_manual: 1, scan_user_id: 1, scanned_at: '2026-05-26 11:00', stock_qty: 1, stock_ton: 0.005 },
      ],
      3: [
        { id: 11, order_id: 3, product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: null, planned_qty: 2, actual_qty: 0, damaged: 0, remark: '', is_manual: 0, scan_user_id: null, scanned_at: null, stock_qty: 3, stock_ton: 0.0075 },
        { id: 12, order_id: 3, product_name: '产品B', weight: 3.0, specification: '100*200', roll_number: null, planned_qty: 1, actual_qty: 0, damaged: 0, remark: '', is_manual: 0, scan_user_id: null, scanned_at: null, stock_qty: 2, stock_ton: 0.006 },
      ],
      5: [
        { id: 8, order_id: 5, product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: 'A010', planned_qty: 1, actual_qty: 1, damaged: 0, remark: '', is_manual: 0, scan_user_id: 1, scanned_at: '2026-05-30 07:15', stock_qty: 1, stock_ton: 0.0025 },
        { id: 9, order_id: 5, product_name: '产品D', weight: 5.0, specification: '150*250', roll_number: null, planned_qty: 1, actual_qty: 0, damaged: 0, remark: '', is_manual: 0, scan_user_id: null, scanned_at: null, stock_qty: 1, stock_ton: 0.005 },
      ],
    };
    const orderItems = items[id] || [
      { id: 10, order_id: id, product_name: '产品A', weight: 2.5, specification: '100*200', roll_number: null, planned_qty: 2, actual_qty: 0, damaged: 0, remark: '', is_manual: 0, scan_user_id: null, scanned_at: null, stock_qty: 3, stock_ton: 0.0075 },
    ];

    // 计算扫码汇总
    const summaryMap = new Map<string, { planned_qty: number; actual_qty: number }>();
    for (const it of orderItems) {
      const key = `${it.product_name}|${it.weight}|${it.specification}`;
      if (!summaryMap.has(key)) summaryMap.set(key, { planned_qty: 0, actual_qty: 0 });
      const s = summaryMap.get(key)!;
      s.planned_qty += it.planned_qty;
      s.actual_qty += it.actual_qty;
    }
    const summary = Array.from(summaryMap.entries()).map(([key, s]) => {
      const [product_name, weightStr, specification] = key.split('|');
      return {
        product_name,
        weight: parseFloat(weightStr),
        specification,
        planned_qty: s.planned_qty,
        actual_qty: s.actual_qty,
        remaining: Math.max(0, s.planned_qty - s.actual_qty),
        percent: s.planned_qty > 0 ? Math.round((s.actual_qty / s.planned_qty) * 100) : 0,
      };
    });

    res.json({ success: true, data: { ...orderBase, items: orderItems, summary } });
  },

  // 扫码汇总
  'GET /api/orders/:id/scan-summary': (req: any, res: any) => {
    // 复用上面 detail 的 summary 计算逻辑
    const id = parseInt(req.params.id);
    const itemsMap: Record<number, any[]> = {
      1: [
        { product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 2, actual_qty: 1 },
        { product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 2, actual_qty: 1 },
        { product_name: '产品A', weight: 2.5, specification: '150*200', planned_qty: 1, actual_qty: 1 },
        { product_name: '产品B', weight: 3.0, specification: '100*200', planned_qty: 3, actual_qty: 0 },
      ],
      2: [
        { product_name: '产品C', weight: 1.8, specification: '80*150', planned_qty: 2, actual_qty: 2 },
        { product_name: '产品C', weight: 1.8, specification: '80*150', planned_qty: 2, actual_qty: 2 },
        { product_name: '产品D', weight: 5.0, specification: '150*250', planned_qty: 1, actual_qty: 1 },
      ],
      5: [
        { product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 1, actual_qty: 1 },
        { product_name: '产品D', weight: 5.0, specification: '150*250', planned_qty: 1, actual_qty: 0 },
      ],
    };
    const items = itemsMap[id] || [{ product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 2, actual_qty: 0 }];

    const summaryMap = new Map<string, { planned_qty: number; actual_qty: number }>();
    for (const it of items) {
      const key = `${it.product_name}|${it.weight}|${it.specification}`;
      if (!summaryMap.has(key)) summaryMap.set(key, { planned_qty: 0, actual_qty: 0 });
      const s = summaryMap.get(key)!;
      s.planned_qty += it.planned_qty;
      s.actual_qty += it.actual_qty;
    }
    const summary = Array.from(summaryMap.entries()).map(([key, s]) => {
      const [product_name, weightStr, specification] = key.split('|');
      return {
        product_name,
        weight: parseFloat(weightStr),
        specification,
        planned_qty: s.planned_qty,
        actual_qty: s.actual_qty,
        remaining: Math.max(0, s.planned_qty - s.actual_qty),
        percent: s.planned_qty > 0 ? Math.round((s.actual_qty / s.planned_qty) * 100) : 0,
      };
    });
    res.json({ success: true, data: summary });
  },

  // 扫码日志
  'GET /api/orders/:id/scan-logs': (_req: any, res: any) => {
    const logs = [
      { id: 1, order_id: 1, order_item_id: 1, scan_user_id: 1, scan_user_name: '管理员', raw_barcode: 'A001', matched_roll_number: 'A001', is_matched: 1, is_fuzzy: 0, action: 'add', created_at: '2026-05-25 09:15:00' },
      { id: 2, order_id: 1, order_item_id: 2, scan_user_id: 1, scan_user_name: '管理员', raw_barcode: 'A002', matched_roll_number: 'A002', is_matched: 1, is_fuzzy: 0, action: 'add', created_at: '2026-05-25 09:16:00' },
      { id: 3, order_id: 1, order_item_id: null, scan_user_id: 1, scan_user_name: '管理员', raw_barcode: 'A00_', matched_roll_number: 'A003', is_matched: 0, is_fuzzy: 1, action: 'add', created_at: '2026-05-25 09:20:00' },
      { id: 4, order_id: 1, order_item_id: 3, scan_user_id: 1, scan_user_name: '管理员', raw_barcode: 'A003', matched_roll_number: 'A003', is_matched: 1, is_fuzzy: 0, action: 'add', created_at: '2026-05-25 09:20:30' },
      { id: 5, order_id: 1, order_item_id: 4, scan_user_id: 1, scan_user_name: '库管员', raw_barcode: 'A003', matched_roll_number: 'A003', is_matched: 1, is_fuzzy: 0, action: 'remove', created_at: '2026-05-25 09:21:00' },
    ];
    res.json({
      success: true,
      data: { list: logs, total: logs.length },
    });
  },

  // 取消订单
  'PUT /api/orders/:id/cancel': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 回退到出库中
  'PUT /api/orders/:id/rollback': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 手动批量出库
  'POST /api/orders/:id/manual-out': (_req: any, res: any) => {
    res.json({ success: true });
  },

  // 打印数据
  'GET /api/orders/:id/print': (req: any, res: any) => {
    const id = parseInt(req.params.id);
    const orderBase = {
      1: { order_no: 'CK0525-001', order_date: '2026-05-25', customer_name: '客户甲', vehicle_no: '浙A12345', container_no: 'C001', status: 'scanning', remark: '' },
      2: { order_no: 'CK0526-001', order_date: '2026-05-26', customer_name: '客户乙', vehicle_no: '浙B67890', container_no: 'C002', status: 'completed', remark: '' },
      3: { order_no: 'CK0528-001', order_date: '2026-05-28', customer_name: '客户甲', vehicle_no: '浙A88888', container_no: 'C003', status: 'pending', remark: '急单' },
      5: { order_no: 'CK0530-001', order_date: '2026-05-30', customer_name: '客户乙', vehicle_no: '浙B22222', container_no: 'C005', status: 'scanning', remark: '' },
    }[id] || { order_no: 'CKXXXX-XXX', order_date: '2026-05-30', customer_name: '客户甲', vehicle_no: '', container_no: '', status: 'pending', remark: '' };

    const items = [
      { product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 2, actual_qty: 1, roll_number: 'A001' },
      { product_name: '产品A', weight: 2.5, specification: '100*200', planned_qty: 2, actual_qty: 1, roll_number: 'A002' },
      { product_name: '产品A', weight: 2.5, specification: '150*200', planned_qty: 1, actual_qty: 1, roll_number: 'A003' },
      { product_name: '产品B', weight: 3.0, specification: '100*200', planned_qty: 3, actual_qty: 0, roll_number: null },
    ];
    res.json({ success: true, data: { ...orderBase, items } });
  },
};
