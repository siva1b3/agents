// Authentication establishes identity; permissions decide allowed operations.
export const rolePermissions = Object.freeze({
  customer: Object.freeze(['orders:create', 'orders:read-own', 'orders:cancel-own']),
  administrator: Object.freeze([
    'orders:create', 'orders:read-own', 'orders:cancel-own',
    'orders:read-all', 'orders:manage', 'products:manage',
    'users:read-all', 'audit:read',
  ]),
});

export function hasPermission(user, permission) {
  return rolePermissions[user.role]?.includes(permission) ?? false;
}
