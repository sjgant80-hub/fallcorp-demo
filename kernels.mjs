// fallcorp-demo · kernels.mjs — the engine room of Northgate Claims (a fictional firm).
//
// Every number the demo shows is computed HERE, and every function here is examined against
// the sealed exam vectors it was born from (gap-proposals.json — the didy-mined exams derived
// from the estate's remembered defects). The demo is theatre; the maths is not.
//
// Pure, total, no clocks: dates ride as ISO strings, holidays are an INPUT (never guessed),
// money is integer pence, invalid input returns exactly {ok:false}.

const po = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ── civil-calendar helpers (Hinnant's algorithms; no Date object anywhere) ──
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DIM = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
export function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
  return m >= 1 && m <= 12 && d >= 1 && d <= DIM(y, m);
}
const dfc = (y, m, d) => {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
};
const cfd = (z) => {
  z += 719468;
  const era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  y += m <= 2 ? 1 : 0;
  return [y, m, d];
};
const pad = (n, w) => String(n).padStart(w, '0');
const fmt = (a) => pad(a[0], 4) + '-' + pad(a[1], 2) + '-' + pad(a[2], 2);
const serial = (s) => dfc(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10));
const weekday = (z) => ((z + 4) % 7 + 7) % 7;   // 0=Sun … 6=Sat
const halfUp = (num, den) => { const r = Math.floor(num / den); return (2 * (num - r * den) >= den) ? r + 1 : r; };

/** ICO DSAR due date: calendar-month add with short-month clamp, then roll off weekends/holidays. */
export function dsarDueDate(received, months, holidays) {
  if (!validDate(received)) return { ok: false };
  if (months !== 1 && months !== 3) return { ok: false };
  if (!Array.isArray(holidays)) return { ok: false };
  for (const h of holidays) if (!validDate(h)) return { ok: false };
  const y = +received.slice(0, 4), m = +received.slice(5, 7), d = +received.slice(8, 10);
  let m2 = m + months, y2 = y;
  while (m2 > 12) { m2 -= 12; y2++; }
  let z = dfc(y2, m2, Math.min(d, DIM(y2, m2)));
  for (;;) {
    const s = fmt(cfd(z)), wd = weekday(z);
    if (wd === 0 || wd === 6 || holidays.includes(s)) { z++; continue; }
    return { ok: true, due: s };
  }
}

/** LBA response deadline: count working days from the day AFTER sent; sent never counts. */
export function lbaResponseDeadline(sent, workingDays, holidays) {
  if (!validDate(sent)) return { ok: false };
  if (!Number.isInteger(workingDays) || workingDays < 1 || workingDays > 250) return { ok: false };
  if (!Array.isArray(holidays)) return { ok: false };
  for (const h of holidays) if (!validDate(h)) return { ok: false };
  let z = serial(sent), count = 0;
  for (;;) {
    z++;
    const s = fmt(cfd(z)), wd = weekday(z);
    if (wd !== 0 && wd !== 6 && !holidays.includes(s)) {
      count++;
      if (count === workingDays) return { ok: true, deadline: s };
    }
  }
}

/** The invoice whose printed column ALWAYS sums to its own subtotal; rates multiplied before rounding. */
export function invoiceTotals(lines, vatRateBp) {
  if (!Array.isArray(lines) || !lines.length) return { ok: false };
  if (typeof vatRateBp !== 'number' || !Number.isSafeInteger(vatRateBp) || vatRateBp < 0 || vatRateBp > 10000) return { ok: false };
  const linePence = [];
  let subtotalPence = 0;
  for (const L of lines) {
    if (!po(L)) return { ok: false };
    if (typeof L.qty !== 'number' || !Number.isSafeInteger(L.qty) || L.qty < 1) return { ok: false };
    if (typeof L.unitPrice !== 'string' || !/^[0-9]+(\.[0-9]{1,6})?$/.test(L.unitPrice)) return { ok: false };
    const dot = L.unitPrice.indexOf('.');
    const d = dot < 0 ? 0 : L.unitPrice.length - dot - 1;
    const P = parseInt(L.unitPrice.replace('.', ''), 10);
    const pen = halfUp(L.qty * P * 100, Math.pow(10, d));
    linePence.push(pen);
    subtotalPence += pen;
  }
  const vatPence = halfUp(subtotalPence * vatRateBp, 10000);
  return { ok: true, linePence, subtotalPence, vatPence, totalPence: subtotalPence + vatPence };
}

