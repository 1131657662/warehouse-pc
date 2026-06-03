import { syncColumnWidthAtTh } from '@/utils/tableColumnResize';
import type { ThHTMLAttributes } from 'react';
import { useRef } from 'react';

export type ResizableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  width?: number;
  minWidth?: number;
  onResize?: (width: number) => void;
};

/**
 * 表头列宽拖拽：拖动中纯 DOM 更新（col/thead/tbody），1:1 跟随鼠标；
 * 松手后一次性提交 React 状态，触发 localStorage 持久化。
 */
const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  width,
  minWidth = 56,
  onResize,
  children,
  style,
  ...rest
}) => {
  const thRef = useRef<HTMLTableCellElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const canResize =
    typeof width === 'number' && width > 0 && typeof onResize === 'function';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canResize) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = thRef.current?.offsetWidth ?? (width as number);
    let lastWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      lastWidth = Math.max(minWidth, startWidth + ev.clientX - startX);
      if (thRef.current) syncColumnWidthAtTh(thRef.current, lastWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onResizeRef.current?.(lastWidth);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (!canResize) {
    return (
      <th {...rest} ref={thRef} style={style}>
        {children}
      </th>
    );
  }

  return (
    <th
      {...rest}
      ref={thRef}
      style={{
        ...style,
        width,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {children}
      <span
        className="wh-table-resize-handle"
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        onClick={(ev) => ev.stopPropagation()}
      />
    </th>
  );
};

export default ResizableHeaderCell;
