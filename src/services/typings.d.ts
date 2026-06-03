declare namespace API {
  type CurrentUser = {
    id: number;
    phone: string;
    name: string;
    role: 'admin' | 'warehouse';
    status: number;
    can_create_temp_order?: number;
    can_pc_outbound?: number;
    avatar?: string;
  };

  type LoginParams = {
    phone?: string;
    password?: string;
  };

  type LoginResult = {
    success: boolean;
    data?: { token: string; user: CurrentUser };
    errorMessage?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type ErrorResponse = {
    errorCode: string;
    errorMessage?: string;
    success?: boolean;
  };

  // 库存
  type InventoryItem = {
    id: number;
    customer_id: number;
    customer_name?: string;
    product_name: string;
    weight: number | null;
    piece_weight: number | null;
    specification: string;
    roll_number: string;
    quantity: number;
    damaged: string;
    remark: string;
    location?: string;
    reserve_status?: 'available' | 'reserved';
    reserve_order_id?: number | null;
    reserve_order_no?: string | null;
    created_at: string;
    updated_at: string;
  };

  type InventoryForm = {
    customer_id: number;
    product_name: string;
    weight?: number;
    piece_weight?: number;
    specification?: string;
    roll_number: string;
    quantity?: number;
    damaged?: string;
    remark?: string;
    location?: string;
  };

  type InventorySummary = {
    customer_id: number;
    customer_name: string;
    product_name: string;
    weight: number;
    specification: string;
    total_quantity: number;
    total_damaged: number;
    total_ton: number;
  };

  // 客户
  type CustomerItem = {
    id: number;
    code: string;
    name: string;
    contact: string;
    phone: string;
    address: string;
    created_at: string;
  };

  // 导入校验
  type ImportRow = {
    row: number;
    customer_code?: string;
    customer_name: string;
    product_name: string;
    weight: number | null;
    piece_weight: number | null;
    specification: string;
    roll_number: string;
    quantity: number;
    damaged: string;
    remark: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  };

  // 用户
  type UserItem = {
    id: number;
    phone: string;
    name: string;
    role: 'admin' | 'warehouse';
    status: number;
    can_create_temp_order?: number;
    can_pc_outbound?: number;
    created_at: string;
    updated_at: string;
  };

  type AvailableRoll = {
    id: number;
    roll_number: string;
    product_name: string;
    weight: number | null;
    piece_weight: number | null;
    specification: string;
    quantity: number;
    damaged: string;
    remark: string;
    out_status: 'available' | 'outbound';
    in_plan?: boolean;
  };

  // 订单
  type OrderItem = {
    id: number;
    order_no: string;
    order_date: string;
    customer_id: number;
    customer_name: string;
    vehicle_no: string;
    container_no: string;
    status: 'pending' | 'scanning' | 'completed' | 'cancelled';
    temp: boolean;
    remark: string;
    created_by: number;
    completed_at: string | null;
    scanned_count: number;
    scanned_tons: number;
    planned_total?: number;
    planned_ton_total?: number;
    actual_qty_total?: number;
    actual_ton_total?: number;
    created_at: string;
    updated_at: string;
  };

  type OrderDetail = OrderItem & {
    items: OrderDetailItem[];
    summary: ScanSummaryItem[];
  };

  type OrderDetailItem = {
    id: number;
    order_id: number;
    product_name: string;
    weight: number | null;
    specification: string;
    roll_number?: string;
    planned_qty: number;
    actual_qty: number;
    estimated_ton?: number;
    actual_ton?: number;
    damaged?: string;
    is_unplanned?: boolean;
    remark: string;
    is_manual?: number;
    scan_user_id?: number | null;
    scanned_at?: string | null;
    stock_qty?: number;
    stock_ton?: number;
  };

  type OrderCreateItem = {
    key: string;
    product_name: string;
    weight: number | null;
    specification: string;
    stock_qty: number;
    stock_ton: number;
    planned_qty: number;
    estimated_ton: number;
    remark: string;
  };

  // 扫码
  type ScanSummaryItem = {
    product_name: string;
    weight: number;
    specification: string;
    planned_qty: number;
    actual_qty: number;
    estimated_ton?: number;
    actual_ton?: number;
    remaining: number;
    percent: number;
    is_unplanned?: boolean;
  };

  type ReportConfigItem = {
    id: number;
    name: string;
    report_url: string;
    template_id: string;
    description?: string;
    is_default: boolean;
    export_type: 'preview' | 'pdf';
    created_at?: string;
    updated_at?: string;
  };

  type ScanLogItem = {
    id: number;
    order_id: number;
    order_item_id: number | null;
    scan_user_id: number;
    scan_user_name: string;
    raw_barcode: string;
    matched_roll_number: string;
    product_name?: string;
    weight?: number | null;
    piece_weight?: number | null;
    specification?: string;
    damaged?: string;
    is_matched: number;
    is_fuzzy: number;
    action: 'add' | 'remove';
    revoked?: boolean;
    is_unplanned?: boolean;
    created_at: string;
  };
}
