/* Declarant — domain core. No dependencies, runs in the browser or Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Declarant = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 1;
  const STORAGE_KEY = 'declarant.workspace.v1';
  const SESSION_KEY = 'declarant.session.v1';
  const VERSION = '1.0.0';

  const STATUS = [
    { id: 'intake', label: 'Intake', short: 'Intake', hint: 'Draft file opened' },
    { id: 'docs', label: 'Documents', short: 'Docs', hint: 'Awaiting or verifying documents' },
    { id: 'lodged', label: 'Lodged', short: 'Lodged', hint: 'Declaration filed with customs' },
    { id: 'query', label: 'Customs query', short: 'Query', hint: 'Authority has raised a query' },
    { id: 'assessed', label: 'Assessed', short: 'Assessed', hint: 'Duty assessed by customs' },
    { id: 'duty', label: 'Duty due', short: 'Duty', hint: 'Tax demand issued' },
    { id: 'released', label: 'Released', short: 'Released', hint: 'Customs release granted' },
    { id: 'delivered', label: 'Delivered', short: 'Delivered', hint: 'Cargo handed over' },
    { id: 'closed', label: 'Closed', short: 'Closed', hint: 'File reconciled and closed' }
  ];
  const STATUS_MAP = Object.fromEntries(STATUS.map((s) => [s.id, s]));
  const PIPELINE = ['intake', 'docs', 'lodged', 'assessed', 'duty', 'released', 'delivered', 'closed'];
  const OPEN_STATUSES = ['intake', 'docs', 'lodged', 'query', 'assessed', 'duty', 'released', 'delivered'];
  const CLOSED_STATUSES = ['closed'];

  const MODES = {
    sea: { id: 'sea', label: 'Sea freight', short: 'Sea', doc: 'bill_of_lading', docLabel: 'Bill of lading' },
    air: { id: 'air', label: 'Air freight', short: 'Air', doc: 'air_waybill', docLabel: 'Air waybill' },
    road: { id: 'road', label: 'Road', short: 'Road', doc: 'road_manifest', docLabel: 'Road manifest / T1' },
    rail: { id: 'rail', label: 'Rail', short: 'Rail', doc: 'rail_consignment', docLabel: 'Rail consignment note' }
  };

  const INCOTERMS = ['CIF', 'CIP', 'FOB', 'CFR', 'CPT', 'DAP', 'DDP', 'EXW'];
  const PROCEDURES = ['Home use', 'Warehousing', 'Transit', 'Temporary import', 'Export'];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'ZAR', 'AED', 'CNY', 'INR'];

  const DOC_DEFS = {
    commercial_invoice: {
      label: 'Commercial invoice',
      hint: 'Seller, buyer, value, Incoterm and line detail',
      core: true
    },
    packing_list: {
      label: 'Packing list',
      hint: 'Packages, marks, weights and dimensions',
      core: true
    },
    declaration: {
      label: 'Import declaration',
      hint: 'Prepared declaration, validated against the invoice',
      core: true
    },
    bill_of_lading: {
      label: 'Bill of lading',
      hint: 'Ocean carrier document and release status',
      core: true
    },
    air_waybill: {
      label: 'Air waybill',
      hint: 'Air carrier document and consignment number',
      core: true
    },
    road_manifest: {
      label: 'Road manifest / T1',
      hint: 'Transit or cross-border road document',
      core: true
    },
    rail_consignment: {
      label: 'Rail consignment note',
      hint: 'Rail carrier document and wagon reference',
      core: true
    },
    certificate_of_origin: {
      label: 'Certificate of origin',
      hint: 'Required when a preferential tariff is claimed',
      core: false
    },
    insurance_certificate: {
      label: 'Insurance certificate',
      hint: 'Required for CIF and CIP terms',
      core: false
    },
    import_permit: {
      label: 'Import permit',
      hint: 'Regulated goods permit or authority approval',
      core: false
    },
    dangerous_goods: {
      label: 'Dangerous goods declaration',
      hint: 'Hazmat declaration and packing certificate',
      core: false
    },
    weight_certificate: {
      label: 'Weight certificate',
      hint: 'Optional independent weight or quality certificate',
      core: false
    },
    bank_evidence: {
      label: 'Bank payment evidence',
      hint: 'Optional proof of foreign exchange or payment',
      core: false
    }
  };

  const TARIFF = [
    { code: '3004.90.00', desc: 'Medicaments, retail packs', chapter: '30', unit: 'carton', duty: 0, prefDuty: 0, prefBloc: 'EAC', excise: 0, vat: 0, levy: 0, permit: true, dangerous: false, notes: 'Essential medicines; permit and batch records required.' },
    { code: '3822.00.00', desc: 'Diagnostic or laboratory reagents', chapter: '38', unit: 'pack', duty: 0, prefDuty: 0, prefBloc: 'EAC', excise: 0, vat: 0, levy: 0, permit: true, dangerous: false, notes: 'Cold-chain handling evidence may be requested.' },
    { code: '9018.90.00', desc: 'Medical, surgical instruments', chapter: '90', unit: 'set', duty: 0, prefDuty: 0, prefBloc: 'EAC', excise: 0, vat: 0, levy: 0, permit: true, dangerous: false, notes: 'Pharmacy and Poisons Board approval applies.' },
    { code: '8471.30.00', desc: 'Portable automatic data-processing machines', chapter: '84', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Laptops and tablets; accessories classified separately.' },
    { code: '8517.13.00', desc: 'Smartphones, cellular networks', chapter: '85', unit: 'unit', duty: 10, prefDuty: 0, prefBloc: 'AfCFTA', excise: 10, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Type approval may be requested by the regulator.' },
    { code: '8528.72.00', desc: 'Television reception apparatus', chapter: '85', unit: 'unit', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 15, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Screen size and technology affect classification.' },
    { code: '8504.40.00', desc: 'Static converters, power supplies', chapter: '85', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Confirm whether a complete machine or a part.' },
    { code: '8541.43.00', desc: 'Photovoltaic cells assembled in modules', chapter: '85', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Solar modules; mounting structures are separate.' },
    { code: '8544.42.00', desc: 'Insulated electric conductors, connectors', chapter: '85', unit: 'roll', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Voltage rating should be stated on the invoice.' },
    { code: '8419.89.00', desc: 'Machinery for temperature change', chapter: '84', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Industrial plant; installation spares classified separately.' },
    { code: '8421.21.00', desc: 'Water filtering and purifying machinery', chapter: '84', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Domestic filters may fall in a different subheading.' },
    { code: '8703.23.00', desc: 'Motor cars, 1,500–3,000 cc', chapter: '87', unit: 'unit', duty: 35, prefDuty: 25, prefBloc: 'AfCFTA', excise: 25, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Age, engine size and valuation evidence determine assessment.' },
    { code: '8704.21.00', desc: 'Goods vehicles, gross weight ≤ 5 t', chapter: '87', unit: 'unit', duty: 10, prefDuty: 5, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Body type and payload must match the invoice.' },
    { code: '8708.99.00', desc: 'Motor vehicle parts and accessories', chapter: '87', unit: 'carton', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Part number is the strongest classification evidence.' },
    { code: '4011.10.00', desc: 'New pneumatic tyres, motor cars', chapter: '40', unit: 'unit', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Include tyre size and load index on the invoice.' },
    { code: '0901.21.00', desc: 'Roasted coffee, not decaffeinated', chapter: '09', unit: 'bag', duty: 30, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Green coffee is classified under 0901.11.' },
    { code: '0402.10.00', desc: 'Milk powder, fat content ≤ 1.5%', chapter: '04', unit: 'bag', duty: 25, prefDuty: 10, prefBloc: 'EAC', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Food safety certificate may be requested.' },
    { code: '1006.30.00', desc: 'Semi-milled or wholly milled rice', chapter: '10', unit: 'bag', duty: 35, prefDuty: 20, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Rice imports may be subject to seasonal measures.' },
    { code: '3105.10.00', desc: 'Mineral or chemical fertilisers', chapter: '31', unit: 'bag', duty: 0, prefDuty: 0, prefBloc: 'EAC', excise: 0, vat: 0, levy: 0, permit: true, dangerous: false, notes: 'Agriculture regulator permit and label review apply.' },
    { code: '2309.90.00', desc: 'Animal feed preparations', chapter: '23', unit: 'bag', duty: 0, prefDuty: 0, prefBloc: 'EAC', excise: 0, vat: 0, levy: 0, permit: true, dangerous: false, notes: 'Feed registration and veterinary permit may apply.' },
    { code: '2710.19.90', desc: 'Other petroleum oils and preparations', chapter: '27', unit: 'drum', duty: 10, prefDuty: 10, prefBloc: '', excise: 20, vat: 16, levy: 3.5, permit: true, dangerous: true, notes: 'Class 3 dangerous goods; energy regulator approval.' },
    { code: '7208.51.00', desc: 'Flat-rolled iron or steel, width ≥ 600 mm', chapter: '72', unit: 'tonne', duty: 25, prefDuty: 10, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Measure thickness and grade against the mill certificate.' },
    { code: '7601.10.00', desc: 'Unwrought aluminium, not alloyed', chapter: '76', unit: 'tonne', duty: 7.5, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Purity and form must be stated.' },
    { code: '3901.10.00', desc: 'Polyethylene, specific gravity < 0.94', chapter: '39', unit: 'bag', duty: 7.5, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Prime versus off-grade material affects valuation.' },
    { code: '4819.10.00', desc: 'Cartons, boxes and cases of paper', chapter: '48', unit: 'bale', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Packaging imported flat may be classified elsewhere.' },
    { code: '6109.10.00', desc: 'Cotton t-shirts and singlets', chapter: '61', unit: 'carton', duty: 35, prefDuty: 20, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Knitted versus woven construction is decisive.' },
    { code: '6403.99.00', desc: 'Footwear with leather outer soles', chapter: '64', unit: 'carton', duty: 35, prefDuty: 20, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Upper material and sole material must be declared.' },
    { code: '9403.60.00', desc: 'Other wooden furniture', chapter: '94', unit: 'unit', duty: 35, prefDuty: 25, prefBloc: 'EAC', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Flat-packed furniture still attracts the furniture rate.' },
    { code: '9401.30.00', desc: 'Swivel seats with variable-height adjustment', chapter: '94', unit: 'unit', duty: 35, prefDuty: 25, prefBloc: 'EAC', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Office seating; parts classified separately.' },
    { code: '3304.99.00', desc: 'Beauty and skin-care preparations', chapter: '33', unit: 'carton', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 10, vat: 16, levy: 0, permit: true, dangerous: false, notes: 'Cosmetics notification and labelling apply.' },
    { code: '3917.39.00', desc: 'Flexible plastic tubes and pipes', chapter: '39', unit: 'roll', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Reinforced versus unreinforced construction matters.' },
    { code: '7318.15.00', desc: 'Screws, bolts, nuts of iron or steel', chapter: '73', unit: 'carton', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Include dimensions and tensile grade.' },
    { code: '9027.80.00', desc: 'Instruments for physical or chemical analysis', chapter: '90', unit: 'unit', duty: 0, prefDuty: 0, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Laboratory equipment; software licences excluded.' },
    { code: '8539.52.00', desc: 'Light-emitting diode (LED) lamps', chapter: '85', unit: 'carton', duty: 25, prefDuty: 15, prefBloc: 'AfCFTA', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Energy-efficiency standards may apply.' },
    { code: '0803.10.00', desc: 'Bananas, fresh or dried', chapter: '08', unit: 'carton', duty: 25, prefDuty: 10, prefBloc: 'EAC', excise: 0, vat: 16, levy: 0, permit: false, dangerous: false, notes: 'Phytosanitary certificate required at arrival.' }
  ];
  const TARIFF_MAP = Object.fromEntries(TARIFF.map((t) => [t.code, t]));

  const CHAPTER_NAMES = {
    '04': 'Dairy produce', '08': 'Edible fruit', '09': 'Coffee and spices', '10': 'Cereals',
    '23': 'Animal feed', '27': 'Mineral fuels', '30': 'Pharmaceutical products', '31': 'Fertilisers',
    '33': 'Cosmetics', '38': 'Miscellaneous chemicals', '39': 'Plastics', '40': 'Rubber',
    '48': 'Paper and board', '61': 'Knitted apparel', '64': 'Footwear', '72': 'Iron and steel',
    '73': 'Iron or steel articles', '76': 'Aluminium', '84': 'Machinery', '85': 'Electrical equipment',
    '87': 'Vehicles', '90': 'Instruments', '94': 'Furniture'
  };

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, places) {
    const p = Math.pow(10, places == null ? 2 : places);
    return Math.round((Number(value) || 0) * p) / p;
  }

  function num(value, fallback) {
    const n = typeof value === 'number' ? value : parseFloat(String(value == null ? '' : value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function money(value, currency, digits) {
    const amount = Number(value) || 0;
    const places = digits == null ? 2 : digits;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: places,
        maximumFractionDigits: places
      }).format(amount);
    } catch (e) {
      return '$' + amount.toFixed(places);
    }
  }

  function money0(value, currency) {
    return money(value, currency, 0);
  }

  function moneyCompact(value, currency) {
    const n = Number(value) || 0;
    const abs = Math.abs(n);
    const symbol = (currency || 'USD') === 'USD' ? '$' : (currency || 'USD') + ' ';
    if (abs >= 1000000) return symbol + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (abs >= 1000) return symbol + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return symbol + Math.round(n);
  }

  function pct(value, digits) {
    const n = Number(value) || 0;
    return n.toFixed(digits == null ? 1 : digits).replace(/\.0$/, '') + '%';
  }

  function pad(n, width) {
    return String(n).padStart(width || 2, '0');
  }

  function toDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isoDate(value) {
    const d = value == null ? new Date() : toDate(value);
    if (!d) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function isoStamp(value) {
    const d = value == null ? new Date() : toDate(value);
    return d ? d.toISOString() : '';
  }

  function addDays(value, days) {
    const d = toDate(value) || new Date();
    d.setDate(d.getDate() + (Number(days) || 0));
    return isoDate(d);
  }

  function daysBetween(from, to) {
    const a = toDate(from);
    const b = toDate(to);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function fmtDate(value, opts) {
    const d = toDate(value);
    if (!d) return '—';
    const options = opts || { day: '2-digit', month: 'short', year: 'numeric' };
    try { return new Intl.DateTimeFormat('en-GB', options).format(d); } catch (e) { return isoDate(d); }
  }

  function fmtShortDate(value) {
    return fmtDate(value, { day: '2-digit', month: 'short' });
  }

  function fmtDateTime(value) {
    const d = toDate(value);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(d);
    } catch (e) { return fmtDate(d); }
  }

  function relativeTime(value, now) {
    const d = toDate(value);
    if (!d) return '—';
    const base = now ? toDate(now) : new Date();
    const diff = Math.round((base.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return diff + 'm ago';
    if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
    if (diff < 10080) return Math.floor(diff / 1440) + 'd ago';
    return fmtShortDate(d);
  }

  function pluralize(count, singular, plural) {
    return count + ' ' + (count === 1 ? singular : (plural || singular + 's'));
  }

  function titleCase(value) {
    return String(value || '').replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function parseAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value == null ? '' : value).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
  }

  function csvEscape(value) {
    const s = value == null ? '' : String(value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(rows) {
    return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  }

  /* ------------------------------------------------------------------ *
   * SHA-256 (pure JS, so local file:// auth works without Web Crypto)
   * ------------------------------------------------------------------ */

  function utf8Bytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          i++;
          bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
        } else {
          bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
        }
      } else {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      }
    }
    return new Uint8Array(bytes);
  }

  const SHA_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function sha256(input) {
    const bytes = utf8Bytes(String(input));
    const bitLength = bytes.length * 8;
    const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);

    const h = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ ((~e) & g);
        const temp1 = (hh + S1 + ch + SHA_K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    let hex = '';
    for (let i = 0; i < h.length; i++) hex += h[i].toString(16).padStart(8, '0');
    return hex;
  }

  function makeSalt(length) {
    const bytes = new Uint8Array(length || 16);
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function hashPassword(password, salt) {
    let digest = String(salt) + ':' + String(password) + ':declarant';
    for (let i = 0; i < 2048; i++) digest = sha256(digest + ':' + i);
    return digest;
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------------------------------------------------ *
   * Documents, validation and calculations
   * ------------------------------------------------------------------ */

  function tariffFor(code) {
    return TARIFF_MAP[code] || null;
  }

  function modeDoc(entry) {
    const mode = MODES[entry && entry.mode] || MODES.sea;
    return mode.doc;
  }

  function entryHasTariffFlag(entry, flag) {
    return (entry.lines || []).some((line) => {
      const t = tariffFor(line.hs);
      return !!(t && t[flag]);
    });
  }

  function claimsPreference(entry) {
    return (entry.lines || []).some((line) => {
      const t = tariffFor(line.hs);
      return !!(line.preferential && t && t.prefDuty != null);
    });
  }

  function checklist(entry) {
    const mode = MODES[entry.mode] || MODES.sea;
    const commodityPermit = entryHasTariffFlag(entry, 'permit');
    const hazardous = entryHasTariffFlag(entry, 'dangerous');
    const insured = ['CIF', 'CIP'].indexOf(entry.incoterm) !== -1;
    const pref = claimsPreference(entry);
    const required = {
      commercial_invoice: true,
      packing_list: true,
      declaration: true,
      [mode.doc]: true,
      certificate_of_origin: pref,
      insurance_certificate: insured,
      import_permit: commodityPermit,
      dangerous_goods: hazardous,
      weight_certificate: false,
      bank_evidence: false
    };
    const order = ['commercial_invoice', 'packing_list', 'declaration', mode.doc, 'certificate_of_origin', 'insurance_certificate', 'import_permit', 'dangerous_goods', 'weight_certificate', 'bank_evidence'];
    const seen = {};
    return order.filter((key) => {
      if (seen[key]) return false;
      seen[key] = true;
      return !!DOC_DEFS[key];
    }).map((key) => ({
      key: key,
      label: DOC_DEFS[key].label,
      hint: DOC_DEFS[key].hint,
      required: !!required[key],
      status: (entry.docs && entry.docs[key]) || 'missing'
    }));
  }

  function docSummary(entry) {
    const list = checklist(entry);
    const required = list.filter((d) => d.required);
    const verified = required.filter((d) => d.status === 'verified').length;
    const received = required.filter((d) => d.status === 'received').length;
    const missing = required.length - verified - received;
    return {
      list: list,
      required: required.length,
      verified: verified,
      received: received,
      missing: missing,
      complete: required.length > 0 && verified === required.length,
      percent: required.length ? Math.round((verified / required.length) * 100) : 100
    };
  }

  function validateEntry(entry) {
    const errors = {};
    const list = [];
    const add = (field, message) => {
      if (!errors[field]) errors[field] = message;
      list.push({ field: field, message: message });
    };
    if (!entry.clientId) add('clientId', 'Select a client.');
    if (!String(entry.reference || '').trim()) add('reference', 'Add the client or supplier reference.');
    if (!MODES[entry.mode]) add('mode', 'Select a transport mode.');
    if (!String(entry.port || '').trim()) add('port', 'Add the port or border post.');
    if (!String(entry.eta || '').trim()) add('eta', 'Add the estimated arrival date.');
    if (!entry.incoterm) add('incoterm', 'Select an Incoterm.');
    if (!entry.procedure) add('procedure', 'Select a customs procedure.');
    if (CURRENCIES.indexOf(entry.currency) === -1) add('currency', 'Select a supported invoice currency.');
    if (!(Number(entry.fxRate) > 0)) add('fxRate', 'The exchange rate must be greater than zero.');
    if (num(entry.freight) < 0) add('freight', 'Freight cannot be negative.');
    if (num(entry.insurance) < 0) add('insurance', 'Insurance cannot be negative.');
    if (num(entry.serviceFee) < 0) add('serviceFee', 'The clearance fee cannot be negative.');

    if (!Array.isArray(entry.lines) || entry.lines.length === 0) {
      add('lines', 'Add at least one commodity line.');
    } else {
      entry.lines.forEach((line, i) => {
        const label = 'Line ' + (i + 1);
        const t = tariffFor(line.hs);
        if (!t) add('lines', label + ': select a valid HS tariff code.');
        if (!String(line.description || '').trim()) add('lines', label + ': add a goods description.');
        if (num(line.qty) <= 0) add('lines', label + ': quantity must be greater than zero.');
        if (num(line.unitValue) < 0) add('lines', label + ': unit value cannot be negative.');
        if (num(line.weight) < 0) add('lines', label + ': weight cannot be negative.');
        if (line.preferential && (!t || t.prefDuty == null)) add('lines', label + ': this tariff line has no preferential rate.');
      });
    }

    return { valid: list.length === 0, errors: errors, list: list };
  }

  function calculateEntry(entry, now) {
    const tariff = TARIFF_MAP;
    const lines = Array.isArray(entry.lines) ? entry.lines : [];
    const fx = num(entry.fxRate, 1) > 0 ? num(entry.fxRate, 1) : 1;
    const freight = Math.max(0, num(entry.freight));
    const insurance = Math.max(0, num(entry.insurance));
    const charges = freight + insurance;
    const fobTotal = lines.reduce((sum, line) => sum + num(line.qty) * num(line.unitValue), 0);
    const weightTotal = lines.reduce((sum, line) => sum + num(line.weight), 0);
    let allocated = 0;
    let fobTotalRounded = 0;

    const computedLines = lines.map((line, index) => {
      const fob = num(line.qty) * num(line.unitValue);
      const share = fobTotal > 0 ? fob / fobTotal : (lines.length ? 1 / lines.length : 0);
      let allocation = index === lines.length - 1
        ? charges - allocated
        : charges * share;
      if (!Number.isFinite(allocation)) allocation = 0;
      allocated += allocation;
      const cif = fob + allocation;
      const t = tariff[line.hs] || { duty: 0, excise: 0, vat: 0, levy: 0, prefDuty: null, prefBloc: '' };
      const prefApplied = !!(line.preferential && t.prefDuty != null);
      const dutyRate = prefApplied ? t.prefDuty : t.duty;
      const duty = round(cif * (num(dutyRate) / 100));
      const excise = round((cif + duty) * (num(t.excise) / 100));
      const levy = round(cif * (num(t.levy) / 100));
      const vatBase = cif + duty + excise + levy;
      const vat = round(vatBase * (num(t.vat) / 100));
      const taxes = round(duty + excise + levy + vat);
      const standardDuty = round(cif * (num(t.duty) / 100));
      const preferenceSaving = prefApplied ? round(Math.max(0, standardDuty - duty)) : 0;
      fobTotalRounded += fob;
      return {
        key: line.id || 'line-' + index,
        hs: line.hs || '',
        description: line.description || (t.desc || ''),
        tariffDescription: t.desc || '',
        qty: num(line.qty),
        unit: line.unit || t.unit || 'unit',
        unitValue: num(line.unitValue),
        weight: num(line.weight),
        origin: line.origin || '',
        preferential: !!line.preferential,
        prefApplied: prefApplied,
        prefBloc: t.prefBloc || '',
        dutyRate: num(t.duty),
        appliedDutyRate: num(dutyRate),
        exciseRate: num(t.excise),
        vatRate: num(t.vat),
        levyRate: num(t.levy),
        fob: round(fob),
        allocation: round(allocation),
        cif: round(cif),
        cifUsd: round(cif * fx),
        duty: round(duty * fx),
        excise: round(excise * fx),
        levy: round(levy * fx),
        vat: round(vat * fx),
        vatBase: round(vatBase * fx),
        taxes: round(taxes * fx),
        landed: round((cif + taxes) * fx),
        standardDuty: round(standardDuty * fx),
        preferenceSaving: round(preferenceSaving * fx)
      };
    });

    const totals = computedLines.reduce((acc, line) => {
      acc.fob += line.fob;
      acc.cif += line.cif;
      acc.duty += line.duty;
      acc.excise += line.excise;
      acc.levy += line.levy;
      acc.vat += line.vat;
      acc.taxes += line.taxes;
      acc.landed += line.landed;
      acc.preferenceSaving += line.preferenceSaving;
      acc.weight += line.weight;
      return acc;
    }, { fob: 0, cif: 0, duty: 0, excise: 0, levy: 0, vat: 0, taxes: 0, landed: 0, preferenceSaving: 0, weight: 0 });

    Object.keys(totals).forEach((key) => { totals[key] = round(totals[key]); });
    const fee = Math.max(0, num(entry.serviceFee));
    const otherCharges = round((freight + insurance) * fx);
    const grandTotal = round(totals.landed + fee);
    const effectiveRate = totals.cif > 0 ? round((totals.taxes / totals.cif) * 100) : 0;

    return {
      lines: computedLines,
      fx: fx,
      currency: entry.currency || 'USD',
      freightInvoice: round(freight),
      insuranceInvoice: round(insurance),
      fobInvoice: round(fobTotal),
      cifInvoice: round(fobTotal + charges),
      fobUsd: round(fobTotal * fx),
      freightUsd: round(freight * fx),
      insuranceUsd: round(insurance * fx),
      otherChargesUsd: otherCharges,
      cifUsd: round((fobTotal + charges) * fx),
      totals: totals,
      fee: round(fee),
      grandTotal: grandTotal,
      totalRecoverable: round(totals.taxes + fee),
      effectiveRate: effectiveRate,
      weight: round(weightTotal, 3)
    };
  }

  function entryExposure(entry, now) {
    const today = isoDate(now || new Date());
    const arrival = entry.arrivalDate || entry.eta || '';
    const freeDays = Math.max(0, num(entry.freeDays, 5));
    const storage = Math.max(0, num(entry.storageRate, 0));
    const detention = Math.max(0, num(entry.detentionRate, 0));
    const daily = round(storage + detention);
    if (!arrival) {
      return { hasArrival: false, arrival: '', freeUntil: '', daysAtPort: 0, daysOver: 0, daysRemaining: null, daily: daily, exposure: 0, state: 'unknown', released: false };
    }
    const end = ['released', 'delivered', 'closed'].indexOf(entry.status) !== -1
      ? (entry.releasedAt || entry.deliveredAt || today)
      : today;
    const freeUntil = addDays(arrival, freeDays);
    const daysAtPort = Math.max(0, daysBetween(arrival, end));
    const daysOver = Math.max(0, daysBetween(freeUntil, end));
    const daysRemaining = daysBetween(today, freeUntil);
    const released = ['released', 'delivered', 'closed'].indexOf(entry.status) !== -1;
    return {
      hasArrival: true,
      arrival: arrival,
      freeUntil: freeUntil,
      daysAtPort: daysAtPort,
      daysOver: daysOver,
      daysRemaining: daysRemaining,
      daily: daily,
      exposure: round(daysOver * daily),
      state: released ? 'released' : (daysOver > 0 ? 'overdue' : (daysRemaining <= 2 ? 'due' : 'in-free')),
      released: released
    };
  }

  function disbPaid(disb) {
    if (!disb) return 0;
    if (Array.isArray(disb.payments) && disb.payments.length) {
      return round(disb.payments.reduce((sum, p) => sum + (num(p.amount)), 0));
    }
    return round(num(disb.paidAmount));
  }

  function disbOutstanding(disb) {
    return round(Math.max(0, num(disb.amount) - disbPaid(disb)));
  }

  function disbState(disb, now) {
    if (disb.void) return 'void';
    const outstanding = disbOutstanding(disb);
    if (outstanding <= 0.009) return 'paid';
    if (disb.dueDate && daysBetween(disb.dueDate, isoDate(now || new Date())) > 0) return 'overdue';
    if (disbPaid(disb) > 0) return 'partial';
    return 'due';
  }

  function agingBucket(disb, now) {
    const outstanding = disbOutstanding(disb);
    if (outstanding <= 0.009) return 'paid';
    if (!disb.dueDate) return 'current';
    const overdue = Math.max(0, daysBetween(disb.dueDate, isoDate(now || new Date())));
    if (overdue === 0) return 'current';
    if (overdue <= 14) return '1-14';
    if (overdue <= 30) return '15-30';
    if (overdue <= 60) return '31-60';
    return '60+';
  }

  function agingSummary(disbursements, now) {
    const summary = { current: 0, '1-14': 0, '15-30': 0, '31-60': 0, '60+': 0, paid: 0, total: 0, overdue: 0 };
    (disbursements || []).forEach((disb) => {
      if (disb.void) return;
      const bucket = agingBucket(disb, now);
      const outstanding = disbOutstanding(disb);
      summary[bucket] += outstanding;
      summary.total += outstanding;
      if (bucket !== 'current' && bucket !== 'paid') summary.overdue += outstanding;
    });
    Object.keys(summary).forEach((key) => { summary[key] = round(summary[key]); });
    return summary;
  }

  function entryBalance(entry, disbursements) {
    const calc = calculateEntry(entry);
    const disbs = (disbursements || []).filter((d) => d.entryId === entry.id && !d.void);
    const charged = round(disbs.reduce((sum, d) => sum + num(d.amount), 0) + calc.fee);
    const paid = round(disbs.reduce((sum, d) => sum + disbPaid(d), 0));
    return { charged: charged, paid: paid, outstanding: round(Math.max(0, charged - paid)) };
  }

  function statementData(client, entries, disbursements, from, to, now) {
    const fromDate = from || addDays(to || isoDate(now || new Date()), -30);
    const toDateValue = to || isoDate(now || new Date());
    const clientEntries = (entries || []).filter((e) => e.clientId === client.id);
    const clientDisbs = (disbursements || []).filter((d) => d.clientId === client.id && !d.void);
    const ledger = [];

    clientEntries.forEach((entry) => {
      const date = entry.billedAt || entry.createdAt || entry.eta;
      const fee = num(entry.serviceFee);
      if (!date || fee <= 0) return;
      ledger.push({
        date: isoDate(date),
        ref: entry.id,
        description: 'Customs clearance fee — ' + (entry.reference || entry.id),
        kind: 'Professional fee',
        charge: fee,
        payment: 0
      });
    });

    clientDisbs.forEach((disb) => {
      const date = disb.incurredDate || disb.createdAt;
      if (!date) return;
      ledger.push({
        date: isoDate(date),
        ref: disb.ref || disb.id,
        description: disb.description || disb.type || 'Disbursement',
        kind: disb.type || 'Disbursement',
        charge: num(disb.amount),
        payment: 0
      });
      (disb.payments || []).forEach((payment) => {
        if (!payment.date) return;
        ledger.push({
          date: isoDate(payment.date),
          ref: payment.ref || disb.ref || disb.id,
          description: 'Payment received — ' + (disb.ref || disb.type),
          kind: 'Receipt',
          charge: 0,
          payment: num(payment.amount)
        });
      });
    });

    ledger.sort((a, b) => (a.date === b.date ? (a.charge ? -1 : 1) : (a.date < b.date ? -1 : 1)));

    let opening = 0;
    let charges = 0;
    let payments = 0;
    let balance = 0;
    const rows = [];
    ledger.forEach((row) => {
      if (row.date < fromDate) {
        opening = round(opening + row.charge - row.payment);
      } else if (row.date <= toDateValue) {
        charges = round(charges + row.charge);
        payments = round(payments + row.payment);
        balance = round(balance + row.charge - row.payment);
        rows.push(Object.assign({}, row, { balance: round(opening + balance) }));
      }
    });

    return {
      client: client,
      from: fromDate,
      to: toDateValue,
      opening: round(opening),
      charges: round(charges),
      payments: round(payments),
      closing: round(opening + charges - payments),
      rows: rows,
      currency: 'USD',
      generatedAt: new Date().toISOString()
    };
  }

  function transitionCheck(entry, target, disbursements) {
    const issues = [];
    if (target === 'lodged') {
      const v = validateEntry(entry);
      if (!v.valid) issues.push(...v.list.map((i) => i.message));
      const docs = docSummary(entry);
      if (!docs.complete) issues.push(docs.missing + ' required document' + (docs.missing === 1 ? '' : 's') + ' still missing or unverified.');
    }
    if (target === 'released') {
      const duty = (disbursements || []).filter((d) => d.entryId === entry.id && d.type === 'Duty & taxes' && !d.void);
      if (!duty.length) {
        issues.push('Raise and settle a duty demand before releasing cargo.');
      } else {
        const unpaid = duty.reduce((sum, d) => sum + disbOutstanding(d), 0);
        if (unpaid > 0.009) issues.push('Duty and taxes are not fully paid (' + money(unpaid) + ' outstanding).');
      }
    }
    return { ok: issues.length === 0, issues: issues };
  }

  function nextStatus(status) {
    if (status === 'query') return 'assessed';
    const i = PIPELINE.indexOf(status);
    if (i === -1 || i === PIPELINE.length - 1) return null;
    return PIPELINE[i + 1];
  }

  function statusAge(entry, now) {
    const timeline = entry.timeline || [];
    const last = timeline.slice().reverse().find((item) => item.status === entry.status);
    const since = last ? last.at : entry.createdAt;
    return Math.max(0, daysBetween(since, isoDate(now || new Date())));
  }

  function documentComplete(entry, key) {
    return !!(entry.docs && entry.docs[key] === 'verified');
  }

  /* ------------------------------------------------------------------ *
   * Persistence (every access guarded; memory fallback is in app.js)
   * ------------------------------------------------------------------ */

  let storageUsable = null;

  function storageAvailable() {
    if (storageUsable !== null) return storageUsable;
    try {
      const key = '__declarant_probe__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      storageUsable = true;
    } catch (e) {
      storageUsable = false;
    }
    return storageUsable;
  }

  function readRaw(key) {
    try {
      return { ok: true, value: (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null) };
    } catch (e) {
      return { ok: false, value: null, error: e.message };
    }
  }

  function writeRaw(key, value) {
    try {
      if (typeof localStorage === 'undefined') throw new Error('Storage is unavailable.');
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function removeRaw(key) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function loadWorkspace() {
    const raw = readRaw(STORAGE_KEY);
    if (!raw.ok) return { ok: false, data: null, warning: 'Browser storage is blocked. Changes will last for this tab only.' };
    if (!raw.value) return { ok: true, data: null, empty: true };
    try {
      const data = JSON.parse(raw.value);
      if (!data || data.schema !== SCHEMA || !Array.isArray(data.users) || !Array.isArray(data.entries)) {
        return { ok: false, data: null, warning: 'Saved data uses an unknown format. A fresh demo workspace was created.' };
      }
      return { ok: true, data: data };
    } catch (e) {
      return { ok: false, data: null, warning: 'Saved data could not be read. A fresh demo workspace was created.' };
    }
  }

  function saveWorkspace(data) {
    return writeRaw(STORAGE_KEY, JSON.stringify(data));
  }

  function loadSession() {
    const raw = readRaw(SESSION_KEY);
    if (!raw.ok || !raw.value) return null;
    try { return JSON.parse(raw.value); } catch (e) { return null; }
  }

  function saveSession(session) {
    return writeRaw(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    return removeRaw(SESSION_KEY);
  }

  return {
    VERSION: VERSION,
    SCHEMA: SCHEMA,
    STORAGE_KEY: STORAGE_KEY,
    SESSION_KEY: SESSION_KEY,
    STATUS: STATUS,
    STATUS_MAP: STATUS_MAP,
    PIPELINE: PIPELINE,
    OPEN_STATUSES: OPEN_STATUSES,
    CLOSED_STATUSES: CLOSED_STATUSES,
    MODES: MODES,
    MODE_LIST: Object.values(MODES),
    INCOTERMS: INCOTERMS,
    PROCEDURES: PROCEDURES,
    CURRENCIES: CURRENCIES,
    DOC_DEFS: DOC_DEFS,
    TARIFF: TARIFF,
    TARIFF_MAP: TARIFF_MAP,
    CHAPTER_NAMES: CHAPTER_NAMES,
    esc: esc,
    clamp: clamp,
    round: round,
    num: num,
    money: money,
    money0: money0,
    moneyCompact: moneyCompact,
    pct: pct,
    pad: pad,
    toDate: toDate,
    isoDate: isoDate,
    isoStamp: isoStamp,
    addDays: addDays,
    daysBetween: daysBetween,
    fmtDate: fmtDate,
    fmtShortDate: fmtShortDate,
    fmtDateTime: fmtDateTime,
    relativeTime: relativeTime,
    pluralize: pluralize,
    titleCase: titleCase,
    parseAmount: parseAmount,
    validEmail: validEmail,
    csvEscape: csvEscape,
    toCSV: toCSV,
    sha256: sha256,
    makeSalt: makeSalt,
    hashPassword: hashPassword,
    uid: uid,
    tariffFor: tariffFor,
    modeDoc: modeDoc,
    entryHasTariffFlag: entryHasTariffFlag,
    claimsPreference: claimsPreference,
    checklist: checklist,
    docSummary: docSummary,
    validateEntry: validateEntry,
    calculateEntry: calculateEntry,
    entryExposure: entryExposure,
    disbPaid: disbPaid,
    disbOutstanding: disbOutstanding,
    disbState: disbState,
    agingBucket: agingBucket,
    agingSummary: agingSummary,
    entryBalance: entryBalance,
    statementData: statementData,
    transitionCheck: transitionCheck,
    nextStatus: nextStatus,
    statusAge: statusAge,
    documentComplete: documentComplete,
    storageAvailable: storageAvailable,
    loadWorkspace: loadWorkspace,
    saveWorkspace: saveWorkspace,
    loadSession: loadSession,
    saveSession: saveSession,
    clearSession: clearSession
  };
});
