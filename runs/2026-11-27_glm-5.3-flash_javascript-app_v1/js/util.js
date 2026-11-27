/* Fiscus — utility helpers: ids, dates, money parsing/formatting, escaping.
   Loaded first; every module hangs off the single global namespace `F`. */
window.F = window.F || {};

F.util = (function () {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const CURRENCIES = [
    { code: 'USD', symbol: '$',   decimals: 2, label: 'US Dollar' },
    { code: 'EUR', symbol: '€',   decimals: 2, label: 'Euro' },
    { code: 'GBP', symbol: '£',   decimals: 2, label: 'British Pound' },
    { code: 'JPY', symbol: '¥',   decimals: 0, label: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥',   decimals: 2, label: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹',   decimals: 2, label: 'Indian Rupee' },
    { code: 'AUD', symbol: 'A$',  decimals: 2, label: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$',  decimals: 2, label: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF', decimals: 2, label: 'Swiss Franc' },
    { code: 'SEK', symbol: 'kr',  decimals: 2, label: 'Swedish Krona' },
    { code: 'NZD', symbol: 'NZ$', decimals: 2, label: 'New Zealand Dollar' },
    { code: 'SGD', symbol: 'S$',  decimals: 2, label: 'Singapore Dollar' },
    { code: 'MXN', symbol: 'MX$', decimals: 2, label: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$',  decimals: 2, label: 'Brazilian Real' },
    { code: 'ZAR', symbol: 'R',   decimals: 2, label: 'South African Rand' }
  ];

  const SEED_COLORS = [
    { hex: '#3f8f5c', name: 'Green' },
    { hex: '#1f6f54', name: 'Deep green' },
    { hex: '#2f7fbf', name: 'Blue' },
    { hex: '#0e9aa7', name: 'Teal' },
    { hex: '#7c5cd6', name: 'Purple' },
    { hex: '#c2477f', name: 'Pink' },
    { hex: '#d97706', name: 'Amber' },
    { hex: '#cf5f4e', name: 'Red' },
    { hex: '#8a6d3b', name: 'Brown' },
    { hex: '#64748b', name: 'Slate' }
  ];

  // Amounts are stored as integers in minor units (e.g. cents).
  const MAX_AMOUNT_MINOR = 999999999;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- dates ---------- */

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isValidISODate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function monthOfISO(s) { return s.slice(0, 7); }

  function currentMonth() { return todayISO().slice(0, 7); }

  function isMonth(m) {
    return typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  }

  function addMonths(m, n) {
    const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1;
    const d = new Date(y, mo + n, 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }

  function addDays(iso, n) {
    const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function daysInMonth(m) {
    return new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
  }

  function monthLabel(m) { return MONTHS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4); }
  function monthLabelShort(m) { return MONTHS[+m.slice(5, 7) - 1].slice(0, 3) + ' ' + m.slice(0, 4); }
  function formatDate(iso) { return iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1].slice(0, 3) + ' ' + iso.slice(0, 4); }
  function formatDateShort(iso) { return iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1].slice(0, 3); }

  function dayLabel(iso) {
    const t = todayISO();
    if (iso === t) return 'Today';
    if (iso === addDays(t, -1)) return 'Yesterday';
    return formatDate(iso);
  }

  /* ---------- money ---------- */

  function currencyByCode(code) {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  }

  function groupDigits(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function moneyStr(cur, abs) {
    const div = Math.pow(10, cur.decimals);
    const units = Math.floor(abs / div);
    const frac = cur.decimals ? '.' + String(abs % div).padStart(cur.decimals, '0') : '';
    const num = groupDigits(String(units)) + frac;
    // Alphabetic symbols (CHF, kr) get a space; glyph symbols ($, €) hug the number.
    return /[A-Za-z]/.test(cur.symbol) ? cur.symbol + ' ' + num : cur.symbol + num;
  }

  // `minor` is an integer in minor units; the result is never signed.
  function formatMoney(minor, code) {
    return moneyStr(currencyByCode(code), Math.abs(Math.round(minor || 0)));
  }

  function formatMoneySigned(minor, code) {
    const v = Math.round(minor || 0);
    if (v > 0) return '+' + formatMoney(v, code);
    if (v < 0) return '\u2212' + formatMoney(v, code);
    return formatMoney(0, code);
  }

  // Compact axis labels: 123456 minor → "$1.2k".
  function formatCompact(minor, code) {
    const cur = currencyByCode(code);
    const div = Math.pow(10, cur.decimals);
    const v = Math.round(Math.abs(minor || 0) / div);
    const sym = /[A-Za-z]/.test(cur.symbol) ? cur.symbol + ' ' : cur.symbol;
    if (v >= 1e6) return sym + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1e3) return sym + (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return sym + v;
  }

  // Accepts "12", "12.5", "12,50" etc. Returns {ok:true, minor} or {ok:false, error}.
  function parseAmountInput(str, decimals) {
    const s = String(str == null ? '' : str).trim();
    if (!s) return { ok: false, error: 'Enter an amount.' };
    if (!/^\d{1,10}([.,]\d+)?$/.test(s)) return { ok: false, error: 'Use digits only, e.g. 24.50' };
    const frac = s.indexOf('.') !== -1 ? s.slice(s.indexOf('.') + 1)
      : s.indexOf(',') !== -1 ? s.slice(s.indexOf(',') + 1) : '';
    if (frac.length > decimals) {
      return {
        ok: false,
        error: decimals
          ? 'Use at most ' + decimals + ' decimal place' + (decimals === 1 ? '' : 's') + '.'
          : 'Whole numbers only for this currency.'
      };
    }
    const value = parseFloat(s.replace(',', '.'));
    const minor = Math.round(value * Math.pow(10, decimals));
    if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'Amount is too large.' };
    return { ok: true, minor: minor };
  }

  // Renders a minor-unit integer as a plain editable string ("600", "123.5").
  function minorToInput(minor, code) {
    const cur = currencyByCode(code);
    let s = (minor / Math.pow(10, cur.decimals)).toFixed(cur.decimals);
    if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  /* ---------- misc ---------- */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, ch => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function hexColorValid(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }

  return {
    MONTHS, CURRENCIES, SEED_COLORS, MAX_AMOUNT_MINOR,
    uid, pad2,
    todayISO, isValidISODate, monthOfISO, currentMonth, isMonth,
    addMonths, addDays, daysInMonth,
    monthLabel, monthLabelShort, formatDate, formatDateShort, dayLabel,
    currencyByCode, formatMoney, formatMoneySigned, formatCompact,
    parseAmountInput, minorToInput,
    esc, debounce, plural, clamp, hexColorValid
  };
})();
