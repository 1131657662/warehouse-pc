/**
 * @see https://umijs.org/docs/max/access#access
 */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const isAdmin = currentUser?.role === 'admin';
  return {
    isAdmin,
    canCreateTempOrder:
      isAdmin || currentUser?.can_create_temp_order === 1,
    canPcOutbound:
      isAdmin || currentUser?.can_pc_outbound === 1,
  };
}
