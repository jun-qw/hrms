process.env.AUTH_MODE = 'demo';
import './scripts/lib/env';
async function main() {
  process.env.AUTH_MODE = 'demo';
  const { fetchPayrollData } = await import('./src/lib/actions/payroll-actions');
  const data = await fetchPayrollData();
  if (!data) { console.log('null'); return; }
  console.log('savedPayrolls:', data.savedPayrolls.length);
  const first = data.savedPayrolls[0];
  console.log('첫 건 items 수:', first?.items?.length ?? 'undefined');
  console.log('items:', JSON.stringify(first?.items?.slice(0, 3)));
  const withItems = data.savedPayrolls.filter((p) => (p.items?.length ?? 0) > 0).length;
  console.log('items 있는 건:', withItems, '/', data.savedPayrolls.length);
}
main();
