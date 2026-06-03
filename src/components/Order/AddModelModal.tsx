import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
  Button,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { getInventoryModelSummary, searchInventory } from '@/services/inventory';
import { formatModelLabel } from './orderConstants';

const { Text, Title } = Typography;

export type InventoryModelOption = {
  product_name: string;
  weight: number | null;
  specification: string;
  stock_qty: number;
  stock_ton: number;
};

export function modelKey(item: Pick<InventoryModelOption, 'product_name' | 'weight' | 'specification'>) {
  return `${item.product_name}|${item.weight}|${item.specification}`;
}

type Props = {
  open: boolean;
  customerId?: number;
  customerName?: string;
  /** 已在出库明细中的型号 key，用于禁用重复加入 */
  existingKeys?: Set<string>;
  onCancel: () => void;
  /** 批量加入明细，件数在明细表中填写 */
  onConfirm: (models: InventoryModelOption[]) => void;
};

const AddModelModal: React.FC<Props> = ({
  open,
  customerId,
  customerName,
  existingKeys,
  onCancel,
  onConfirm,
}) => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [results, setResults] = useState<InventoryModelOption[]>([]);
  const [cart, setCart] = useState<InventoryModelOption[]>([]);
  const summaryReadyRef = useRef(false);

  useEffect(() => {
    if (!open || !customerId) {
      summaryReadyRef.current = false;
      return;
    }
    let cancelled = false;
    setPreloading(true);
    getInventoryModelSummary(customerId)
      .then((res) => {
        if (!cancelled && res.success) {
          summaryReadyRef.current = true;
        }
      })
      .finally(() => {
        if (!cancelled) setPreloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  const cartKeys = useMemo(() => new Set(cart.map(modelKey)), [cart]);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      message.warning('请输入品名，或「克重 门幅」，或「品名 克重 门幅」');
      return;
    }
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await searchInventory(searchText.trim(), customerId);
      if (res.success && res.data?.length) {
        setResults(res.data);
      } else {
        setResults([]);
        if (res.success) {
          message.info('未找到有库存的型号，请调整关键词或确认已选客户');
        } else {
          message.error(res.errorMessage || '搜索失败');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: InventoryModelOption) => {
    const key = modelKey(item);
    if (existingKeys?.has(key)) {
      message.warning('该型号已在出库明细中');
      return;
    }
    if (cartKeys.has(key)) {
      message.info('已在待选列表中');
      return;
    }
    setCart((prev) => [...prev, item]);
    message.success('已加入待选');
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((i) => modelKey(i) !== key));
  };

  const handleConfirm = () => {
    if (cart.length === 0) {
      message.warning('请先搜索并加入至少一个型号');
      return;
    }
    onConfirm(cart);
    setSearchText('');
    setResults([]);
    setCart([]);
  };

  const resetOnClose = () => {
    setSearchText('');
    setResults([]);
    setCart([]);
  };

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          选择出库型号
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
            先加入待选，确定后在明细表填写发货件数
          </Text>
        </Space>
      }
      open={open}
      onCancel={() => {
        resetOnClose();
        onCancel();
      }}
      width="min(1200px, 92vw)"
      style={{ top: 32 }}
      destroyOnHidden
      afterClose={resetOnClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">
            客户：<Text strong>{customerName || '未选择'}</Text>
            <span style={{ marginLeft: 16 }}>
              待选 <Text strong>{cart.length}</Text> 个型号
            </span>
          </Text>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" disabled={cart.length === 0} onClick={handleConfirm}>
              确定加入出库明细（{cart.length}）
            </Button>
          </Space>
        </div>
      }
    >
      <Input.Search
        placeholder={MODEL_SEARCH_PLACEHOLDER}
        enterButton={
          <>
            <SearchOutlined /> 搜索
          </>
        }
        size="large"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        loading={loading || preloading}
        style={{ marginBottom: 16 }}
      />
      {preloading ? (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          正在加载该客户型号汇总…
        </Text>
      ) : null}

      <Row gutter={16} style={{ minHeight: 420 }}>
        <Col span={15}>
          <Title level={5} style={{ marginTop: 0 }}>
            搜索结果
          </Title>
          {results.length > 0 ? (
            <div
              style={{
                maxHeight: 400,
                overflow: 'auto',
                padding: '4px 2px',
              }}
            >
              <Row gutter={[12, 12]}>
                {results.map((item) => {
                  const key = modelKey(item);
                  const inCart = cartKeys.has(key);
                  const inDetail = existingKeys?.has(key);
                  const disabled = inCart || inDetail;
                  return (
                    <Col span={12} key={key}>
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid rgba(5,5,5,0.06)',
                          background: disabled ? '#fafafa' : '#fff',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <Text strong ellipsis>
                          {formatModelLabel(
                            item.product_name,
                            item.weight,
                            item.specification,
                          )}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          可用库存 {item.stock_qty} 件 · {item.stock_ton.toFixed(3)} 吨
                        </Text>
                        {item.stock_qty < 20 ? <Tag color="warning">库存偏低</Tag> : null}
                        <Button
                          type={inCart ? 'default' : 'primary'}
                          icon={<PlusOutlined />}
                          block
                          disabled={disabled}
                          onClick={() => addToCart(item)}
                        >
                          {inDetail ? '已在明细' : inCart ? '已加入' : '加入待选'}
                        </Button>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ) : (
            <Empty
              style={{ marginTop: 48 }}
              description={searchText ? '未找到型号，请调整关键词' : '搜索后将显示可添加的型号'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Col>

        <Col
          span={9}
          style={{
            borderLeft: '1px solid rgba(5,5,5,0.06)',
            paddingLeft: 8,
          }}
        >
          <Title level={5} style={{ marginTop: 0 }}>
            <Badge count={cart.length} offset={[8, 0]}>
              待选型号
            </Badge>
          </Title>
          {cart.length > 0 ? (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {cart.map((item) => {
                  const key = modelKey(item);
                  return (
                    <div
                      key={key}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#fafafa',
                        border: '1px solid rgba(5,5,5,0.06)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis>
                            {item.product_name}
                          </Text>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.weight != null ? `${item.weight}` : '-'} / {item.specification}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            可用 {item.stock_qty} 件
                          </Text>
                        </div>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeFromCart(key)}
                        />
                      </div>
                    </div>
                  );
                })}
              </Space>
            </div>
          ) : (
            <Empty
              style={{ marginTop: 48 }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="像购物车一样，点击「加入待选」累积型号"
            />
          )}
        </Col>
      </Row>
    </Modal>
  );
};

export default AddModelModal;
