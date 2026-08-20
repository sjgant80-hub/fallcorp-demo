// fallcorp-demo · kernels.test.mjs — the engine examined against the SEALED VECTORS it was born
// from: every kernel the demo runs must score 100% on its own exam (gap-proposals.json, the
// didy-mined source), plus the escrowSplit vectors carried inline from the founding repertoire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as K from './kernels.mjs';

const props = JSON.parse(readFileSync(new URL('./gap-proposals.json', import.meta.url), 'utf8'));
const EXAMINED = ['dsarDueDate', 'lbaResponseDeadline', 'invoiceTotals', 'trialBalance', 'scorecardScore', 'panelAgreement', 'guardBooking', 'tierOf'];

test('EVERY DEMO KERNEL SCORES 100% ON ITS SEALED EXAM — the demo is theatre, the maths is not', () => {
  for (const fn of EXAMINED) {
    const exam = props.find(p => p.fn === fn);
    assert.ok(exam, fn + ' has its exam in the committed source');
    for (const v of exam.verify) {
      const got = K[fn](...JSON.parse(JSON.stringify(v.in)));
      assert.deepEqual(got, v.out, fn + ' on ' + JSON.stringify(v.in).slice(0, 60));
    }
  }
});

test('ESCROWSPLIT: the founding vectors, carried — no lost penny, remainder to the earliest', () => {
  assert.deepEqual(K.escrowSplit(100, 3), { ok: true, shares: [34, 33, 33] });
  assert.deepEqual(K.escrowSplit(9, 4), { ok: true, shares: [3, 2, 2, 2] });
  assert.deepEqual(K.escrowSplit(5, 5), { ok: true, shares: [1, 1, 1, 1, 1] });
  assert.deepEqual(K.escrowSplit(100, 0), { ok: false });
  assert.deepEqual(K.escrowSplit(1.5, 2), { ok: false });
  // and the settlement shape the demo runs: a £41,250.33 settlement across 3 heads sums exactly
  const s = K.escrowSplit(4125033, 3);
  assert.equal(s.shares.reduce((a, b) => a + b, 0), 4125033);
});

test('THE DAY THE DEMO SHOWS IS REAL MATHS — the exact fixtures the page renders, pinned', () => {
  // compliance: DSAR received Fri 2026-08-07, statutory month, with the late-summer bank holiday supplied
  assert.deepEqual(K.dsarDueDate('2026-08-07', 1, ['2026-08-31']), { ok: true, due: '2026-09-07' });
  // legal: LBA sent 2026-08-20, 14 working days over the bank holiday
  assert.deepEqual(K.lbaResponseDeadline('2026-08-20', 14, ['2026-08-31']), { ok: true, deadline: '2026-09-10' });
  // finance: the demo invoice — the column sums to itself with 20% VAT
  const inv = K.invoiceTotals([
    { qty: 12, unitPrice: '95.50' }, { qty: 3, unitPrice: '0.335' }, { qty: 1, unitPrice: '450' },
  ], 2000);
  assert.equal(inv.subtotalPence, inv.linePence.reduce((a, b) => a + b, 0), 'the printed column IS the subtotal');
  assert.deepEqual(inv.linePence, [114600, 101, 45000]);
  assert.equal(inv.totalPence, 159701 + K.invoiceTotals([{ qty: 12, unitPrice: '95.50' }, { qty: 3, unitPrice: '0.335' }, { qty: 1, unitPrice: '450' }], 2000).vatPence);
  // the day's ledger balances with the USD medical-report line CONVERTED, not decorated
  const tb = K.trialBalance([
    { account: 'client-escrow', side: 'D', amountMinor: 4125033, currency: 'GBP' },
    { account: 'settlements-due', side: 'C', amountMinor: 4125033, currency: 'GBP' },
    { account: 'disbursements', side: 'D', amountMinor: 100000, currency: 'USD', fxPpm: 780000 },
    { account: 'cash', side: 'C', amountMinor: 78000, currency: 'GBP' },
  ], ['client-escrow', 'settlements-due', 'disbursements', 'cash'], 'GBP');
  assert.equal(tb.balanced, true, 'fx applied: $1,000.00 at 0.78 = £780.00 exactly');
  // experts: the 10:00 slot clash the old code missed
  const gb = K.guardBooking([{ id: 'EXP-1', unit: 'dr-sample', checkin: '2026-08-24', checkout: '2026-08-26', status: 'confirmed' }],
    { unit: 'dr-sample', checkin: '2026-08-25', checkout: '2026-08-27' });
  assert.deepEqual(gb, { ok: true, clash: true, conflictIds: ['EXP-1'] });
  // HR: one glowing answer does NOT read as a full board
  const sc = K.scorecardScore([{ name: 'technical', weight: 12, score: 5 }, { name: 'communication', weight: 10, score: null }]);
  assert.equal(sc.partScored, true);
  assert.deepEqual(K.panelAgreement([420]), { ok: true, raters: 1, spread: null }, 'one opinion is never agreement');
});

