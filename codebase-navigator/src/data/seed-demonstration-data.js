// Deliberately public fixture credentials. Enabled only by SEED_DEMO_DATA=true.
export const demonstrationAccounts = Object.freeze({
  administrator: { displayName: 'Demo Administrator', email: 'admin@example.test', password: 'Admin-demo-password-2026!' },
  customer: { displayName: 'Demo Customer', email: 'customer@example.test', password: 'Customer-demo-password-2026!' },
});

export async function seedDemonstrationData({ userService, productService }) {
  const administrator = await userService.registerUser(demonstrationAccounts.administrator, 'demo-seed', 'administrator');
  await userService.registerUser(demonstrationAccounts.customer, 'demo-seed');
  const sampleProducts = [
    { name: 'Learning Notebook', description: 'A paper notebook for investigation notes', category: 'stationery', priceCents: 1250, stockQuantity: 25 },
    { name: 'Desk Lamp', description: 'An adjustable reading lamp', category: 'office', priceCents: 4500, stockQuantity: 8 },
    { name: 'Mechanical Keyboard', description: 'A compact keyboard', category: 'office', priceCents: 8900, stockQuantity: 5 },
  ];
  for (const product of sampleProducts) productService.createProduct(product, administrator.id, 'demo-seed');
}
