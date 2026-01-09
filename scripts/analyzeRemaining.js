const data = require('../docs/contract-mismatches.json');
const frontendOnly = data.endpoints.frontendOnly || [];

const groups = {};
frontendOnly.forEach(ep => {
  const path = ep.endpoint || ep.path;
  if (!path) return;
  const parts = path.split('/').filter(Boolean);
  const prefix = parts.slice(0, 2).join('/');
  if (!groups[prefix]) groups[prefix] = [];
  groups[prefix].push({ ...ep, path });
});

const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

console.log('Top 30 groups with frontend-only endpoints:\n');
sorted.slice(0, 30).forEach(([prefix, eps]) => {
  console.log(`${prefix}: ${eps.length} endpoints`);
  eps.slice(0, 4).forEach(ep => console.log(`  ${ep.method || 'GET'} ${ep.path}`));
  if (eps.length > 4) console.log(`  ... and ${eps.length - 4} more`);
});

console.log('\n\nTotal frontend-only endpoints:', frontendOnly.length);