test('FUZZ: total on garbage', () => {
  for (const fn of EXAMINED) {
    for (const g of [null, 7, 'x', [], {}, function f() {}]) {
      const out = K[fn](g, g, g);
      assert.deepEqual(out, { ok: false }, fn + ' on garbage');
    }
  }
  // escrowSplit(7, 7) is a VALID split — its garbage is the non-numeric kind
  for (const g of [null, 'x', [], {}, function f() {}, 1.5]) {
    assert.deepEqual(K.escrowSplit(g, g), { ok: false }, 'escrowSplit on garbage');
  }
  assert.equal(K.validDate('2026-02-29'), false, 'not a leap year');
  assert.equal(K.validDate('2028-02-29'), true, 'a leap year');
});

// ─── round two: the gate found 46 guard-arm gaps — the near-miss gauntlet kills them ───

test('THE NEAR-MISS GAUNTLET — every guard arm refuted one fault at a time', () => {
  // validDate direct probes (exported and load-bearing everywhere)
  assert.equal(K.validDate('20-01-01'), false);
  assert.equal(K.validDate(7), false);
  assert.equal(K.validDate('2026-13-01'), false);
  // calendar round-trips across the month-map seams: December→January, February, no-wrap September
  assert.deepEqual(K.dsarDueDate('2026-12-15', 1, []), { ok: true, due: '2027-01-15' });
  assert.deepEqual(K.lbaResponseDeadline('2026-02-10', 3, []), { ok: true, deadline: '2026-02-13' });
  assert.deepEqual(K.dsarDueDate('2026-09-28', 3, []), { ok: true, due: '2026-12-28' });
  // workingDays bounds: 250 inclusive stands, 251 refused
  assert.equal(K.lbaResponseDeadline('2026-08-20', 250, []).ok, true);
  assert.deepEqual(K.lbaResponseDeadline('2026-08-20', 251, []), { ok: false });
  // invoice guard arms
  const L1 = [{ qty: 1, unitPrice: '1.00' }];
  assert.deepEqual(K.invoiceTotals(L1, '2000'), { ok: false });
  assert.deepEqual(K.invoiceTotals(L1, 10001), { ok: false });
  assert.deepEqual(K.invoiceTotals(L1, 0.5), { ok: false });
  assert.equal(K.invoiceTotals(L1, 10000).ok, true, '100 percent VAT is a rate, inclusive');
  assert.deepEqual(K.invoiceTotals([{ qty: '3', unitPrice: '1.00' }], 0), { ok: false });
  assert.deepEqual(K.invoiceTotals([{ qty: 0.5, unitPrice: '1.00' }], 0), { ok: false });
  assert.deepEqual(K.invoiceTotals([{ qty: 2 ** 53, unitPrice: '1.00' }], 0), { ok: false });
  // trial-balance guard arms, one fault each
  const A = ['cash', 'sales'];
  const good = { account: 'cash', side: 'D', amountMinor: 100, currency: 'GBP' };
  const c100 = { account: 'sales', side: 'C', amountMinor: 100, currency: 'GBP' };
  assert.equal(K.trialBalance([good, c100], A, 'GBP').ok, true);
  assert.deepEqual(K.trialBalance([good, c100], ['cash', 'cash'], 'GBP'), { ok: false }, 'a duplicated chart is not a chart');
  assert.deepEqual(K.trialBalance([good, c100], ['cash', ''], 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([good, c100], A, 'gbp'), { ok: false });
  assert.deepEqual(K.trialBalance([good, c100], A, 7), { ok: false });
  assert.deepEqual(K.trialBalance('x', A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, amountMinor: '100' }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, amountMinor: 0 }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, amountMinor: 0.5 }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, currency: 'usd', fxPpm: 1 }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, currency: 7 }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, currency: 'USD', fxPpm: '780000' }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, currency: 'USD', fxPpm: 0 }, c100], A, 'GBP'), { ok: false });
  assert.deepEqual(K.trialBalance([{ ...good, currency: 'USD', fxPpm: 0.5 }, c100], A, 'GBP'), { ok: false });
  // escrow: zero is a real total
  assert.deepEqual(K.escrowSplit(0, 3), { ok: true, shares: [0, 0, 0] });
  // scorecard guard arms + the score boundaries
  assert.deepEqual(K.scorecardScore([{ name: 7, weight: 1, score: 3 }]), { ok: false });
  assert.deepEqual(K.scorecardScore([{ name: '', weight: 1, score: 3 }]), { ok: false });
  assert.deepEqual(K.scorecardScore([{ name: 'a', weight: 1, score: 3 }, { name: 'a', weight: 1, score: 3 }]), { ok: false });
  assert.deepEqual(K.scorecardScore([{ name: 'a', weight: 0, score: 3 }]), { ok: false });
  assert.deepEqual(K.scorecardScore([{ name: 'a', weight: 0.5, score: 3 }]), { ok: false });
  assert.deepEqual(K.scorecardScore([{ name: 'a', weight: '1', score: 3 }]), { ok: false });
  assert.equal(K.scorecardScore([{ name: 'a', weight: 1, score: 1 }]).scoreHundredths, 100, 'a score of 1 is a real answer');
  assert.deepEqual(K.scorecardScore([{ name: 'a', weight: 1, score: 0 }]), { ok: false });
  // panel boundaries inclusive both ends
  assert.equal(K.panelAgreement([100, 500]).spread, 400);
  assert.deepEqual(K.panelAgreement([99, 400]), { ok: false });
  assert.deepEqual(K.panelAgreement([400, 501]), { ok: false });
  assert.deepEqual(K.panelAgreement(['400']), { ok: false });
  // bookings: each fault alone, equal-dates refused, back-to-back is not a clash
  const E = [{ id: 'E1', unit: 'dr-a', checkin: '2026-08-27', checkout: '2026-08-28', status: 'confirmed' }];
  assert.deepEqual(K.guardBooking(E, { unit: '', checkin: '2026-08-25', checkout: '2026-08-27' }), { ok: false });
  assert.deepEqual(K.guardBooking(E, { unit: 'dr-a', checkin: 'nope', checkout: '2026-08-27' }), { ok: false });
  assert.deepEqual(K.guardBooking(E, { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-99-01' }), { ok: false });
  assert.deepEqual(K.guardBooking(E, { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-25' }), { ok: false }, 'equal dates are a stutter, not a stay');
  assert.deepEqual(K.guardBooking([{ ...E[0], id: '' }], { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-27' }), { ok: false });
  assert.deepEqual(K.guardBooking([{ ...E[0], unit: '' }], { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-27' }), { ok: false });
  assert.deepEqual(K.guardBooking([{ ...E[0], checkin: 'x' }], { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-27' }), { ok: false });
  assert.equal(K.guardBooking(E, { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-27' }).clash, false, 'an existing stay STARTING at the candidate checkout is back-to-back, not a clash');
  assert.deepEqual(K.guardBooking([{ ...E[0], checkin: '2026-08-28', checkout: '2026-08-28' }], { unit: 'dr-a', checkin: '2026-08-25', checkout: '2026-08-27' }), { ok: false }, 'an equal-dates existing stay is invalid input');
  // tierOf guard arms
  assert.deepEqual(K.tierOf({ runs: [{ workflow: 7, conclusion: 'success', mutation: true }] }), { ok: false });
  assert.deepEqual(K.tierOf({ runs: [{ workflow: '', conclusion: 'success', mutation: true }] }), { ok: false });
  assert.deepEqual(K.tierOf({ runs: [{ workflow: 'ci', conclusion: 'success', mutation: 'yes' }] }), { ok: false });
  assert.deepEqual(K.tierOf({ runs: [7] }), { ok: false });
});

test('ROUND THREE — the alternate-path escapes and the boxed impostors', () => {
  const A3 = ['client-escrow', 'cash'];
  const d1 = { account: 'client-escrow', side: 'D', amountMinor: 1, currency: 'GBP' };
  const c1 = { account: 'cash', side: 'C', amountMinor: 1, currency: 'GBP' };
  assert.equal(K.trialBalance([d1, c1], A3, 'GBP').ok, true, 'one penny is a real posting — the floor is inclusive');
  assert.deepEqual(K.trialBalance([{ ...d1, amountMinor: 2 ** 53 }, c1], A3, 'GBP'), { ok: false }, 'an unsafe integer is not money');
  const usd = { account: 'client-escrow', side: 'D', amountMinor: 1000000, currency: 'USD', fxPpm: 1 };
  const usdc = { account: 'cash', side: 'C', amountMinor: 1000000, currency: 'USD', fxPpm: 1 };
  assert.equal(K.trialBalance([usd, usdc], A3, 'GBP').ok, true, 'an fx rate of one ppm is a real rate — the floor is inclusive');
  assert.deepEqual(K.trialBalance([{ ...usd, fxPpm: 2 ** 53 }, usdc], A3, 'GBP'), { ok: false });
  // the alternate-path escapes: the fault must be the ONLY fault, so only its guard can catch it
  assert.deepEqual(K.trialBalance([d1, c1], ['client-escrow', 'cash', 'client-escrow'], 'GBP'), { ok: false }, 'a duplicated chart refuses even when every line would place');
  assert.deepEqual(K.trialBalance([d1, c1], ['client-escrow', 'cash', ''], 'GBP'), { ok: false }, 'an empty account name refuses even when unused');
  assert.deepEqual(K.trialBalance([d1, c1], ['client-escrow', 'cash', ['ghost']], 'GBP'), { ok: false }, 'an array is not an account name');
  assert.deepEqual(K.trialBalance([usd, usdc], A3, Object('GBP')), { ok: false }, 'a boxed string is not a currency');
  assert.equal(K.validDate(Object('2026-01-01')), false, 'a boxed string is not a date');
  assert.deepEqual(K.guardBooking([{ id: 'E9', unit: 'dr-a', checkin: '2026-02-30', checkout: '2026-03-02', status: 'confirmed' }],
    { unit: 'dr-a', checkin: '2026-03-05', checkout: '2026-03-07' }), { ok: false }, 'a Feb-30 booking is invalid even when it orders correctly');
});
