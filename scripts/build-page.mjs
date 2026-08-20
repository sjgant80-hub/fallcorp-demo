// fallcorp-demo · scripts/build-page.mjs — inline the GATED kernels into the page, verbatim.
// The demo is theatre; the maths is not — so the maths on the page must be the exact bytes the
// witness gate ran on, and CI diffs the regeneration.
import { readFileSync, writeFileSync } from 'node:fs';

const OPEN = '/*__KERNELS__*/';
const CLOSE = '/*__END_KERNELS__*/';
const kernel = readFileSync('kernels.mjs', 'utf8')
  .replace(/^#!.*\r?\n/, '')
  .replace(/^export default[\s\S]*?;\s*$/m, '')
  .replace(/^export (function|const|async function)/gm, '$1');

const html = readFileSync('index.html', 'utf8');
const a = html.indexOf(OPEN), b = html.indexOf(CLOSE);
if (a < 0 || b < 0) throw new Error('the kernel markers are missing from index.html');
const out = html.slice(0, a + OPEN.length) + '\n' + kernel + '\n' + html.slice(b);
writeFileSync('index.html', out);
for (const fn of ['function dsarDueDate', 'function invoiceTotals', 'function trialBalance', 'function guardBooking', 'function escrowSplit', 'function scorecardScore', 'function panelAgreement', 'function lbaResponseDeadline']) {
  if (!out.includes(fn)) throw new Error('the page does not contain ' + fn);
}
if (/^export /m.test(out.slice(a, out.indexOf(CLOSE)))) throw new Error('module syntax survived into the page');
console.log('index.html — kernels inlined, page ' + (out.length / 1024).toFixed(0) + 'KB');
