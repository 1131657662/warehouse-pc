export const ORDER_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF7E6', text: '#D97706' },
  scanning: { bg: '#E6F0FF', text: '#0070F3' },
  completed: { bg: '#E6F5EC', text: '#30A46C' },
  cancelled: { bg: '#FDE8E8', text: '#E5484D' },
  temp: { bg: '#FFF1F0', text: '#E5484D' },
};

export function formatModelLabel(
  product_name: string,
  weight: number | null | undefined,
  specification?: string,
) {
  const w = weight != null ? Number(weight).toFixed(3) : '-';
  return `${product_name} / ${w} / ${specification || '-'}`;
}