/** Multi-currency trial balance: fx APPLIED, no line ever dropped in silence. */
export function trialBalance(lines, accounts, baseCurrency) {
  const nes = (v) => typeof v === 'string' && v.length > 0;
  if (!Array.isArray(accounts) || !accounts.length) return { ok: false };
  const seen = {};
  for (const a of accounts) { if (!nes(a) || seen[a]) return { ok: false }; seen[a] = 1; }
  if (typeof baseCurrency !== 'string' || !/^[A-Z]{3}$/.test(baseCurrency)) return { ok: false };
  if (!Array.isArray(lines) || !lines.length) return { ok: false };
  let debitMinor = 0, creditMinor = 0;
  for (const L of lines) {
    if (!po(L)) return { ok: false };
    if (!nes(L.account) || !seen[L.account]) return { ok: false };
    if (L.side !== 'D' && L.side !== 'C') return { ok: false };
    if (typeof L.amountMinor !== 'number' || !Number.isSafeInteger(L.amountMinor) || L.amountMinor < 1) return { ok: false };
    if (typeof L.currency !== 'string' || !/^[A-Z]{3}$/.test(L.currency)) return { ok: false };
    let contrib;
    if (L.currency === baseCurrency) {
      if (L.fxPpm !== undefined) return { ok: false };
      contrib = L.amountMinor;
    } else {
      if (typeof L.fxPpm !== 'number' || !Number.isSafeInteger(L.fxPpm) || L.fxPpm < 1) return { ok: false };
      contrib = halfUp(L.amountMinor * L.fxPpm, 1000000);
    }
    if (L.side === 'D') debitMinor += contrib; else creditMinor += contrib;
  }
  return { ok: true, debitMinor, creditMinor, balanced: debitMinor === creditMinor };
}

/** Split with no lost penny: shares sum EXACTLY, remainder to the earliest. */
export function escrowSplit(total, parts) {
  if (!Number.isInteger(total) || total < 0) return { ok: false };
  if (!Number.isInteger(parts) || parts <= 0) return { ok: false };
  const base = Math.floor(total / parts), rem = total - base * parts, shares = [];
  for (let i = 0; i < parts; i++) shares.push(base + (i < rem ? 1 : 0));
  return { ok: true, shares };
}

/** Weighted interview score with coverage ATTACHED — one answered 5 never looks like a full board. */
export function scorecardScore(dims) {
  if (!Array.isArray(dims) || !dims.length) return { ok: false };
  const names = {};
  let num = 0, den = 0, answered = 0;
  for (const d of dims) {
    if (!po(d)) return { ok: false };
    if (typeof d.name !== 'string' || !d.name || names[d.name]) return { ok: false };
    names[d.name] = 1;
    if (!Number.isInteger(d.weight) || d.weight < 1) return { ok: false };
    if (d.score === null) continue;
    if (!Number.isInteger(d.score) || d.score < 1 || d.score > 5) return { ok: false };
    answered++; num += d.weight * d.score; den += d.weight;
  }
  if (!answered) return { ok: false };
  return { ok: true, scoreHundredths: halfUp(100 * num, den), answered, total: dims.length, partScored: answered < dims.length };
}

/** Panel spread — one opinion is never agreement; 0 always means a real panel that really agreed. */
export function panelAgreement(scores) {
  if (!Array.isArray(scores) || !scores.length) return { ok: false };
  for (const s of scores) if (typeof s !== 'number' || !Number.isInteger(s) || s < 100 || s > 500) return { ok: false };
  if (scores.length === 1) return { ok: true, raters: 1, spread: null };
  return { ok: true, raters: scores.length, spread: Math.max(...scores) - Math.min(...scores) };
}

/** Expert-slot double-booking guard: intervals, half-open checkout, cancelled never clashes. */
export function guardBooking(existing, candidate) {
  const nes = (v) => typeof v === 'string' && v.length > 0;
  if (!Array.isArray(existing)) return { ok: false };
  if (!po(candidate) || !nes(candidate.unit) || !validDate(candidate.checkin) || !validDate(candidate.checkout) || !(candidate.checkout > candidate.checkin)) return { ok: false };
  for (const b of existing) {
    if (!po(b) || !nes(b.id) || !nes(b.unit)) return { ok: false };
    if (b.status !== 'confirmed' && b.status !== 'cancelled') return { ok: false };
    if (!validDate(b.checkin) || !validDate(b.checkout) || !(b.checkout > b.checkin)) return { ok: false };
  }
  const conflictIds = existing
    .filter(e => e.unit === candidate.unit && e.status === 'confirmed' && e.checkin < candidate.checkout && candidate.checkin < e.checkout)
    .map(e => e.id);
  return { ok: true, clash: conflictIds.length > 0, conflictIds };
}

/** Tier computed from what actually ran — the Pages deploy is not a test; a tier claim is ignored. */
export function tierOf(record) {
  if (!po(record) || !Array.isArray(record.runs)) return { ok: false };
  for (const r of record.runs) {
    if (!po(r)) return { ok: false };
    if (typeof r.workflow !== 'string' || !r.workflow) return { ok: false };
    if (r.conclusion !== 'success' && r.conclusion !== 'failure') return { ok: false };
    if (typeof r.mutation !== 'boolean') return { ok: false };
  }
  const adm = record.runs.filter(r => r.workflow !== 'pages build and deployment');
  const proven = adm.some(r => r.conclusion === 'success' && r.mutation === true);
  const works = adm.some(r => r.conclusion === 'success');
  return { ok: true, tier: proven ? 'Proven' : works ? 'Works' : 'Prototype', evidence: adm.filter(r => r.conclusion === 'success').length };
}

export default invoiceTotals;
