import { App, Button, Drawer, Input, Modal, Space, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { MODEL_SEARCH_PLACEHOLDER } from '@/constants/modelSearch';
import { getAvailableRolls, manualOutbound } from '@/services/orders';
import { formatPieceWeightDisplay } from '@/utils/modelDisplay';
import { shouldIgnoreProTableRowClick } from '@/utils/proTableConfig';
import { formatModelLabel } from './orderConstants';

type ModelFilter = {
  product_name?: string;
  weight?: number | null;
  specification?: string;
};

type Props = {
  open: boolean;
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
  modelFilter?: ModelFilter;
  title?: string;
};

const RollPickerDrawer: React.FC<Props> = ({
  open,
  orderId,
  onClose,
  onSuccess,
  modelFilter,
  title = '挑选卷号出库',
}) => {
  const { message, modal } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rolls, setRolls] = useState<API.AvailableRoll[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<
    Map<string, API.AvailableRoll>
  >(new Map());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const loadRolls = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      const res = await getAvailableRolls(orderId, {
        keyword: keyword || undefined,
        current: nextPage,
        pageSize: nextPageSize,
        ...modelFilter,
      });
      if (res.success) {
        setRolls(res.data?.list || []);
        setTotal(res.data?.total ?? 0);
        setPage(res.data?.current ?? nextPage);
        setPageSize(res.data?.pageSize ?? nextPageSize);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelected([]);
      setSelectedMeta(new Map());
      setPage(1);
      loadRolls(1, pageSize);
    }
  }, [open, orderId, modelFilter?.product_name]);

  const availableRolls = useMemo(
    () => rolls.filter((r) => r.out_status === 'available'),
    [rolls],
  );

  const syncSelection = (keys: string[]) => {
    setSelected(keys);
    setSelectedMeta((prev) => {
      const next = new Map(prev);
      const keySet = new Set(keys);
      for (const k of [...next.keys()]) {
        if (!keySet.has(k)) next.delete(k);
      }
      for (const r of rolls) {
        if (keySet.has(r.roll_number)) next.set(r.roll_number, r);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const ids = availableRolls.map((r) => r.roll_number);
    const allSelected =
      ids.length > 0 && ids.every((id) => selected.includes(id));
    if (allSelected) {
      syncSelection(selected.filter((k) => !ids.includes(k)));
    } else {
      syncSelection([...new Set([...selected, ...ids])]);
    }
  };

  const submitRolls = async (rollNumbers: string[]) => {
    if (rollNumbers.length === 0) {
      message.warning('没有可出库的卷号');
      return;
    }
    setSubmitting(true);
    try {
      const res = await manualOutbound(orderId, { roll_numbers: rollNumbers });
      if (res.success) {
        message.success(
          res.errorMessage || `成功出库 ${rollNumbers.length} 卷`,
        );
        onSuccess();
        onClose();
      } else {
        message.error(res.errorMessage || '出库失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAllModel = async () => {
    if (!modelFilter?.product_name) {
      message.warning('请先选择型号');
      return;
    }
    setSubmitting(true);
    try {
      const res = await manualOutbound(orderId, {
        select_all_under_model: true,
        ...modelFilter,
      });
      if (res.success) {
        message.success(res.errorMessage || '已批量出库该型号可出库存');
        onSuccess();
        onClose();
      } else {
        message.error(res.errorMessage || '出库失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) {
      message.warning('请至少选择一个卷号');
      return;
    }

    const rollsToSubmit = selected
      .map((k) => selectedMeta.get(k))
      .filter(Boolean) as API.AvailableRoll[];
    const inPlan = rollsToSubmit.filter((r) => r.in_plan !== false);
    const outOfPlan = rollsToSubmit.filter((r) => r.in_plan === false);

    if (outOfPlan.length === 0) {
      void submitRolls(selected);
      return;
    }

    modal.confirm({
      title: '含计划外型号卷号',
      width: 480,
      content: (
        <div>
          <p>
            您已选 <strong>{selected.length}</strong> 卷，其中{' '}
            <strong style={{ color: '#d97706' }}>{outOfPlan.length}</strong>{' '}
            卷不在本单计划型号内。
          </p>
          <p style={{ color: '#64748b', marginBottom: 0 }}>
            计划内 {inPlan.length} 卷 · 计划外 {outOfPlan.length}{' '}
            卷。计划外加入后，履约看板将单独显示且计划件数/吨位为 0。
          </p>
        </div>
      ),
      okText: `全部加入 (${selected.length} 卷)`,
      cancelText: '取消',
      footer: (_, { OkBtn, CancelBtn }) => (
        <>
          <CancelBtn />
          <Button
            onClick={() => {
              Modal.destroyAll();
              void submitRolls(inPlan.map((r) => r.roll_number));
            }}
          >
            仅加入计划内 ({inPlan.length} 卷)
          </Button>
          <OkBtn />
        </>
      ),
      onOk: () => submitRolls(selected),
    });
  };

  return (
    <Drawer
      title={title}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          {modelFilter?.product_name ? (
            <Button onClick={handleSelectAllModel} loading={submitting}>
              全选该型号（单次最多100卷）
            </Button>
          ) : null}
          <Button type="primary" onClick={handleConfirm} loading={submitting}>
            确认出库 ({selected.length})
          </Button>
        </Space>
      }
    >
      {modelFilter?.product_name ? (
        <div style={{ marginBottom: 12, color: '#64748b' }}>
          型号：
          {formatModelLabel(
            modelFilter.product_name,
            modelFilter.weight,
            modelFilter.specification,
          )}
        </div>
      ) : null}
      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input.Search
          placeholder={MODEL_SEARCH_PLACEHOLDER}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={() => loadRolls(1, pageSize)}
          enterButton="搜索"
          allowClear
        />
        <Button type="link" onClick={toggleAllOnPage} style={{ padding: 0 }}>
          {availableRolls.length > 0 &&
          availableRolls.every((r) => selected.includes(r.roll_number))
            ? '取消本页全选'
            : `本页全选可出库 (${availableRolls.length})`}
        </Button>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          共 {total} 卷匹配，已选 {selected.length}{' '}
          卷（可翻页继续选；计划外卷号标橙）
        </span>
      </Space>
      <Table
        bordered
        rowKey="roll_number"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          onChange: (p, ps) => loadRolls(p, ps),
        }}
        dataSource={rolls}
        onRow={(record) => ({
          onClick: (e) => {
            if (shouldIgnoreProTableRowClick(e.target)) return;
            if (record.out_status !== 'available') return;
            const key = record.roll_number;
            if (selected.includes(key)) {
              syncSelection(selected.filter((k) => k !== key));
            } else {
              syncSelection([...selected, key]);
            }
          },
          style: {
            cursor: record.out_status === 'available' ? 'pointer' : 'default',
          },
        })}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => syncSelection(keys as string[]),
          getCheckboxProps: (record) => ({
            disabled: record.out_status !== 'available',
          }),
        }}
        columns={[
          {
            title: '型号',
            render: (_, r) => (
              <Space size={4}>
                {formatModelLabel(r.product_name, r.weight, r.specification)}
                {r.in_plan === false && r.out_status === 'available' ? (
                  <Tag color="orange">计划外</Tag>
                ) : null}
              </Space>
            ),
          },
          { title: '卷号', dataIndex: 'roll_number', width: 140 },
          {
            title: '件重(kg)',
            dataIndex: 'piece_weight',
            width: 90,
            render: (v: number | null) => formatPieceWeightDisplay(v),
          },
          {
            title: '状态',
            width: 90,
            render: (_, r) =>
              r.out_status === 'outbound' ? (
                <Tag color="green">已出库</Tag>
              ) : (
                <Tag>可出库</Tag>
              ),
          },
        ]}
      />
    </Drawer>
  );
};

export default RollPickerDrawer;
