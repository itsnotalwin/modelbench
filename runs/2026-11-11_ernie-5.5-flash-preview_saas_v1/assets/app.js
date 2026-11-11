/* Clearway — local-first customs clearance desk. No dependencies, no server. */
(() => {
  'use strict';

  const APP_VERSION = '1.0.0';
  const STORAGE_KEY = 'clearway.db.v1';
  const SESSION_KEY = 'clearway.session.v1';
  const PREFS_KEY = 'clearway.prefs.v1';

  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const commandRoot = document.getElementById('command-root');
  const toastRoot = document.getElementById('toast-root');

  /* ------------------------------------------------------------------ *
   *  Constants
   * ------------------------------------------------------------------ */

  const STATUSES = {
    draft: { label: 'Draft', rank: 1, description: 'Not ready for review' },
    awaiting_docs: { label: 'Awaiting docs', rank: 2, description: 'Waiting on required documents' },
    ready: { label: 'Ready to file', rank: 3, description: 'Documents complete; entry can be filed' },
    filed: { label: 'Filed', rank: 4, description: 'Entry submitted; awaiting release' },
    cleared: { label: 'Cleared', rank: 5, description: 'Released and closed' },
    hold: { label: 'On hold', rank: 2.5, description: 'Paused for review' },
    cancelled: { label: 'Cancelled', rank: 9, description: 'Job closed without filing' }
  };
  const STATUS_KEYS = Object.keys(STATUSES);
  const ACTIVE_STATUSES = ['draft', 'awaiting_docs', 'ready', 'filed', 'hold'];
  const NEXT_STATUS = {
    draft: ['awaiting_docs', 'hold', 'cancelled'],
    awaiting_docs: ['ready', 'hold', 'cancelled'],
    ready: ['filed', 'hold', 'cancelled'],
    filed: ['cleared', 'hold', 'cancelled'],
    hold: ['awaiting_docs', 'ready', 'filed', 'cleared', 'cancelled'],
    cleared: [],
    cancelled: []
  };
  const MODES = ['Ocean FCL', 'Ocean LCL', 'Air', 'Road', 'Rail'];
  const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP'];
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'MXN'];
  const DOC_TYPES = [
    'Commercial Invoice',
    'Packing List',
    'Bill of Lading / AWB',
    'Certificate of Origin',
    'Import License',
    'Insurance Certificate',
    'ISF Filing',
    'Other'
  ];
  const US_PORTS = [
    'Long Beach, CA', 'Los Angeles, CA', 'Newark, NJ', 'New York, NY',
    'Savannah, GA', 'Chicago, IL', 'Miami, FL', 'Seattle, WA', 'Houston, TX'
  ];
  const PAGE_META = {
    dashboard: { label: 'Dashboard', icon: 'grid' },
    shipments: { label: 'Shipments', icon: 'box' },
    entry: { label: 'Entry desk', icon: 'file' },
    documents: { label: 'Documents', icon: 'docs' },
    clients: { label: 'Clients', icon: 'users' },
    reports: { label: 'Reports', icon: 'chart' },
    settings: { label: 'Settings', icon: 'settings' }
  };

  /* ------------------------------------------------------------------ *
   *  Tiny storage layer — every access is guarded
   * ------------------------------------------------------------------ */

  const memoryStore = new Map();
  let storageOk = true;

  const Store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return memoryStore.has(key) ? memoryStore.get(key) : fallback;
        return JSON.parse(raw);
      } catch (err) {
        if (memoryStore.has(key)) return memoryStore.get(key);
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        memoryStore.set(key, value);
        return true;
      } catch (err) {
        storageOk = false;
        try { memoryStore.set(key, value); } catch (_) {}
        return false;
      }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); } catch (_) {}
      memoryStore.delete(key);
    }
  };

  /* ------------------------------------------------------------------ *
   *  Utilities
   * ------------------------------------------------------------------ */

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const uid = (prefix = 'id') => {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${prefix}_${window.crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      }
    } catch (_) {}
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  };

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const num = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const nowISO = () => new Date().toISOString();
  const todayDate = () => {
    const d = new Date();
    d.setUTCHours(12, 0, 0, 0);
    return d;
  };
  const dateOnly = (value) => {
    if (!value) return null;
    const str = String(value).slice(0, 10);
    const d = new Date(`${str}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const isoDaysFromNow = (days) => {
    const d = todayDate();
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  };
  const isoDateTimeDaysAgo = (days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Number(days || 0));
    return d.toISOString();
  };
  const isValidDate = (value) => Boolean(value && dateOnly(value));
  const dayDiff = (value) => {
    const d = dateOnly(value);
    if (!d) return null;
    return Math.round((d.getTime() - todayDate().getTime()) / 86400000);
  };
  const formatDate = (value) => {
    const d = dateOnly(value);
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  };
  const formatDateShort = (value) => {
    const d = dateOnly(value);
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(d);
  };
  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
  };
  const relativeDate = (value) => {
    const diff = dayDiff(value);
    if (diff === null) return '—';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff <= 14) return `In ${diff} days`;
    if (diff < -1 && diff >= -14) return `${Math.abs(diff)} days ago`;
    return formatDateShort(value);
  };
  const relativeTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDateTime(value).split(',')[0];
  };
  const money = (value, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(num(value));
    } catch (_) {
      return `${currency} ${num(value).toFixed(2)}`;
    }
  };
  const moneyCompact = (value, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1
      }).format(num(value));
    } catch (_) {
      return money(value, currency);
    }
  };
  const number = (value, digits = 0) => new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  }).format(num(value));
  const initials = (name) => String(name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase() || '?';
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const csvCell = (value) => {
    const s = String(value ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCSV = (rows) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const downloadFile = (filename, content, mime = 'text/plain;charset=utf-8') => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      showToast('The download could not be created in this browser.', 'warn');
    }
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${esc(name)}"></use></svg>`;

  const iconForMode = (mode) => {
    if (String(mode).startsWith('Ocean')) return 'ship';
    if (mode === 'Air') return 'plane';
    if (mode === 'Road') return 'truck';
    if (mode === 'Rail') return 'train';
    return 'box';
  };

  /* ------------------------------------------------------------------ *
   *  Password hashing (local-only demo security)
   * ------------------------------------------------------------------ */

  function utf8Binary(str) {
    const bytes = new TextEncoder().encode(str);
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  function sha256(ascii) {
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = sha256.h = sha256.h || [];
    let k = sha256.k = sha256.k || [];
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  function hashPassword(password, salt) {
    let h = sha256(utf8Binary(`${salt}:${password}`));
    for (let i = 0; i < 1200; i++) h = sha256(utf8Binary(`${salt}:${h}:${i}`));
    return h;
  }

  const verifyPassword = (password, user) => {
    if (!user || !user.salt || !user.passwordHash) return false;
    return hashPassword(password, user.salt) === user.passwordHash;
  };

  const makeSalt = () => {
    try {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return `salt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  /* ------------------------------------------------------------------ *
   *  Seed data
   * ------------------------------------------------------------------ */

  const CLIENT_SEED = [
    {
      id: 'cl_northwind', name: 'Northwind Trading Co.', contact: 'Elena Park',
      email: 'elena@northwind.co', phone: '+1 310 555 0142',
      address: '1400 Harbor Way, Long Beach, CA 90802', taxId: 'EIN 84-2910337',
      terms: 'Net 15', status: 'active', createdAt: isoDateTimeDaysAgo(280)
    },
    {
      id: 'cl_aster', name: 'Aster Home', contact: 'Lena Ortiz',
      email: 'lena@asterhome.co', phone: '+1 646 555 0188',
      address: '88 Franklin Street, Brooklyn, NY 11222', taxId: 'EIN 47-8820135',
      terms: 'Net 30', status: 'active', createdAt: isoDateTimeDaysAgo(214)
    },
    {
      id: 'cl_kite', name: 'Kite & Kin', contact: 'Marcus Chen',
      email: 'marcus@kiteandkin.com', phone: '+1 503 555 0119',
      address: '2100 NW Quimby Street, Portland, OR 97210', taxId: 'EIN 93-1827440',
      terms: 'Net 15', status: 'active', createdAt: isoDateTimeDaysAgo(168)
    },
    {
      id: 'cl_meridian', name: 'Meridian Works', contact: 'Priya Shah',
      email: 'priya@meridianworks.io', phone: '+1 312 555 0164',
      address: '410 N Wells Street, Chicago, IL 60654', taxId: 'EIN 36-4901882',
      terms: 'Net 30', status: 'active', createdAt: isoDateTimeDaysAgo(132)
    },
    {
      id: 'cl_solstice', name: 'Solstice Foods', contact: 'Diego Alvarez',
      email: 'diego@solsticefoods.co', phone: '+1 305 555 0177',
      address: '7700 NW 25th Street, Miami, FL 33122', taxId: 'EIN 65-2204881',
      terms: 'Net 15', status: 'active', createdAt: isoDateTimeDaysAgo(98)
    },
    {
      id: 'cl_halcyon', name: 'Halcyon Audio', contact: 'Noah Williams',
      email: 'noah@halcyonaudio.com', phone: '+1 512 555 0126',
      address: '1601 E 6th Street, Austin, TX 78702', taxId: 'EIN 81-3029104',
      terms: 'Net 30', status: 'active', createdAt: isoDateTimeDaysAgo(74)
    },
    {
      id: 'cl_bramble', name: 'Bramble & Co.', contact: 'Sofia Rossi',
      email: 'sofia@brambleandco.com', phone: '+1 718 555 0190',
      address: '55 Washington Street, Brooklyn, NY 11201', taxId: 'EIN 84-5510293',
      terms: 'Net 15', status: 'active', createdAt: isoDateTimeDaysAgo(41)
    }
  ];

  const line = (id, description, hsCode, origin, qty, unitPrice, dutyRate, vatRate = 0) => ({
    id, description, hsCode, origin, qty, unitPrice, dutyRate, vatRate
  });

  function buildDocs(shipmentId, opts) {
    const defs = [
      ['Commercial Invoice', true],
      ['Packing List', true],
      ['Bill of Lading / AWB', true]
    ];
    if (opts.certOrigin) defs.push(['Certificate of Origin', true]);
    if (opts.license) defs.push(['Import License', true]);
    if (num(opts.insurance) > 0) defs.push(['Insurance Certificate', true]);
    if (String(opts.mode || '').startsWith('Ocean')) defs.push(['ISF Filing', true]);
    if (opts.other) defs.push([opts.other, true]);
    const missing = opts.missing || [];
    const unverified = opts.unverified || [];
    const updated = opts.updatedDaysAgo ?? 1;
    const prefix = {
      'Commercial Invoice': 'CI',
      'Packing List': 'PL',
      'Bill of Lading / AWB': 'BL',
      'Certificate of Origin': 'COO',
      'Import License': 'LIC',
      'Insurance Certificate': 'INS',
      'ISF Filing': 'ISF'
    };
    return defs.map(([type, required], index) => {
      const received = !missing.includes(type);
      const verified = received && !unverified.includes(type);
      return {
        id: `doc_${shipmentId}_${index + 1}`,
        type,
        required,
        received,
        verified,
        reference: received ? `${prefix[type] || 'DOC'}-${shipmentId.slice(-4).toUpperCase()}-${String(index + 1).padStart(2, '0')}` : '',
        note: '',
        updatedAt: isoDateTimeDaysAgo(updated)
      };
    });
  }

  function makeSeedShipment(spec) {
    const id = spec.id;
    const docs = buildDocs(id, { ...spec.docs, mode: spec.mode, insurance: spec.insurance });
    const lines = spec.lines.map((l, i) => ({
      ...l,
      id: `li_${id}_${i + 1}`
    }));
    const history = [
      { type: 'created', message: 'Job file created from client instruction.', daysAgo: spec.createdDaysAgo ?? 12, actor: 'Maya Chen' },
      ...(spec.history || [])
    ].map((h, i) => ({
      id: `hist_${id}_${i + 1}`,
      type: h.type,
      message: h.message,
      at: isoDateTimeDaysAgo(h.daysAgo ?? 1),
      actor: h.actor || 'Maya Chen'
    })).sort((a, b) => new Date(b.at) - new Date(a.at));
    return {
      id,
      ref: spec.ref,
      clientId: spec.clientId,
      importer: spec.importer,
      consignee: spec.consignee || spec.importer,
      origin: spec.origin,
      port: spec.port,
      mode: spec.mode,
      incoterm: spec.incoterm,
      carrier: spec.carrier,
      bl: spec.bl,
      etd: spec.etd,
      eta: spec.eta,
      currency: spec.currency,
      fxRate: spec.fxRate,
      freight: spec.freight,
      insurance: spec.insurance,
      containers: spec.containers || [],
      priority: spec.priority || 'Standard',
      status: spec.status,
      assigned: spec.assigned || 'Maya Chen',
      notes: spec.notes || '',
      entryNo: spec.entryNo || '',
      clearedAt: spec.clearedAt || '',
      lineItems: lines,
      documents: docs,
      history,
      createdAt: isoDateTimeDaysAgo(spec.createdDaysAgo ?? 12),
      updatedAt: history[0] ? history[0].at : isoDateTimeDaysAgo(spec.updatedDaysAgo ?? 1)
    };
  }

  const SEED_SPECS = [
    {
      id: 'sh_0142', ref: 'CP-2026-0142', clientId: 'cl_northwind',
      importer: 'Northwind Trading Co.', consignee: 'Northwind Trading Co. — Receiving',
      origin: 'China', port: 'Long Beach, CA', mode: 'Ocean FCL', incoterm: 'FOB',
      carrier: 'Maersk', bl: 'MAEU-248193746', etd: isoDaysFromNow(-18), eta: isoDaysFromNow(2),
      currency: 'USD', fxRate: 1, freight: 2450, insurance: 310,
      containers: ['MSKU 482913-7', 'TGHU 773421-0'], priority: 'High', status: 'awaiting_docs',
      notes: 'Partial shipment 1 of 2. Importer requested early release; customs bond on file.',
      createdDaysAgo: 12, docs: { certOrigin: true, missing: ['Packing List', 'Certificate of Origin'] },
      history: [
        { type: 'status', message: 'Status changed to Awaiting docs.', daysAgo: 2 },
        { type: 'doc', message: 'Commercial Invoice received from client.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Stoneware dinner plates', '6912.00.48', 'China', 480, 18.50, 20),
        line('', 'Stoneware mugs', '6912.00.48', 'China', 600, 8.25, 20),
        line('', 'Bamboo serving boards', '4419.19.10', 'China', 120, 14.00, 0)
      ]
    },
    {
      id: 'sh_0143', ref: 'CP-2026-0143', clientId: 'cl_aster',
      importer: 'Aster Home', consignee: 'Aster Home — DC 4',
      origin: 'Portugal', port: 'Newark, NJ', mode: 'Ocean LCL', incoterm: 'CIF',
      carrier: 'MSC', bl: 'MSCU-991204773', etd: isoDaysFromNow(-15), eta: isoDaysFromNow(5),
      currency: 'EUR', fxRate: 1.09, freight: 980, insurance: 120,
      containers: ['LCL-77120'], priority: 'Standard', status: 'ready',
      notes: 'LCL consolidation. All documents received and verified.',
      createdDaysAgo: 11, docs: { certOrigin: false, missing: [], unverified: [] },
      history: [
        { type: 'status', message: 'All required documents verified. Ready to file.', daysAgo: 1 },
        { type: 'doc', message: 'Insurance Certificate verified.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Washed linen duvet cover sets', '6302.21.90', 'Portugal', 220, 42.50, 6.7),
        line('', 'Linen cushion covers', '6304.92.00', 'Portugal', 300, 12.40, 6.7),
        line('', 'Linen table runners', '6302.51.20', 'Portugal', 150, 9.80, 6.7)
      ]
    },
    {
      id: 'sh_0144', ref: 'CP-2026-0144', clientId: 'cl_kite',
      importer: 'Kite & Kin', consignee: 'Kite & Kin — Portland',
      origin: 'Vietnam', port: 'Savannah, GA', mode: 'Ocean FCL', incoterm: 'FOB',
      carrier: 'CMA CGM', bl: 'CMAU-661204915', etd: isoDaysFromNow(-24), eta: isoDaysFromNow(-1),
      currency: 'USD', fxRate: 1, freight: 3200, insurance: 380,
      containers: ['CMAU 661204-9', 'CMAU 661205-6'], priority: 'High', status: 'filed',
      notes: 'Entry filed. Awaiting CBP release.',
      createdDaysAgo: 20, entryNo: '7501-2026-000144', docs: { certOrigin: false, missing: [], unverified: [] },
      history: [
        { type: 'status', message: 'Entry filed; CBP entry number 7501-2026-000144 assigned.', daysAgo: 2 },
        { type: 'doc', message: 'Commercial Invoice verified.', daysAgo: 3 }
      ],
      lines: [
        line('', 'Bamboo utensil sets', '4419.19.10', 'Vietnam', 900, 6.40, 0),
        line('', 'Bamboo cutting boards', '4419.19.10', 'Vietnam', 400, 11.80, 0),
        line('', 'Recycled bamboo bowls', '4419.19.10', 'Vietnam', 250, 9.20, 0)
      ]
    },
    {
      id: 'sh_0145', ref: 'CP-2026-0145', clientId: 'cl_meridian',
      importer: 'Meridian Works', consignee: 'Meridian Works — Chicago',
      origin: 'Germany', port: 'Chicago, IL', mode: 'Air', incoterm: 'DAP',
      carrier: 'Lufthansa Cargo', bl: 'AWB 020-4419 0827', etd: isoDaysFromNow(-2), eta: isoDaysFromNow(4),
      currency: 'EUR', fxRate: 1.09, freight: 2100, insurance: 240,
      containers: [], priority: 'High', status: 'hold',
      notes: 'Held for UN38.3 test summary and import license. Battery declaration must clear before uplift.',
      createdDaysAgo: 9, docs: {
        certOrigin: false, license: true, other: 'UN38.3 test summary',
        missing: ['Import License', 'UN38.3 test summary'], unverified: []
      },
      history: [
        { type: 'status', message: 'Placed on hold: dangerous goods documentation incomplete.', daysAgo: 2 },
        { type: 'note', message: 'Carrier confirmed battery declaration required before uplift.', daysAgo: 2 }
      ],
      lines: [
        line('', 'Cordless drill battery packs', '8507.60.00', 'Germany', 180, 48.00, 3.4),
        line('', 'Battery charger modules', '8504.40.95', 'Germany', 180, 22.00, 2.6)
      ]
    },
    {
      id: 'sh_0146', ref: 'CP-2026-0146', clientId: 'cl_solstice',
      importer: 'Solstice Foods', consignee: 'Solstice Foods — Miami DC',
      origin: 'Spain', port: 'Miami, FL', mode: 'Ocean LCL', incoterm: 'CFR',
      carrier: 'Hapag-Lloyd', bl: 'HLCU-330914572', etd: isoDaysFromNow(-27), eta: isoDaysFromNow(-4),
      currency: 'EUR', fxRate: 1.09, freight: 1450, insurance: 120,
      containers: ['LCL-30921'], priority: 'Standard', status: 'cleared',
      notes: 'Released. FDA prior notice confirmed.',
      createdDaysAgo: 24, entryNo: '7501-2026-000146', clearedAt: isoDateTimeDaysAgo(2), docs: {
        certOrigin: false, other: 'FDA prior notice', missing: [], unverified: []
      },
      history: [
        { type: 'status', message: 'Customs release confirmed.', daysAgo: 2 },
        { type: 'status', message: 'Entry filed; CBP entry number 7501-2026-000146 assigned.', daysAgo: 5 }
      ],
      lines: [
        line('', 'Extra virgin olive oil 1L tins', '1509.10.20', 'Spain', 720, 6.80, 5.1),
        line('', 'Canned whole peeled tomatoes', '2002.10.00', 'Spain', 480, 2.40, 8.5)
      ]
    },
    {
      id: 'sh_0147', ref: 'CP-2026-0147', clientId: 'cl_halcyon',
      importer: 'Halcyon Audio', consignee: 'Halcyon Audio — Austin',
      origin: 'Japan', port: 'Los Angeles, CA', mode: 'Air', incoterm: 'CIF',
      carrier: 'Nippon Cargo', bl: 'AWB 131-8802 4417', etd: isoDaysFromNow(-1), eta: isoDaysFromNow(1),
      currency: 'JPY', fxRate: 0.0067, freight: 1600, insurance: 160,
      containers: [], priority: 'Urgent', status: 'awaiting_docs',
      notes: 'High-value audio shipment. Certificate of origin pending; client chasing supplier.',
      createdDaysAgo: 7, docs: {
        certOrigin: true, missing: ['Certificate of Origin'], unverified: []
      },
      history: [
        { type: 'doc', message: 'Certificate of Origin requested from supplier.', daysAgo: 1 },
        { type: 'status', message: 'Status changed to Awaiting docs.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Studio reference headphones', '8518.30.20', 'Japan', 160, 185.00, 4.9),
        line('', 'Replacement ear cushions', '8518.30.20', 'Japan', 400, 9.50, 4.9)
      ]
    },
    {
      id: 'sh_0148', ref: 'CP-2026-0148', clientId: 'cl_bramble',
      importer: 'Bramble & Co.', consignee: 'Bramble & Co. — Brooklyn',
      origin: 'India', port: 'New York, NY', mode: 'Ocean FCL', incoterm: 'FOB',
      carrier: 'ONE', bl: 'ONEY-220914876', etd: isoDaysFromNow(-10), eta: isoDaysFromNow(7),
      currency: 'USD', fxRate: 1, freight: 3800, insurance: 410,
      containers: ['ONEU 220914-7', 'ONEU 220915-4'], priority: 'Standard', status: 'ready',
      notes: 'All required documents verified. Ready to file.',
      createdDaysAgo: 15, docs: { certOrigin: true, missing: [], unverified: [] },
      history: [
        { type: 'status', message: 'All required documents verified. Ready to file.', daysAgo: 1 },
        { type: 'doc', message: 'Certificate of Origin verified.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Cotton crew-neck tees', '6109.10.00', 'India', 600, 7.40, 16.5),
        line('', 'Cotton hoodies', '6110.20.20', 'India', 300, 18.00, 16.5),
        line('', 'Cotton tote bags', '4202.92.31', 'India', 500, 3.10, 17.6)
      ]
    },
    {
      id: 'sh_0149', ref: 'CP-2026-0149', clientId: 'cl_northwind',
      importer: 'Northwind Trading Co.', consignee: 'Northwind Trading Co. — Houston',
      origin: 'Italy', port: 'Houston, TX', mode: 'Ocean LCL', incoterm: 'FOB',
      carrier: 'Grimaldi', bl: 'GRM-552091744', etd: isoDaysFromNow(-2), eta: isoDaysFromNow(12),
      currency: 'EUR', fxRate: 1.09, freight: 950, insurance: 85,
      containers: ['LCL-88123'], priority: 'Standard', status: 'draft',
      notes: 'Draft instruction received. Missing invoice and packing list.',
      createdDaysAgo: 5, docs: {
        certOrigin: true, missing: ['Commercial Invoice', 'Packing List', 'ISF Filing'], unverified: []
      },
      history: [
        { type: 'note', message: 'Draft instruction received from importer.', daysAgo: 5 }
      ],
      lines: [
        line('', 'Marble countertop samples', '6802.91.50', 'Italy', 80, 24.00, 5.0),
        line('', 'Limestone tile samples', '6802.23.00', 'Italy', 120, 11.50, 5.0)
      ]
    },
    {
      id: 'sh_0150', ref: 'CP-2026-0150', clientId: 'cl_aster',
      importer: 'Aster Home', consignee: 'Aster Home — DC 4',
      origin: 'France', port: 'Newark, NJ', mode: 'Air', incoterm: 'DAP',
      carrier: 'Air France Cargo', bl: 'AWB 057-2291 8840', etd: isoDaysFromNow(-1), eta: isoDaysFromNow(1),
      currency: 'EUR', fxRate: 1.09, freight: 2400, insurance: 190,
      containers: [], priority: 'High', status: 'filed',
      notes: 'Entry filed; release expected within 24 hours.',
      createdDaysAgo: 6, entryNo: '7501-2026-000150', docs: { certOrigin: false, missing: [], unverified: [] },
      history: [
        { type: 'status', message: 'Entry filed; CBP entry number 7501-2026-000150 assigned.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Hand-blown glass vases', '7013.37.20', 'France', 180, 22.00, 12.5),
        line('', 'Glassware sets', '7013.37.20', 'France', 240, 18.50, 12.5)
      ]
    },
    {
      id: 'sh_0151', ref: 'CP-2026-0151', clientId: 'cl_kite',
      importer: 'Kite & Kin', consignee: 'Kite & Kin — Portland',
      origin: 'China', port: 'Seattle, WA', mode: 'Ocean FCL', incoterm: 'FOB',
      carrier: 'Evergreen', bl: 'EGLV-771029943', etd: isoDaysFromNow(-30), eta: isoDaysFromNow(-10),
      currency: 'USD', fxRate: 1, freight: 2900, insurance: 450,
      containers: ['EGHU 771029-8'], priority: 'Standard', status: 'cleared',
      notes: 'Released and delivered to Portland warehouse.',
      createdDaysAgo: 28, entryNo: '7501-2026-000151', clearedAt: isoDateTimeDaysAgo(9), docs: {
        certOrigin: false, missing: [], unverified: []
      },
      history: [
        { type: 'status', message: 'Customs release confirmed.', daysAgo: 9 },
        { type: 'status', message: 'Entry filed; CBP entry number 7501-2026-000151 assigned.', daysAgo: 11 }
      ],
      lines: [
        line('', 'Powder-coated furniture brackets', '8302.41.60', 'China', 1400, 2.10, 8.5),
        line('', 'Stainless bolts and fasteners', '7318.15.80', 'China', 2000, 0.85, 8.5)
      ]
    },
    {
      id: 'sh_0152', ref: 'CP-2026-0152', clientId: 'cl_meridian',
      importer: 'Meridian Works', consignee: 'Meridian Works — Chicago',
      origin: 'South Korea', port: 'Chicago, IL', mode: 'Air', incoterm: 'FCA',
      carrier: 'Korean Air Cargo', bl: 'AWB 180-5520 1177', etd: isoDaysFromNow(0), eta: isoDaysFromNow(6),
      currency: 'USD', fxRate: 1, freight: 1800, insurance: 220,
      containers: [], priority: 'High', status: 'hold',
      notes: 'Held for import license. Battery packs require a separate declaration.',
      createdDaysAgo: 4, docs: {
        certOrigin: false, license: true, other: 'UN38.3 test summary',
        missing: ['Import License', 'UN38.3 test summary'], unverified: []
      },
      history: [
        { type: 'status', message: 'Placed on hold: import license missing.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Lithium-ion battery packs 36V', '8507.60.00', 'South Korea', 120, 96.00, 3.4),
        line('', 'Smart battery management units', '8537.10.91', 'South Korea', 120, 41.00, 2.7)
      ]
    },
    {
      id: 'sh_0153', ref: 'CP-2026-0153', clientId: 'cl_solstice',
      importer: 'Solstice Foods', consignee: 'Solstice Foods — Miami DC',
      origin: 'Italy', port: 'New York, NY', mode: 'Ocean LCL', incoterm: 'CIF',
      carrier: 'MSC', bl: 'MSCU-884120933', etd: isoDaysFromNow(-6), eta: isoDaysFromNow(9),
      currency: 'EUR', fxRate: 1.09, freight: 1350, insurance: 140,
      containers: ['LCL-99120'], priority: 'Standard', status: 'ready',
      notes: 'All documents verified. FDA prior notice on file.',
      createdDaysAgo: 10, docs: {
        certOrigin: false, other: 'FDA prior notice', missing: [], unverified: []
      },
      history: [
        { type: 'status', message: 'All required documents verified. Ready to file.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Bronze-cut pasta', '1902.19.00', 'Italy', 960, 2.80, 6.4),
        line('', 'Extra virgin olive oil 500ml', '1509.10.20', 'Italy', 360, 5.60, 5.1)
      ]
    },
    {
      id: 'sh_0154', ref: 'CP-2026-0154', clientId: 'cl_halcyon',
      importer: 'Halcyon Audio', consignee: 'Halcyon Audio — Austin',
      origin: 'China', port: 'Los Angeles, CA', mode: 'Ocean FCL', incoterm: 'FOB',
      carrier: 'COSCO', bl: 'COSU-661209348', etd: isoDaysFromNow(-5), eta: isoDaysFromNow(14),
      currency: 'USD', fxRate: 1, freight: 2200, insurance: 280,
      containers: ['COSU 661209-3'], priority: 'Standard', status: 'cancelled',
      notes: 'Cancelled at client request; goods redirected to Rotterdam.',
      createdDaysAgo: 8, docs: { certOrigin: false, missing: [], unverified: [] },
      history: [
        { type: 'status', message: 'Job cancelled at client request.', daysAgo: 3 }
      ],
      lines: [
        line('', 'USB-C audio cables', '8544.42.00', 'China', 1200, 3.20, 2.6),
        line('', 'Balanced XLR adapters', '8544.42.00', 'China', 800, 4.80, 2.6)
      ]
    },
    {
      id: 'sh_0155', ref: 'CP-2026-0155', clientId: 'cl_bramble',
      importer: 'Bramble & Co.', consignee: 'Bramble & Co. — Brooklyn',
      origin: 'United Kingdom', port: 'New York, NY', mode: 'Ocean LCL', incoterm: 'FOB',
      carrier: 'Maersk', bl: 'MAEU-882019374', etd: isoDaysFromNow(-8), eta: isoDaysFromNow(3),
      currency: 'GBP', fxRate: 1.27, freight: 1650, insurance: 160,
      containers: ['LCL-55120'], priority: 'High', status: 'awaiting_docs',
      notes: 'Packing list missing. Supplier has been contacted.',
      createdDaysAgo: 6, docs: { certOrigin: true, missing: ['Packing List'], unverified: [] },
      history: [
        { type: 'status', message: 'Status changed to Awaiting docs.', daysAgo: 1 },
        { type: 'doc', message: 'Packing list requested from supplier.', daysAgo: 1 }
      ],
      lines: [
        line('', 'Merino wool throws', '6301.20.00', 'United Kingdom', 220, 38.00, 11.2),
        line('', 'Lambswool scarves', '6214.20.00', 'United Kingdom', 300, 16.50, 11.2)
      ]
    }
  ];

  function defaultSettings(company, owner) {
    return {
      firmName: company || 'Clearway Customs Brokerage',
      preparer: owner || 'Maya Chen',
      licenseNo: 'CBP-24817',
      address: '1 Pier Street, Long Beach, CA 90802',
      currency: 'USD',
      deMinimis: 800,
      mpfRate: 0.003464,
      mpfMin: 31.67,
      mpfMax: 614.35,
      hmfRate: 0.00125,
      defaultVat: 0,
      theme: 'light',
      compact: false
    };
  }

  function buildWorkspace(scale, ownerName, company) {
    const specs = scale === 'starter' ? SEED_SPECS.slice(0, 6) : SEED_SPECS;
    const shipments = specs.map(makeSeedShipment);
    const clientIds = new Set(shipments.map((s) => s.clientId));
    const clients = CLIENT_SEED.filter((c) => scale === 'full' || clientIds.has(c.id)).map((c) => ({ ...c }));
    const refCounter = scale === 'starter' ? 160 : 156;
    return {
      clients,
      shipments,
      settings: defaultSettings(company, ownerName),
      counters: { ref: refCounter, entry: 160 },
      createdAt: nowISO()
    };
  }

  function seedDb() {
    const demoSalt = 'clearway-demo-salt-2026';
    const demoUser = {
      id: 'usr_demo',
      name: 'Maya Chen',
      email: 'ops@clearway.co',
      company: 'Clearway Customs Brokerage',
      role: 'Licensed customs broker',
      salt: demoSalt,
      passwordHash: hashPassword('clearway123', demoSalt),
      createdAt: isoDateTimeDaysAgo(320)
    };
    return {
      version: 1,
      appVersion: APP_VERSION,
      createdAt: nowISO(),
      users: [demoUser],
      session: null,
      workspaces: {
        [demoUser.id]: buildWorkspace('full', demoUser.name, demoUser.company)
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  State
   * ------------------------------------------------------------------ */

  let db = null;
  let currentUser = null;
  let lastFocused = null;
  let storageWarningShown = false;

  const ui = {
    route: { page: 'dashboard', id: null },
    authMode: 'signin',
    shipFilters: { search: '', status: 'all', client: 'all', mode: 'all', atRisk: false, sort: 'eta' },
    docFilters: { search: '', status: 'all', type: 'all', client: 'all' },
    clientFilters: { search: '', status: 'all' },
    entrySelected: null,
    shipDraft: null,
    shipErrors: {},
    clientDraft: null,
    clientErrors: {},
    modal: false,
    commandOpen: false,
    commandQuery: '',
    commandIndex: 0,
    commandItems: [],
    pendingImport: null,
    entryDocId: null
  };

  const currentWorkspace = () => (currentUser ? db.workspaces[currentUser.id] : null);
  const currentSettings = () => {
    const ws = currentWorkspace();
    return ws ? ws.settings : defaultSettings();
  };
  const getClient = (id) => {
    const ws = currentWorkspace();
    return ws ? ws.clients.find((c) => c.id === id) || null : null;
  };
  const getShipment = (id) => {
    const ws = currentWorkspace();
    return ws ? ws.shipments.find((s) => s.id === id) || null : null;
  };
  const clientName = (id) => getClient(id)?.name || 'Unassigned';
  const shipmentRef = (id) => getShipment(id)?.ref || '—';

  function persist() {
    if (!db) return;
    const ok = Store.set(STORAGE_KEY, db);
    if (!ok && !storageWarningShown) {
      storageWarningShown = true;
      showToast('Local storage is unavailable or full. Changes will last for this session only.', 'warn');
    }
  }

  function persistSession(userId) {
    if (userId) Store.set(SESSION_KEY, userId);
    else Store.remove(SESSION_KEY);
  }

  function loadState() {
    const stored = Store.get(STORAGE_KEY, null);
    if (stored && stored.version === 1 && Array.isArray(stored.users) && stored.workspaces) {
      db = stored;
    } else {
      db = seedDb();
      Store.set(STORAGE_KEY, db);
    }
    const sessionId = Store.get(SESSION_KEY, null);
    if (sessionId) {
      const user = db.users.find((u) => u.id === sessionId);
      if (user && db.workspaces[user.id]) currentUser = user;
      else persistSession(null);
    }
  }

  function getTheme() {
    const ws = currentWorkspace();
    if (ws && ws.settings && ws.settings.theme) return ws.settings.theme;
    const prefs = Store.get(PREFS_KEY, null);
    return prefs && prefs.theme ? prefs.theme : 'light';
  }

  function applyTheme() {
    document.documentElement.dataset.theme = getTheme();
  }

  function setTheme(theme) {
    const ws = currentWorkspace();
    if (ws && ws.settings) {
      ws.settings.theme = theme;
      persist();
    } else {
      Store.set(PREFS_KEY, { theme });
    }
    applyTheme();
    render();
  }

  /* ------------------------------------------------------------------ *
   *  Domain calculations
   * ------------------------------------------------------------------ */

  function computeEntry(shipment) {
    const settings = currentSettings();
    const lines = Array.isArray(shipment.lineItems) ? shipment.lineItems : [];
    const goodsValue = lines.reduce((sum, l) => sum + num(l.qty) * num(l.unitPrice), 0);
    const freight = Math.max(0, num(shipment.freight));
    const insurance = Math.max(0, num(shipment.insurance));
    const customsValue = goodsValue + freight + insurance;
    let duty = 0;
    let vat = 0;
    const lineTotals = lines.map((l) => {
      const lineValue = num(l.qty) * num(l.unitPrice);
      const share = goodsValue > 0 ? lineValue / goodsValue : 0;
      const lineFreight = freight * share;
      const lineInsurance = insurance * share;
      const lineCustoms = lineValue + lineFreight + lineInsurance;
      const lineDuty = lineCustoms * (num(l.dutyRate) / 100);
      const lineVat = (lineCustoms + lineDuty) * (num(l.vatRate) / 100);
      duty += lineDuty;
      vat += lineVat;
      return { ...l, lineValue, lineFreight, lineInsurance, lineCustoms, lineDuty, lineVat };
    });
    const usPort = US_PORTS.includes(shipment.port);
    const mpf = usPort && customsValue > 0
      ? Math.min(Math.max(customsValue * num(settings.mpfRate), num(settings.mpfMin, 0)), num(settings.mpfMax, Number.MAX_SAFE_INTEGER))
      : 0;
    const hmf = usPort && String(shipment.mode || '').startsWith('Ocean')
      ? customsValue * num(settings.hmfRate)
      : 0;
    const fees = mpf + hmf;
    const total = duty + vat + fees;
    const fx = num(shipment.fxRate, 1) || 1;
    const deMinimisThreshold = num(settings.deMinimis);
    return {
      goodsValue,
      freight,
      insurance,
      customsValue,
      duty,
      vat,
      mpf,
      hmf,
      fees,
      total,
      totalUSD: total * fx,
      dutyUSD: (duty + fees) * fx,
      lineTotals,
      usPort,
      deMinimis: deMinimisThreshold > 0 && customsValue < deMinimisThreshold,
      deMinimisThreshold
    };
  }

  function requiredDocs(shipment) {
    return (shipment.documents || []).filter((d) => d.required);
  }
  function missingDocs(shipment) {
    return requiredDocs(shipment).filter((d) => !d.received);
  }
  function docsProgress(shipment) {
    const required = requiredDocs(shipment);
    const received = required.filter((d) => d.received).length;
    return {
      received,
      total: required.length,
      pct: required.length ? Math.round((received / required.length) * 100) : 100
    };
  }
  function isUrgent(shipment) {
    if (!['draft', 'awaiting_docs', 'ready', 'filed', 'hold'].includes(shipment.status)) return false;
    const diff = dayDiff(shipment.eta);
    return diff !== null && diff <= 2;
  }
  function shipmentRisks(shipment) {
    const out = [];
    const missing = missingDocs(shipment);
    if (missing.length) {
      out.push({
        level: 'high',
        title: `${plural(missing.length, 'required document', 'required documents')} missing`,
        text: missing.map((d) => d.type).join(', ')
      });
    }
    if (shipment.status === 'hold') {
      out.push({
        level: 'high',
        title: 'Job on hold',
        text: 'Resolve the hold reason before this job can move forward.'
      });
    }
    if (isUrgent(shipment)) {
      out.push({
        level: 'medium',
        title: shipment.eta && dayDiff(shipment.eta) < 0 ? 'ETA has passed' : 'Arrival within 48 hours',
        text: `ETA ${formatDate(shipment.eta)} · ${relativeDate(shipment.eta)}`
      });
    }
    const entry = computeEntry(shipment);
    if (entry.deMinimis) {
      out.push({
        level: 'low',
        title: 'Below de minimis threshold',
        text: `Customs value ${money(entry.customsValue, shipment.currency)} is below ${money(entry.deMinimisThreshold, 'USD')}. Review eligibility.`
      });
    }
    if (shipment.status === 'filed' && !shipment.entryNo) {
      out.push({ level: 'medium', title: 'Entry number missing', text: 'A filed entry should have a CBP entry number.' });
    }
    return out;
  }
  function isActive(shipment) {
    return ACTIVE_STATUSES.includes(shipment.status);
  }
  function nextRef() {
    const ws = currentWorkspace();
    if (!ws) return 'CP-0000-0000';
    ws.counters = ws.counters || { ref: 156, entry: 160 };
    ws.counters.ref = num(ws.counters.ref, 156) + 1;
    const year = new Date().getFullYear();
    return `CP-${year}-${String(ws.counters.ref).padStart(4, '0')}`;
  }
  function nextEntryNo() {
    const ws = currentWorkspace();
    if (!ws) return '';
    ws.counters = ws.counters || { ref: 156, entry: 160 };
    ws.counters.entry = num(ws.counters.entry, 160) + 1;
    return `7501-${new Date().getFullYear()}-${String(ws.counters.entry).padStart(6, '0')}`;
  }
  function addHistory(shipment, type, message, actor = currentUser?.name || 'Maya Chen') {
    shipment.history = shipment.history || [];
    shipment.history.unshift({
      id: uid('hist'), type, message, at: nowISO(), actor
    });
  }

  /* ------------------------------------------------------------------ *
   *  Filtering and reporting
   * ------------------------------------------------------------------ */

  function filteredShipments() {
    const ws = currentWorkspace();
    if (!ws) return [];
    const f = ui.shipFilters;
    let list = ws.shipments.slice();
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter((s) => [
        s.ref, s.importer, s.consignee, s.origin, s.port, s.bl, s.mode, s.incoterm,
        clientName(s.clientId), ...(s.containers || []),
        ...(s.lineItems || []).map((l) => l.description)
      ].join(' ').toLowerCase().includes(q));
    }
    if (f.status !== 'all') list = list.filter((s) => s.status === f.status);
    if (f.client !== 'all') list = list.filter((s) => s.clientId === f.client);
    if (f.mode !== 'all') list = list.filter((s) => s.mode === f.mode);
    if (f.atRisk) list = list.filter((s) => s.status === 'hold' || missingDocs(s).length > 0 || isUrgent(s));
    const sorters = {
      eta: (a, b) => String(a.eta).localeCompare(String(b.eta)),
      eta_desc: (a, b) => String(b.eta).localeCompare(String(a.eta)),
      ref: (a, b) => String(a.ref).localeCompare(String(b.ref)),
      value: (a, b) => computeEntry(b).dutyUSD - computeEntry(a).dutyUSD,
      updated: (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))
    };
    list.sort(sorters[f.sort] || sorters.eta);
    return list;
  }

  function allDocRows() {
    const ws = currentWorkspace();
    if (!ws) return [];
    const rows = [];
    ws.shipments.forEach((s) => {
      (s.documents || []).forEach((d) => {
        rows.push({ shipment: s, doc: d, client: getClient(s.clientId) });
      });
    });
    return rows;
  }

  function filteredDocRows() {
    const f = ui.docFilters;
    let rows = allDocRows();
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      rows = rows.filter((r) => [r.doc.type, r.doc.reference, r.doc.note, r.shipment.ref, clientName(r.shipment.clientId)]
        .join(' ').toLowerCase().includes(q));
    }
    if (f.status === 'missing') rows = rows.filter((r) => !r.doc.received);
    if (f.status === 'received') rows = rows.filter((r) => r.doc.received);
    if (f.status === 'verified') rows = rows.filter((r) => r.doc.verified);
    if (f.status === 'unverified') rows = rows.filter((r) => r.doc.received && !r.doc.verified);
    if (f.type !== 'all') rows = rows.filter((r) => r.doc.type === f.type);
    if (f.client !== 'all') rows = rows.filter((r) => r.shipment.clientId === f.client);
    return rows.sort((a, b) => String(a.shipment.eta).localeCompare(String(b.shipment.eta)));
  }

  function filteredClients() {
    const ws = currentWorkspace();
    if (!ws) return [];
    const f = ui.clientFilters;
    let list = ws.clients.slice();
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter((c) => [c.name, c.contact, c.email, c.taxId, c.address].join(' ').toLowerCase().includes(q));
    }
    if (f.status !== 'all') list = list.filter((c) => c.status === f.status);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  function reportData() {
    const ws = currentWorkspace();
    if (!ws) return null;
    const rows = ws.shipments.map((s) => {
      const totals = computeEntry(s);
      const client = getClient(s.clientId);
      return { shipment: s, totals, client };
    });
    const byClient = Object.create(null);
    const byOrigin = Object.create(null);
    const byStatus = Object.create(null);
    rows.forEach((r) => {
      const cName = r.client ? r.client.name : 'Unassigned';
      byClient[cName] = byClient[cName] || { jobs: 0, duty: 0, fees: 0, total: 0, cleared: 0 };
      byClient[cName].jobs += 1;
      byClient[cName].duty += r.totals.duty;
      byClient[cName].fees += r.totals.fees;
      byClient[cName].total += r.totals.totalUSD;
      if (r.shipment.status === 'cleared') byClient[cName].cleared += 1;

      const o = r.shipment.origin || 'Unknown';
      byOrigin[o] = byOrigin[o] || { jobs: 0, duty: 0, fees: 0, total: 0 };
      byOrigin[o].jobs += 1;
      byOrigin[o].duty += r.totals.duty;
      byOrigin[o].fees += r.totals.fees;
      byOrigin[o].total += r.totals.totalUSD;

      byStatus[r.shipment.status] = (byStatus[r.shipment.status] || 0) + 1;
    });
    const cleared30 = rows.filter((r) => r.shipment.status === 'cleared' && r.shipment.clearedAt
      && Date.now() - new Date(r.shipment.clearedAt).getTime() <= 30 * 86400000);
    return {
      rows,
      byClient: Object.entries(byClient).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
      byOrigin: Object.entries(byOrigin).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
      byStatus,
      cleared30,
      totalDuty: rows.reduce((sum, r) => sum + r.totals.totalUSD, 0),
      totalJobs: rows.length,
      activeJobs: rows.filter((r) => isActive(r.shipment)).length
    };
  }

  /* ------------------------------------------------------------------ *
   *  Reusable HTML
   * ------------------------------------------------------------------ */

  function statusPill(status) {
    const meta = STATUSES[status] || STATUSES.draft;
    return `<span class="status-pill status-${esc(status)}"><span class="status-dot"></span>${esc(meta.label)}</span>`;
  }

  function priorityLabel(priority) {
    const key = String(priority || 'Standard').toLowerCase();
    return `<span class="priority priority-${esc(key)}">${esc(priority || 'Standard')}</span>`;
  }

  function progressHtml(shipment) {
    const p = docsProgress(shipment);
    return `<div class="progress" title="${p.received} of ${p.total} required documents received">
      <div class="progress-track"><div class="progress-fill" style="width:${p.pct}%"></div></div>
      <span class="progress-text">${p.received}/${p.total}</span>
    </div>`;
  }

  function emptyState(title, text, action = '') {
    return `<div class="empty">
      <div class="empty-icon">${icon('box')}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${action}
    </div>`;
  }

  function pageHead({ eyebrow, title, sub, actions = '' }) {
    return `<header class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">${esc(eyebrow)}</div>
        <h1>${esc(title)}</h1>
        ${sub ? `<p class="page-sub">${esc(sub)}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </header>`;
  }

  function kpi(label, value, foot, iconName = 'dot') {
    return `<article class="kpi">
      <div class="kpi-top"><span>${esc(label)}</span>${icon(iconName)}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-foot">${foot}</div>
    </article>`;
  }

  function shipmentRow(shipment) {
    const totals = computeEntry(shipment);
    return `<tr class="row-action" data-action="open-shipment" data-id="${esc(shipment.id)}" tabindex="0" aria-label="Open ${esc(shipment.ref)}">
      <td>
        <div class="primary mono">${esc(shipment.ref)}</div>
        <div class="secondary">${esc(clientName(shipment.clientId))}</div>
      </td>
      <td>
        <div class="primary">${esc(shipment.origin)} → ${esc(shipment.port)}</div>
        <div class="secondary">${esc(shipment.mode)} · ${esc(shipment.incoterm)} · ${esc(shipment.currency)}</div>
      </td>
      <td>
        <div class="primary">${esc(formatDate(shipment.eta))}</div>
        <div class="secondary">${esc(relativeDate(shipment.eta))}</div>
      </td>
      <td>${statusPill(shipment.status)}</td>
      <td>${progressHtml(shipment)}</td>
      <td class="num"><span class="mono">${esc(moneyCompact(totals.totalUSD, 'USD'))}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="row-action-btn" data-action="edit-shipment" data-id="${esc(shipment.id)}" aria-label="Edit ${esc(shipment.ref)}" title="Edit">${icon('edit')}</button>
          <button type="button" class="row-action-btn" data-action="delete-shipment" data-id="${esc(shipment.id)}" aria-label="Delete ${esc(shipment.ref)}" title="Delete">${icon('trash')}</button>
        </div>
      </td>
    </tr>`;
  }

  function tableWrap(headers, rows, footer = '') {
    return `<div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th class="${h.num ? 'num' : ''}">${esc(h.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${footer ? `<div class="table-footer">${footer}</div>` : ''}`;
  }

  /* ------------------------------------------------------------------ *
   *  Auth screen
   * ------------------------------------------------------------------ */

  function renderAuth() {
    const mode = ui.authMode;
    const isSignup = mode === 'signup';
    applyTheme();
    const demoUser = db.users.find((u) => u.email === 'ops@clearway.co') || db.users[0];
    app.innerHTML = `
      <div class="auth">
        <section class="auth-brand" aria-label="Clearway introduction">
          <div class="auth-top">
            <a class="brand" href="#/dashboard" aria-label="Clearway home">
              <span class="brand-mark">C</span>
              <span><span class="brand-word">Clearway</span><span class="brand-sub">Customs clearance desk</span></span>
            </a>
            <span class="auth-kicker"><span class="dot"></span> Operations console</span>
          </div>
          <div class="auth-pitch">
            <h1>Every entry,<br>accounted for.</h1>
            <p>Job files, duty calculations, document control, and entry summaries for the people who clear freight. Built to be used at the desk, not admired in a deck.</p>
            <div class="auth-visual" aria-hidden="true">
              <div class="manifest">
                <div class="manifest-head"><span>Entry file / CP-2026-0142</span><span>Ready to file</span></div>
                <div class="manifest-body">
                  <div class="manifest-route">
                    <div class="port"><span>Origin</span><strong>Ningbo, CN</strong></div>
                    <div class="route-line"></div>
                    <div class="port"><span>Destination</span><strong>Long Beach, CA</strong></div>
                  </div>
                  <div class="manifest-grid">
                    <div><span>Entered value</span><strong>$15,882.00</strong></div>
                    <div><span>Duty</span><strong>$2,766.00</strong></div>
                    <div><span>Total</span><strong>$2,841.72</strong></div>
                  </div>
                  <div class="manifest-rows">
                    <div class="manifest-row"><span>Document readiness</span><span>4 / 5</span></div>
                    <div class="manifest-row"><div class="track"><div class="fill" style="width:80%"></div></div><span>80%</span></div>
                    <div class="manifest-row"><span>CBP entry</span><span>7501-2026-000142</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="auth-footer"><span>© 2026 Clearway</span><span>Local-first · No cloud required</span></div>
        </section>

        <section class="auth-panel">
          <div class="auth-card">
            <div class="auth-card-head">
              <h2>${isSignup ? 'Create your workspace' : 'Sign in to the desk'}</h2>
              <p>${isSignup ? 'Start with a realistic sample workspace. Your data stays in this browser.' : 'Use the seeded demo account or sign in with your own local workspace.'}</p>
            </div>
            <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" class="auth-tab" role="tab" aria-selected="${!isSignup}" data-action="auth-tab" data-mode="signin">Sign in</button>
              <button type="button" class="auth-tab" role="tab" aria-selected="${isSignup}" data-action="auth-tab" data-mode="signup">Create account</button>
            </div>
            <form class="auth-form" id="auth-form" novalidate>
              <div id="auth-error" class="auth-error" hidden></div>
              ${isSignup ? `<div class="auth-row">
                <div class="field"><label for="auth-name">Full name</label><input class="input" id="auth-name" name="name" autocomplete="name" placeholder="Maya Chen" required></div>
                <div class="field"><label for="auth-company">Firm name</label><input class="input" id="auth-company" name="company" autocomplete="organization" placeholder="Clearway Customs Brokerage" required></div>
              </div>` : ''}
              <div class="field">
                <label for="auth-email">Work email</label>
                <input class="input" id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@firm.com" value="${isSignup ? '' : 'ops@clearway.co'}" required>
              </div>
              <div class="field">
                <label for="auth-password">Password</label>
                <div class="input-group">
                  ${icon('shield')}
                  <input class="input" id="auth-password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="${isSignup ? 'At least 8 characters' : 'Your password'}" required>
                </div>
              </div>
              ${isSignup ? `<div class="field"><label for="auth-confirm">Confirm password</label><input class="input" id="auth-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="Repeat password" required></div>` : ''}
              <div class="auth-actions"><button type="submit" class="btn btn-primary btn-lg">${isSignup ? 'Create workspace' : 'Sign in'} ${icon('arrow-right')}</button></div>
            </form>
            <p class="auth-note">${isSignup ? 'No server, no email verification. Data is stored locally in this browser.' : 'Your password is salted and hashed locally; no credentials leave this browser.'}</p>
            ${!isSignup ? `<div class="demo-callout">
              <div class="demo-callout-head"><strong>Demo workspace</strong><span class="badge">Seeded</span></div>
              <p>Open the full 14-job desk with clients, duty calculations, documents, and entry history.</p>
              <div class="demo-creds"><span class="cred">ops@clearway.co</span><span class="cred">clearway123</span></div>
              <button type="button" class="btn btn-sm" data-action="demo-login">Enter demo workspace ${icon('arrow-right')}</button>
            </div>` : ''}
          </div>
        </section>
      </div>`;
  }

  function showAuthError(message) {
    const box = document.getElementById('auth-error');
    if (!box) return;
    box.hidden = false;
    box.innerHTML = esc(message);
  }

  function loginUser(user) {
    currentUser = user;
    persistSession(user.id);
    ui.entrySelected = null;
    ui.shipFilters = { search: '', status: 'all', client: 'all', mode: 'all', atRisk: false, sort: 'eta' };
    ui.docFilters = { search: '', status: 'all', type: 'all', client: 'all' };
    ui.clientFilters = { search: '', status: 'all' };
    if (!location.hash || location.hash === '#/dashboard') location.hash = '#/dashboard';
    applyTheme();
    render();
    showToast(`Welcome back, ${firstName(user.name)}.`);
  }

  function signOut() {
    currentUser = null;
    persistSession(null);
    closeModal();
    closeCommand();
    app.innerHTML = '';
    renderAuth();
    if (location.hash && location.hash !== '#/dashboard') {
      try { history.replaceState(null, '', '#/dashboard'); } catch (_) { location.hash = '#/dashboard'; }
    }
  }

  /* ------------------------------------------------------------------ *
   *  App shell / routing
   * ------------------------------------------------------------------ */

  function parseRoute() {
    const raw = String(location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const page = parts[0] || 'dashboard';
    return { page: PAGE_META[page] ? page : 'dashboard', id: parts[1] || null };
  }

  function navItem(page, label, iconName, count = null, alert = false) {
    const active = ui.route.page === page
      || (page === 'shipments' && ui.route.page === 'shipments')
      || (page === 'shipments' && ui.route.id);
    return `<a class="nav-item" href="#/${page}" ${active ? 'aria-current="page"' : ''}>
      ${icon(iconName)}
      <span>${esc(label)}</span>
      ${count !== null ? `<span class="nav-count ${alert ? 'alert' : ''}">${count}</span>` : ''}
    </a>`;
  }

  function renderShell(content) {
    const ws = currentWorkspace();
    const meta = PAGE_META[ui.route.page] || PAGE_META.dashboard;
    const active = ws.shipments.filter(isActive);
    const missing = ws.shipments.reduce((sum, s) => sum + missingDocs(s).length, 0);
    const ready = ws.shipments.filter((s) => s.status === 'ready').length;
    const isShipmentDetail = ui.route.page === 'shipments' && ui.route.id;
    const title = isShipmentDetail ? 'Shipment file' : meta.label;
    return `<div class="app-shell">
      <aside class="sidebar" aria-label="Primary navigation">
        <div class="sidebar-head">
          <a class="brand" href="#/dashboard" aria-label="Clearway dashboard">
            <span class="brand-mark">C</span>
            <span><span class="brand-word">Clearway</span><span class="brand-sub">Clearance desk</span></span>
          </a>
        </div>
        <nav class="nav">
          <div class="nav-group">
            <div class="nav-label">Workspace</div>
            ${navItem('dashboard', 'Dashboard', 'grid')}
            ${navItem('shipments', 'Shipments', 'box', active.length)}
            ${navItem('entry', 'Entry desk', 'file', ready || null, ready > 0)}
            ${navItem('documents', 'Documents', 'docs', missing || null, missing > 0)}
          </div>
          <div class="nav-group">
            <div class="nav-label">Business</div>
            ${navItem('clients', 'Clients', 'users', ws.clients.length)}
            ${navItem('reports', 'Reports', 'chart')}
          </div>
          <div class="nav-group">
            <div class="nav-label">System</div>
            ${navItem('settings', 'Settings', 'settings')}
          </div>
        </nav>
        <div class="sidebar-foot">
          <div class="user-card">
            <span class="avatar">${esc(initials(currentUser.name))}</span>
            <div class="user-meta"><strong>${esc(currentUser.name)}</strong><span>${esc(currentUser.role || 'Operations')}</span></div>
            <button type="button" class="icon-btn" data-action="sign-out" aria-label="Sign out" title="Sign out">${icon('logout')}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="topbar-title">
            <h2>${esc(title)}</h2>
            <span class="crumb">${esc(ws.settings.firmName)}</span>
          </div>
          <button type="button" class="topbar-search" data-action="open-command" aria-label="Search and commands">
            ${icon('search')}
            <span>Search jobs, clients, commands…</span>
            <span class="kbd">⌘K</span>
          </button>
          <div class="topbar-actions">
            <button type="button" class="icon-btn" data-action="toggle-theme" aria-label="Toggle theme" title="Toggle theme">${icon(getTheme() === 'dark' ? 'sun' : 'moon')}</button>
            <span class="topbar-divider"></span>
            <button type="button" class="btn btn-primary" data-action="new-shipment">${icon('plus')}<span class="btn-label">New job</span></button>
          </div>
        </header>
        <main class="page" id="main-content">${content}</main>
      </div>
    </div>`;
  }

  function render() {
    if (!db) return;
    ui.route = parseRoute();
    if (!currentUser) {
      renderAuth();
      return;
    }
    const ws = currentWorkspace();
    if (!ws) {
      signOut();
      return;
    }
    applyTheme();
    let content = '';
    switch (ui.route.page) {
      case 'dashboard': content = renderDashboard(); break;
      case 'shipments': content = ui.route.id ? renderShipmentDetail(ui.route.id) : renderShipments(); break;
      case 'entry': content = renderEntry(); break;
      case 'documents': content = renderDocuments(); break;
      case 'clients': content = renderClients(); break;
      case 'reports': content = renderReports(); break;
      case 'settings': content = renderSettings(); break;
      default: content = renderDashboard(); break;
    }
    app.innerHTML = renderShell(content);
  }

  /* ------------------------------------------------------------------ *
   *  Dashboard
   * ------------------------------------------------------------------ */

  function renderDashboard() {
    const ws = currentWorkspace();
    const active = ws.shipments.filter(isActive);
    const cleared30 = ws.shipments.filter((s) => s.status === 'cleared' && s.clearedAt
      && Date.now() - new Date(s.clearedAt).getTime() <= 30 * 86400000);
    const dutyAtRisk = active.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
    const missingCount = active.reduce((sum, s) => sum + missingDocs(s).length, 0);
    const urgent = active.filter(isUrgent).length;
    const holds = active.filter((s) => s.status === 'hold').length;
    const clearedDuty = cleared30.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
    const queue = active.slice().sort((a, b) => String(a.eta).localeCompare(String(b.eta))).slice(0, 7);
    const attention = [];
    active.filter((s) => s.status === 'hold').slice(0, 2).forEach((s) => {
      attention.push({ icon: 'alert', title: `${s.ref} is on hold`, text: s.notes || 'Review the hold reason and required documents.', id: s.id });
    });
    active.filter((s) => missingDocs(s).length).slice(0, 3).forEach((s) => {
      const missing = missingDocs(s);
      attention.push({ icon: 'docs', title: `${s.ref}: ${plural(missing.length, 'document', 'documents')} missing`, text: missing.map((d) => d.type).join(', '), id: s.id });
    });
    active.filter((s) => isUrgent(s)).slice(0, 2).forEach((s) => {
      attention.push({ icon: 'clock', title: `${s.ref} arrives ${relativeDate(s.eta).toLowerCase()}`, text: `${s.origin} → ${s.port} · ${s.mode}`, id: s.id });
    });
    if (!attention.length) attention.push({ icon: 'check-circle', title: 'No open exceptions', text: 'The desk is clear of missing documents, holds, and urgent arrivals.', id: null });

    const activity = ws.shipments.flatMap((s) => (s.history || []).map((h) => ({ ...h, shipment: s })))
      .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

    const statusBars = ACTIVE_STATUSES.map((status) => ({
      status,
      value: active.filter((s) => s.status === status).reduce((sum, s) => sum + computeEntry(s).totalUSD, 0)
    })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const maxBar = Math.max(1, ...statusBars.map((x) => x.value));

    const lanes = Object.create(null);
    active.forEach((s) => {
      const key = s.origin || 'Unknown';
      lanes[key] = lanes[key] || { jobs: 0, duty: 0 };
      lanes[key].jobs += 1;
      lanes[key].duty += computeEntry(s).totalUSD;
    });
    const laneRows = Object.entries(lanes).sort((a, b) => b[1].duty - a[1].duty).slice(0, 4);

    return `${pageHead({
      eyebrow: 'Operations overview',
      title: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${firstName(currentUser.name)}.`,
      sub: `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())} · ${plural(active.length, 'open job', 'open jobs')} on the desk.`,
      actions: `<button type="button" class="btn" data-action="export-dashboard">${icon('download')} Snapshot CSV</button><button type="button" class="btn btn-primary" data-action="new-shipment">${icon('plus')} New job</button>`
    })}
    <div class="kpi-grid">
      ${kpi('Open jobs', active.length, `<strong>${urgent}</strong> urgent · <strong>${holds}</strong> on hold`, 'box')}
      ${kpi('Duty at risk', esc(moneyCompact(dutyAtRisk, 'USD')), `Estimated across ${plural(active.length, 'active job', 'active jobs')}`, 'scale')}
      ${kpi('Docs outstanding', missingCount, `Required documents not yet received`, 'docs')}
      ${kpi('Cleared (30d)', cleared30.length, `${esc(moneyCompact(clearedDuty, 'USD'))} estimated duty released`, 'check-circle')}
    </div>
    <div class="dash-grid">
      <div class="stack">
        <section class="card">
          <div class="card-head">
            <div><h2>Clearance queue</h2><p>Active jobs ordered by arrival date.</p></div>
            <a class="btn btn-sm" href="#/shipments">View all ${icon('arrow-right')}</a>
          </div>
          ${queue.length ? tableWrap([
            { label: 'Job' }, { label: 'Route' }, { label: 'ETA' }, { label: 'Status' }, { label: 'Docs' }, { label: 'Duty (USD)', num: true }, { label: '' }
          ], queue.map(shipmentRow), `<span><strong>${queue.length}</strong> shown · ${active.length} active jobs</span><span>Duty figures are operational estimates</span>`) : emptyState('No active jobs', 'Create a job to start tracking documents and duty.', `<button type="button" class="btn btn-sm" data-action="new-shipment">${icon('plus')} New job</button>`)}
        </section>
        <div class="grid-even">
          <section class="card">
            <div class="card-head"><div><h2>Duty exposure</h2><p>Estimated duty, fees, and VAT by status.</p></div></div>
            <div class="card-body">
              ${statusBars.length ? `<div class="bar-list">${statusBars.map((row) => `<div class="bar-row">
                <span class="bar-label">${esc(STATUSES[row.status].label)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.round((row.value / maxBar) * 100)}%"></div></div>
                <span class="bar-value">${esc(moneyCompact(row.value, 'USD'))}</span>
              </div>`).join('')}</div>` : `<p class="muted small">No duty exposure in active jobs.</p>`}
            </div>
          </section>
          <section class="card">
            <div class="card-head"><div><h2>Top lanes</h2><p>Open jobs by origin.</p></div></div>
            <div class="lane-list">
              ${laneRows.length ? laneRows.map(([origin, v]) => `<div class="lane-row">
                <div><strong>${esc(origin)}</strong><span>${plural(v.jobs, 'active job', 'active jobs')}</span></div>
                <div class="lane-meta"><strong>${esc(moneyCompact(v.duty, 'USD'))}</strong><span>est. duty</span></div>
              </div>`).join('') : `<p class="muted small" style="padding:16px">No active lanes.</p>`}
            </div>
          </section>
        </div>
      </div>
      <div class="dash-side">
        <section class="card">
          <div class="card-head"><div><h2>Needs attention</h2><p>Exceptions the desk should see first.</p></div><span class="badge">${attention.length}</span></div>
          <div class="attention">
            ${attention.map((item) => `<div class="attention-item">
              <span class="attention-icon">${icon(item.icon)}</span>
              <div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p>${item.id ? `<button type="button" class="link-btn" data-action="open-shipment" data-id="${esc(item.id)}">Open job ${icon('arrow-right', 'icon-sm')}</button>` : ''}</div>
            </div>`).join('')}
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Recent activity</h2><p>Latest movement across the desk.</p></div></div>
          <div class="activity">
            ${activity.length ? activity.map((h) => `<div class="activity-item">
              <span class="activity-dot">${icon(h.type === 'doc' ? 'docs' : h.type === 'status' ? 'arrow-right' : h.type === 'note' ? 'edit' : 'plus')}</span>
              <div><p>${esc(h.message)}</p><span>${esc(h.shipment.ref)} · ${esc(relativeTime(h.at))}</span></div>
            </div>`).join('') : `<p class="muted small" style="padding:16px">No activity yet.</p>`}
          </div>
        </section>
        <div class="card dash-note">Duty, MPF, and HMF figures are operational estimates for planning. Verify classification, valuation, and rates before filing.</div>
      </div>
    </div>`;
  }
/* ------------------------------------------------------------------ *
   *  Shipments
   * ------------------------------------------------------------------ */

  function renderShipments() {
    return `${pageHead({
      eyebrow: 'Job files',
      title: 'Shipments',
      sub: 'Every clearance job, its documents, duty exposure, and filing status in one queue.',
      actions: `<button type="button" class="btn" data-action="export-shipments">${icon('download')} Export CSV</button><button type="button" class="btn btn-primary" data-action="new-shipment">${icon('plus')} New job</button>`
    })}
    <div class="toolbar">
      <div class="search-field">
        ${icon('search')}
        <input class="input" id="shipment-search" type="search" placeholder="Search ref, client, B/L, port…" value="${esc(ui.shipFilters.search)}" aria-label="Search shipments">
      </div>
      <select class="select" id="shipment-status" aria-label="Filter by status">
        <option value="all">All statuses</option>
        ${STATUS_KEYS.map((key) => `<option value="${key}" ${ui.shipFilters.status === key ? 'selected' : ''}>${esc(STATUSES[key].label)}</option>`).join('')}
      </select>
      <select class="select" id="shipment-client" aria-label="Filter by client">
        <option value="all">All clients</option>
        ${currentWorkspace().clients.map((c) => `<option value="${esc(c.id)}" ${ui.shipFilters.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
      <select class="select" id="shipment-mode" aria-label="Filter by mode">
        <option value="all">All modes</option>
        ${MODES.map((m) => `<option value="${esc(m)}" ${ui.shipFilters.mode === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
      </select>
      <select class="select" id="shipment-sort" aria-label="Sort shipments">
        <option value="eta" ${ui.shipFilters.sort === 'eta' ? 'selected' : ''}>ETA · soonest</option>
        <option value="eta_desc" ${ui.shipFilters.sort === 'eta_desc' ? 'selected' : ''}>ETA · latest</option>
        <option value="ref" ${ui.shipFilters.sort === 'ref' ? 'selected' : ''}>Reference</option>
        <option value="value" ${ui.shipFilters.sort === 'value' ? 'selected' : ''}>Duty · highest</option>
        <option value="updated" ${ui.shipFilters.sort === 'updated' ? 'selected' : ''}>Recently updated</option>
      </select>
      <label class="check"><input type="checkbox" id="shipment-at-risk" ${ui.shipFilters.atRisk ? 'checked' : ''}> At risk only</label>
      <button type="button" class="btn btn-ghost btn-sm" data-action="clear-shipment-filters">Clear filters</button>
    </div>
    <div id="shipment-results">${shipmentResultsHtml()}</div>`;
  }

  function shipmentResultsHtml() {
    const list = filteredShipments();
    const totalDuty = list.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
    if (!list.length) {
      return `<section class="card">${emptyState('No shipments match these filters', 'Try a broader search, or clear the filters to see the full desk.', `<button type="button" class="btn btn-sm" data-action="clear-shipment-filters">Clear filters</button>`)}</section>`;
    }
    const headers = [
      { label: 'Job / client' }, { label: 'Route' }, { label: 'ETA' }, { label: 'Status' }, { label: 'Docs' }, { label: 'Duty (USD)', num: true }, { label: '' }
    ];
    return `<section class="card">
      ${tableWrap(headers, list.map(shipmentRow), `<span><strong>${list.length}</strong> of ${currentWorkspace().shipments.length} jobs · ${esc(money(totalDuty, 'USD'))} estimated total</span><span>Click a row to open the job file</span>`)}
    </section>`;
  }

  function updateShipmentResults() {
    const target = document.getElementById('shipment-results');
    if (target) target.innerHTML = shipmentResultsHtml();
  }

  function docItemHtml(shipment, doc) {
    return `<div class="doc-item">
      <div class="doc-check ${doc.received ? 'done' : ''}" aria-label="${doc.received ? 'Received' : 'Missing'}">${doc.received ? icon('check') : ''}</div>
      <div>
        <strong>${esc(doc.type)}${doc.required ? ' <span class="badge">Required</span>' : ' <span class="badge badge-outline">Optional</span>'}</strong>
        <p>${doc.received ? `Received${doc.verified ? ' · verified' : ' · verification pending'}` : 'Not received'}${doc.reference ? ` · <span class="mono">${esc(doc.reference)}</span>` : ''}${doc.note ? ` · ${esc(doc.note)}` : ''}</p>
      </div>
      <div class="doc-actions">
        ${!doc.received ? `<button type="button" class="btn btn-sm" data-action="toggle-doc-received" data-shipment="${esc(shipment.id)}" data-doc="${esc(doc.id)}">Receive</button>` : ''}
        ${doc.received && !doc.verified ? `<button type="button" class="btn btn-sm" data-action="toggle-doc-verified" data-shipment="${esc(shipment.id)}" data-doc="${esc(doc.id)}">Verify</button>` : ''}
        ${doc.verified ? `<span class="badge badge-dark">${icon('check', 'icon-sm')} Verified</span>` : ''}
        <button type="button" class="row-action-btn" data-action="edit-doc" data-shipment="${esc(shipment.id)}" data-doc="${esc(doc.id)}" aria-label="Edit ${esc(doc.type)}" title="Edit document">${icon('edit')}</button>
      </div>
    </div>`;
  }

  function renderShipmentDetail(id) {
    const shipment = getShipment(id);
    if (!shipment) {
      return `${pageHead({ eyebrow: 'Job file', title: 'Shipment not found', sub: 'The requested job may have been deleted.' })}
        <section class="card">${emptyState('No such job', 'Return to the shipment queue to choose another job.', `<a class="btn btn-sm" href="#/shipments">${icon('arrow-left')} Back to shipments</a>`)}</section>`;
    }
    const totals = computeEntry(shipment);
    const missing = missingDocs(shipment);
    const risks = shipmentRisks(shipment);
    const progress = docsProgress(shipment);
    const allowed = NEXT_STATUS[shipment.status] || [];
    const entryNo = shipment.entryNo ? `<span class="tag">${esc(shipment.entryNo)}</span>` : '<span class="badge badge-outline">No entry no.</span>';
    return `<a class="back-link" href="#/shipments">${icon('arrow-left', 'icon-sm')} Shipments</a>
    <header class="detail-head">
      <div class="detail-head-copy">
        <h1>${esc(shipment.ref)} ${statusPill(shipment.status)} ${priorityLabel(shipment.priority)}</h1>
        <p class="detail-sub">${esc(clientName(shipment.clientId))} · ${esc(shipment.origin)} → ${esc(shipment.port)} · ${esc(shipment.mode)} · ${esc(shipment.incoterm)}</p>
        <div class="row" style="margin-top:9px;flex-wrap:wrap;gap:6px">
          <span class="badge">${icon(iconForMode(shipment.mode), 'icon-sm')} ${esc(shipment.carrier || 'Carrier TBC')}</span>
          <span class="badge">${esc(shipment.bl || 'No B/L')}</span>
          <span class="badge">${esc(shipment.currency)} · FX ${esc(num(shipment.fxRate).toFixed(4))}</span>
          ${entryNo}
        </div>
      </div>
      <div class="detail-actions">
        ${allowed.length ? `<button type="button" class="btn btn-primary" data-action="open-status" data-id="${esc(shipment.id)}">${icon('arrow-right')} Move status</button>` : ''}
        <button type="button" class="btn" data-action="open-entry-summary" data-id="${esc(shipment.id)}">${icon('file')} Entry preview</button>
        <button type="button" class="btn" data-action="edit-shipment" data-id="${esc(shipment.id)}">${icon('edit')} Edit</button>
        <button type="button" class="icon-btn" data-action="delete-shipment" data-id="${esc(shipment.id)}" aria-label="Delete job" title="Delete job">${icon('trash')}</button>
      </div>
    </header>
    <div class="grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-body route-card">
            <div class="route-visual">
              <div class="route-port"><span>Origin</span><strong>${esc(shipment.origin)}</strong></div>
              <div class="route-connector"><span class="mode">${esc(shipment.mode)}</span></div>
              <div class="route-port"><span>Port of entry</span><strong>${esc(shipment.port)}</strong></div>
            </div>
            <div class="meta-grid">
              <div class="meta-cell"><span>ETD</span><strong>${esc(formatDate(shipment.etd))}</strong></div>
              <div class="meta-cell"><span>ETA</span><strong>${esc(formatDate(shipment.eta))} · ${esc(relativeDate(shipment.eta))}</strong></div>
              <div class="meta-cell"><span>Containers</span><strong>${esc((shipment.containers || []).join(', ') || '—')}</strong></div>
              <div class="meta-cell"><span>B/L / AWB</span><strong>${esc(shipment.bl || '—')}</strong></div>
              <div class="meta-cell"><span>Incoterms</span><strong>${esc(shipment.incoterm)}</strong></div>
              <div class="meta-cell"><span>Assigned</span><strong>${esc(shipment.assigned || currentUser.name)}</strong></div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Parties</h2><p>Importer of record and consignee.</p></div></div>
          <div class="card-body">
            <div class="parties">
              <div class="party"><span>Importer of record</span><strong>${esc(shipment.importer)}</strong><p>${esc(getClient(shipment.clientId)?.address || 'Address not on file')}</p></div>
              <div class="party"><span>Consignee</span><strong>${esc(shipment.consignee || shipment.importer)}</strong><p>${esc(getClient(shipment.clientId)?.contact || '')}${getClient(shipment.clientId)?.email ? ` · ${esc(getClient(shipment.clientId).email)}` : ''}</p></div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Cargo & duty</h2><p>${plural(shipment.lineItems.length, 'line', 'lines')} · entered value ${esc(money(totals.customsValue, shipment.currency))}</p></div><button type="button" class="btn btn-sm" data-action="edit-shipment" data-id="${esc(shipment.id)}">${icon('edit')} Edit lines</button></div>
          <div class="table-wrap">
            <table class="lines-table">
              <thead><tr><th>Description</th><th>HS code</th><th>Origin</th><th class="num">Qty</th><th class="num">Unit value</th><th class="num">Duty</th><th class="num">VAT</th></tr></thead>
              <tbody>
                ${totals.lineTotals.map((l) => `<tr>
                  <td><span class="primary">${esc(l.description)}</span><div class="secondary">${esc(money(l.lineValue, shipment.currency))} line value</div></td>
                  <td class="mono">${esc(l.hsCode)}</td>
                  <td>${esc(l.origin)}</td>
                  <td class="num">${esc(number(l.qty))}</td>
                  <td class="num">${esc(money(l.unitPrice, shipment.currency))}</td>
                  <td class="num">${esc(money(l.lineDuty, shipment.currency))}</td>
                  <td class="num">${esc(money(l.lineVat, shipment.currency))}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="card-foot">${totals.deMinimis ? `${icon('alert', 'icon-sm')} Below de minimis threshold — review eligibility before filing.` : `Duty rates are seeded estimates. Verify classification before filing.`}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Documents</h2><p>${progress.received} of ${progress.total} required documents received.</p></div><button type="button" class="btn btn-sm" data-action="add-doc" data-id="${esc(shipment.id)}">${icon('plus')} Add document</button></div>
          <div class="doc-list">${shipment.documents.length ? shipment.documents.map((d) => docItemHtml(shipment, d)).join('') : emptyState('No documents yet', 'Add the commercial invoice, packing list, and transport document to start the file.')}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Notes</h2><p>Internal desk notes and operational instructions.</p></div></div>
          <div class="card-body" style="padding:14px 16px"><p class="small" style="white-space:pre-wrap">${esc(shipment.notes || 'No notes on this job yet.')}</p></div>
          <form class="note-form" id="note-form" data-shipment="${esc(shipment.id)}">
            <input class="input" name="note" placeholder="Add a desk note…" aria-label="Add a desk note">
            <button type="submit" class="btn btn-sm">${icon('plus')} Add</button>
          </form>
        </section>
      </div>
      <div class="dash-side">
        <section class="card">
          <div class="card-head"><div><h2>Duty summary</h2><p>Operational estimate in ${esc(shipment.currency)}.</p></div></div>
          <div class="duty-summary">
            <div class="duty-row"><span>Goods value</span><strong>${esc(money(totals.goodsValue, shipment.currency))}</strong></div>
            <div class="duty-row"><span>Freight</span><strong>${esc(money(totals.freight, shipment.currency))}</strong></div>
            <div class="duty-row"><span>Insurance</span><strong>${esc(money(totals.insurance, shipment.currency))}</strong></div>
            <div class="duty-row"><span>Entered value</span><strong>${esc(money(totals.customsValue, shipment.currency))}</strong></div>
            <div class="duty-row"><span>Duty</span><strong>${esc(money(totals.duty, shipment.currency))}</strong></div>
            ${totals.usPort ? `<div class="duty-row"><span>MPF</span><strong>${esc(money(totals.mpf, shipment.currency))}</strong></div><div class="duty-row"><span>HMF</span><strong>${esc(money(totals.hmf, shipment.currency))}</strong></div>` : ''}
            ${totals.vat > 0 ? `<div class="duty-row"><span>Import VAT</span><strong>${esc(money(totals.vat, shipment.currency))}</strong></div>` : ''}
            <div class="duty-row total"><span>Total duty & fees</span><strong>${esc(money(totals.total, shipment.currency))}</strong></div>
          </div>
          <div class="duty-note">≈ ${esc(money(totals.totalUSD, 'USD'))} at FX ${esc(num(shipment.fxRate).toFixed(4))}. MPF and HMF apply only to the seeded US ports and ocean mode respectively.</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Risk & exceptions</h2><p>${risks.length ? `${plural(risks.length, 'item', 'items')} to review` : 'No exceptions detected'}</p></div></div>
          <div class="card-body">
            ${risks.length ? `<div class="risk-list">${risks.map((r) => `<div class="risk-item">${icon(r.level === 'high' ? 'alert' : 'clock')}<div><strong>${esc(r.title)}</strong><p>${esc(r.text)}</p></div></div>`).join('')}</div>` : `<div class="risk-item">${icon('check-circle')}<div><strong>No exceptions detected</strong><p>Documents and dates look complete.</p></div></div>`}
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Activity</h2><p>Job-level audit trail.</p></div></div>
          <div class="timeline">
            ${(shipment.history || []).length ? shipment.history.map((h) => `<div class="timeline-item">
              <span class="timeline-dot">${icon(h.type === 'doc' ? 'docs' : h.type === 'status' ? 'arrow-right' : h.type === 'note' ? 'edit' : 'plus')}</span>
              <div><p>${esc(h.message)}</p><span>${esc(h.actor)} · ${esc(formatDateTime(h.at))}</span></div>
            </div>`).join('') : `<p class="muted small" style="padding:16px">No activity yet.</p>`}
          </div>
        </section>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ *
   *  Entry desk
   * ------------------------------------------------------------------ */

  function entryQueueShipments() {
    return currentWorkspace().shipments
      .filter((s) => ['ready', 'hold', 'filed'].includes(s.status))
      .sort((a, b) => {
        const order = { ready: 0, hold: 1, filed: 2 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(a.eta).localeCompare(String(b.eta));
      });
  }

  function entryWorksheetHtml(shipment) {
    if (!shipment) return emptyState('Select a job', 'Choose a job from the filing queue to review its entry worksheet.');
    const totals = computeEntry(shipment);
    const missing = missingDocs(shipment);
    const progress = docsProgress(shipment);
    return `<div class="worksheet-head">
      <div class="row-between">
        <div class="worksheet-title">
          <div class="row" style="gap:8px;margin-bottom:4px"><span class="mono small">${esc(shipment.ref)}</span>${statusPill(shipment.status)}</div>
          <h2>${esc(clientName(shipment.clientId))}</h2>
          <p>${esc(shipment.origin)} → ${esc(shipment.port)} · ${esc(shipment.mode)} · ETA ${esc(formatDate(shipment.eta))}</p>
        </div>
        <div class="row"><span class="badge">${esc(shipment.entryNo || 'No entry no.')}</span><a class="btn btn-sm" href="#/shipments/${esc(shipment.id)}">Open job ${icon('external', 'icon-sm')}</a></div>
      </div>
    </div>
    <div class="worksheet-body">
      <div class="entry-summary-box">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cargo line</th><th class="num">Value</th><th class="num">Duty</th><th class="num">VAT</th></tr></thead>
            <tbody>${totals.lineTotals.map((l) => `<tr>
              <td><span class="primary">${esc(l.description)}</span><div class="secondary mono">${esc(l.hsCode)} · ${esc(l.origin)}</div></td>
              <td class="num">${esc(money(l.lineCustoms, shipment.currency))}</td>
              <td class="num">${esc(money(l.lineDuty, shipment.currency))}</td>
              <td class="num">${esc(money(l.lineVat, shipment.currency))}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="entry-total">
          <div class="row-between"><span class="small muted">Entered value</span><strong class="mono">${esc(money(totals.customsValue, shipment.currency))}</strong></div>
          <div class="row-between"><span class="small muted">Duty + fees</span><strong class="mono">${esc(money(totals.duty + totals.fees, shipment.currency))}</strong></div>
          <div class="row-between" style="margin-top:8px"><span class="big">${esc(money(totals.total, shipment.currency))}</span><span class="badge">≈ ${esc(money(totals.totalUSD, 'USD'))}</span></div>
        </div>
      </div>
      ${missing.length ? `<div class="alert-row">${icon('alert')}<div><strong>${plural(missing.length, 'required document', 'required documents')} missing.</strong> ${esc(missing.map((d) => d.type).join(', '))}.</div></div>` : `<div class="alert-row">${icon('check-circle')}<div><strong>Document set complete.</strong> ${progress.received}/${progress.total} required documents received.</div></div>`}
      ${totals.deMinimis ? `<div class="alert-row">${icon('alert')}<div><strong>Below de minimis threshold.</strong> Customs value ${esc(money(totals.customsValue, shipment.currency))} is below ${esc(money(totals.deMinimisThreshold, 'USD'))}. Review eligibility before filing.</div></div>` : ''}
      ${shipment.status === 'hold' ? `<div class="alert-row">${icon('clock')}<div><strong>On hold.</strong> ${esc(shipment.notes || 'Resolve the hold before filing.')}</div></div>` : ''}
    </div>
    <div class="entry-actions">
      <button type="button" class="btn" data-action="open-entry-summary" data-id="${esc(shipment.id)}">${icon('file')} Entry summary</button>
      <button type="button" class="btn" data-action="export-entry-csv" data-id="${esc(shipment.id)}">${icon('download')} Line CSV</button>
      <span class="spacer"></span>
      ${shipment.status === 'ready' ? `<button type="button" class="btn btn-primary" data-action="open-status" data-id="${esc(shipment.id)}">${icon('arrow-right')} Mark as filed</button>` : ''}
      ${shipment.status === 'filed' ? `<button type="button" class="btn btn-primary" data-action="open-status" data-id="${esc(shipment.id)}">${icon('check')} Mark as cleared</button>` : ''}
      ${shipment.status === 'hold' ? `<button type="button" class="btn" data-action="open-status" data-id="${esc(shipment.id)}">Review hold</button>` : ''}
    </div>`;
  }

  function renderEntry() {
    const queue = entryQueueShipments();
    const ws = currentWorkspace();
    if (!ui.entrySelected || !queue.some((s) => s.id === ui.entrySelected)) {
      ui.entrySelected = queue[0]?.id || null;
    }
    const selected = queue.find((s) => s.id === ui.entrySelected) || null;
    const ready = queue.filter((s) => s.status === 'ready');
    const filed = queue.filter((s) => s.status === 'filed');
    const dutyPending = ready.concat(queue.filter((s) => s.status === 'hold'))
      .reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
    const missing = queue.reduce((sum, s) => sum + missingDocs(s).length, 0);
    return `${pageHead({
      eyebrow: 'Filing workflow',
      title: 'Entry desk',
      sub: 'Review duty, documents, and risk before filing. Generate a printable entry summary from any job.',
      actions: `<button type="button" class="btn" data-action="export-entry-queue">${icon('download')} Export queue</button>`
    })}
    <div class="kpi-grid">
      ${kpi('Ready to file', ready.length, 'Document sets complete', 'check-circle')}
      ${kpi('Filed / pending', filed.length, 'Awaiting release', 'file')}
      ${kpi('Duty in queue', esc(moneyCompact(dutyPending, 'USD')), 'Ready and on-hold jobs', 'scale')}
      ${kpi('Missing docs', missing, 'Across the filing queue', 'docs')}
    </div>
    <div class="entry-layout">
      <section class="card queue-card">
        <div class="card-head"><div><h2>Filing queue</h2><p>${queue.length} jobs in review.</p></div><span class="badge">${ready.length} ready</span></div>
        <div class="card-body">
          ${queue.length ? queue.map((s) => `<button type="button" class="queue-item" data-action="select-entry" data-id="${esc(s.id)}" aria-pressed="${s.id === ui.entrySelected}">
            <div><strong>${esc(s.ref)} · ${esc(clientName(s.clientId))}</strong><span>${esc(s.origin)} → ${esc(s.port)}</span><span>ETA ${esc(formatDate(s.eta))} · ${esc(relativeDate(s.eta))}</span></div>
            <div class="queue-meta">${statusPill(s.status)}<strong style="display:block;margin-top:5px">${esc(moneyCompact(computeEntry(s).totalUSD, 'USD'))}</strong></div>
          </button>`).join('') : emptyState('Queue is clear', 'No jobs are ready, on hold, or filed.')}
        </div>
      </section>
      <section class="card">
        ${selected ? entryWorksheetHtml(selected) : `<div class="card-body">${emptyState('Nothing selected', 'Pick a job from the filing queue to build an entry worksheet.')}</div>`}
      </section>
    </div>`;
  }

  /* ------------------------------------------------------------------ *
   *  Documents
   * ------------------------------------------------------------------ */

  function docStatusHtml(doc) {
    if (!doc.received) return `<span class="doc-status">${icon('alert', 'icon-sm')} Missing</span>`;
    if (!doc.verified) return `<span class="doc-status">${icon('clock', 'icon-sm')} Received</span>`;
    return `<span class="doc-status done">${icon('check', 'icon-sm')} Verified</span>`;
  }

  function renderDocuments() {
    const all = allDocRows();
    const required = all.filter((r) => r.doc.required);
    const received = required.filter((r) => r.doc.received);
    const verified = required.filter((r) => r.doc.verified);
    const missing = required.filter((r) => !r.doc.received);
    return `${pageHead({
      eyebrow: 'Document control',
      title: 'Documents',
      sub: 'One register for every document across the desk. Receive, verify, reference, and chase what is missing.',
      actions: `<button type="button" class="btn" data-action="export-missing-docs">${icon('download')} Missing docs CSV</button><button type="button" class="btn btn-primary" data-action="add-doc">${icon('plus')} Add document</button>`
    })}
    <div class="doc-summary">
      <div class="kpi"><div class="kpi-top"><span>Required</span>${icon('docs')}</div><div class="kpi-value">${required.length}</div><div class="kpi-foot">Across ${currentWorkspace().shipments.length} jobs</div></div>
      <div class="kpi"><div class="kpi-top"><span>Received</span>${icon('clock')}</div><div class="kpi-value">${received.length}</div><div class="kpi-foot">${required.length ? Math.round((received.length / required.length) * 100) : 100}% of required set</div></div>
      <div class="kpi"><div class="kpi-top"><span>Verified</span>${icon('check-circle')}</div><div class="kpi-value">${verified.length}</div><div class="kpi-foot">Ready for filing review</div></div>
      <div class="kpi"><div class="kpi-top"><span>Missing</span>${icon('alert')}</div><div class="kpi-value">${missing.length}</div><div class="kpi-foot">Blocking or pending</div></div>
    </div>
    <div class="toolbar">
      <div class="search-field">${icon('search')}<input class="input" id="doc-search" type="search" placeholder="Search document, job, client…" value="${esc(ui.docFilters.search)}" aria-label="Search documents"></div>
      <select class="select" id="doc-status" aria-label="Filter by document status">
        <option value="all" ${ui.docFilters.status === 'all' ? 'selected' : ''}>All statuses</option>
        <option value="missing" ${ui.docFilters.status === 'missing' ? 'selected' : ''}>Missing</option>
        <option value="received" ${ui.docFilters.status === 'received' ? 'selected' : ''}>Received</option>
        <option value="unverified" ${ui.docFilters.status === 'unverified' ? 'selected' : ''}>Unverified</option>
        <option value="verified" ${ui.docFilters.status === 'verified' ? 'selected' : ''}>Verified</option>
      </select>
      <select class="select" id="doc-type" aria-label="Filter by document type">
        <option value="all" ${ui.docFilters.type === 'all' ? 'selected' : ''}>All types</option>
        ${DOC_TYPES.map((t) => `<option value="${esc(t)}" ${ui.docFilters.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
      </select>
      <select class="select" id="doc-client" aria-label="Filter by client">
        <option value="all" ${ui.docFilters.client === 'all' ? 'selected' : ''}>All clients</option>
        ${currentWorkspace().clients.map((c) => `<option value="${esc(c.id)}" ${ui.docFilters.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-ghost btn-sm" data-action="clear-doc-filters">Clear filters</button>
    </div>
    <div id="doc-results">${docResultsHtml()}</div>`;
  }

  function docResultsHtml() {
    const rows = filteredDocRows();
    if (!rows.length) return `<section class="card">${emptyState('No documents match', 'Try a different status, type, or search term.', `<button type="button" class="btn btn-sm" data-action="clear-doc-filters">Clear filters</button>`)}</section>`;
    return `<section class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Document</th><th>Job</th><th>Client</th><th>Requirement</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td><div class="doc-type">${esc(r.doc.type)}</div><div class="secondary mono">${esc(r.doc.reference || 'No reference')}</div></td>
            <td><div class="primary mono">${esc(r.shipment.ref)}</div><div class="secondary">${esc(r.shipment.origin)} → ${esc(r.shipment.port)}</div></td>
            <td>${esc(clientName(r.shipment.clientId))}</td>
            <td>${r.doc.required ? '<span class="badge">Required</span>' : '<span class="badge badge-outline">Optional</span>'}</td>
            <td>${docStatusHtml(r.doc)}</td>
            <td class="small muted">${esc(relativeTime(r.doc.updatedAt))}</td>
            <td><div class="row-actions" style="opacity:1">
              ${!r.doc.received ? `<button type="button" class="btn btn-sm" data-action="toggle-doc-received" data-shipment="${esc(r.shipment.id)}" data-doc="${esc(r.doc.id)}">Receive</button>` : ''}
              ${r.doc.received && !r.doc.verified ? `<button type="button" class="btn btn-sm" data-action="toggle-doc-verified" data-shipment="${esc(r.shipment.id)}" data-doc="${esc(r.doc.id)}">Verify</button>` : ''}
              <button type="button" class="row-action-btn" data-action="edit-doc" data-shipment="${esc(r.shipment.id)}" data-doc="${esc(r.doc.id)}" aria-label="Edit document">${icon('edit')}</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="table-footer"><span><strong>${rows.length}</strong> documents shown</span><span>Click a job ref in Shipments to open the file</span></div>
    </section>`;
  }

  function updateDocResults() {
    const target = document.getElementById('doc-results');
    if (target) target.innerHTML = docResultsHtml();
  }

  /* ------------------------------------------------------------------ *
   *  Clients
   * ------------------------------------------------------------------ */

  function renderClients() {
    const ws = currentWorkspace();
    const activeClients = ws.clients.filter((c) => c.status === 'active');
    const openJobs = ws.shipments.filter(isActive);
    return `${pageHead({
      eyebrow: 'Business',
      title: 'Clients',
      sub: 'Importers, consignees, and the desk relationships behind every job file.',
      actions: `<button type="button" class="btn" data-action="export-report">${icon('download')} Export ledger</button><button type="button" class="btn btn-primary" data-action="new-client">${icon('plus')} New client</button>`
    })}
    <div class="kpi-grid">
      ${kpi('Active clients', activeClients.length, `${ws.clients.length} total on file`, 'users')}
      ${kpi('Open jobs', openJobs.length, 'Across active clients', 'box')}
      ${kpi('Duty at risk', esc(moneyCompact(openJobs.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0), 'USD')), 'Estimated across open jobs', 'scale')}
      ${kpi('Clients with gaps', new Set(openJobs.filter((s) => missingDocs(s).length).map((s) => s.clientId)).size, 'Missing required documents', 'alert')}
    </div>
    <div class="toolbar">
      <div class="search-field">${icon('search')}<input class="input" id="client-search" type="search" placeholder="Search client, contact, tax ID…" value="${esc(ui.clientFilters.search)}" aria-label="Search clients"></div>
      <select class="select" id="client-status" aria-label="Filter by client status">
        <option value="all" ${ui.clientFilters.status === 'all' ? 'selected' : ''}>All statuses</option>
        <option value="active" ${ui.clientFilters.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="inactive" ${ui.clientFilters.status === 'inactive' ? 'selected' : ''}>Inactive</option>
      </select>
      <button type="button" class="btn btn-ghost btn-sm" data-action="clear-client-filters">Clear filters</button>
    </div>
    <div id="client-results">${clientResultsHtml()}</div>`;
  }

  function clientResultsHtml() {
    const list = filteredClients();
    if (!list.length) return `<section class="card">${emptyState('No clients match', 'Add a client or clear the current filters.', `<button type="button" class="btn btn-sm" data-action="clear-client-filters">Clear filters</button>`)}</section>`;
    return `<section class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Client</th><th>Contact</th><th>Open jobs</th><th>Duty exposure</th><th>Status</th><th></th></tr></thead>
          <tbody>${list.map((c) => {
            const jobs = currentWorkspace().shipments.filter((s) => s.clientId === c.id);
            const open = jobs.filter(isActive);
            const duty = open.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
            return `<tr>
              <td><div class="client-cell"><span class="avatar">${esc(initials(c.name))}</span><div><strong>${esc(c.name)}</strong><span>${esc(c.taxId || 'No tax ID')}</span></div></div></td>
              <td><div class="primary">${esc(c.contact || '—')}</div><div class="secondary">${esc(c.email || '')}</div></td>
              <td><div class="primary">${open.length}</div><div class="secondary">${jobs.length} total</div></td>
              <td class="num"><span class="mono">${esc(moneyCompact(duty, 'USD'))}</span></td>
              <td><span class="badge ${c.status === 'active' ? '' : 'badge-outline'}">${esc(c.status)}</span></td>
              <td><div class="row-actions" style="opacity:1">
                <button type="button" class="btn btn-sm" data-action="view-client" data-id="${esc(c.id)}">View</button>
                <button type="button" class="row-action-btn" data-action="edit-client" data-id="${esc(c.id)}" aria-label="Edit ${esc(c.name)}">${icon('edit')}</button>
                <button type="button" class="row-action-btn" data-action="delete-client" data-id="${esc(c.id)}" aria-label="Delete ${esc(c.name)}">${icon('trash')}</button>
              </div></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="table-footer"><span><strong>${list.length}</strong> of ${currentWorkspace().clients.length} clients</span><span>Open jobs and duty are calculated from active job files</span></div>
    </section>`;
  }

  function updateClientResults() {
    const target = document.getElementById('client-results');
    if (target) target.innerHTML = clientResultsHtml();
  }

  /* ------------------------------------------------------------------ *
   *  Reports
   * ------------------------------------------------------------------ */

  function renderReports() {
    const report = reportData();
    if (!report) return '';
    const maxClient = Math.max(1, ...report.byClient.map((c) => c.total));
    const maxOrigin = Math.max(1, ...report.byOrigin.map((o) => o.total));
    const clearedDuty = report.cleared30.reduce((sum, r) => sum + r.totals.totalUSD, 0);
    return `${pageHead({
      eyebrow: 'Desk analytics',
      title: 'Reports',
      sub: 'Duty exposure, origin lanes, and a clean ledger you can hand to the bookkeeper.',
      actions: `<button type="button" class="btn" data-action="export-report">${icon('download')} Export ledger CSV</button>`
    })}
    <div class="kpi-grid">
      ${kpi('Jobs on file', report.totalJobs, `${report.activeJobs} active`, 'box')}
      ${kpi('Total duty & fees', esc(moneyCompact(report.totalDuty, 'USD')), 'All jobs, estimated', 'scale')}
      ${kpi('Cleared (30d)', report.cleared30.length, `${esc(moneyCompact(clearedDuty, 'USD'))} duty released`, 'check-circle')}
      ${kpi('Avg. duty / job', esc(moneyCompact(report.totalDuty / Math.max(1, report.totalJobs), 'USD')), 'Across all jobs', 'chart')}
    </div>
    <div class="report-grid">
      <section class="card report-card">
        <div class="card-head"><div><h2>Duty by client</h2><p>Estimated duty, fees, and VAT in USD.</p></div><span class="badge">${report.byClient.length} clients</span></div>
        <div class="card-body">
          <div class="bar-list">
            ${report.byClient.slice(0, 6).map((c) => `<div class="bar-row">
              <span class="bar-label" title="${esc(c.name)}">${esc(c.name)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round((c.total / maxClient) * 100)}%"></div></div>
              <span class="bar-value">${esc(moneyCompact(c.total, 'USD'))}</span>
            </div>`).join('')}
          </div>
        </div>
      </section>
      <section class="card report-card">
        <div class="card-head"><div><h2>Duty by origin</h2><p>Where the landed cost is coming from.</p></div></div>
        <div class="card-body">
          <div class="bar-list">
            ${report.byOrigin.slice(0, 6).map((o) => `<div class="bar-row">
              <span class="bar-label">${esc(o.name)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round((o.total / maxOrigin) * 100)}%"></div></div>
              <span class="bar-value">${esc(moneyCompact(o.total, 'USD'))}</span>
            </div>`).join('')}
          </div>
        </div>
      </section>
      <section class="card report-card">
        <div class="card-head"><div><h2>Status mix</h2><p>Job count by clearance status.</p></div></div>
        <div class="card-body">
          <div class="report-list">
            ${STATUS_KEYS.map((key) => `<div class="report-row"><span>${esc(STATUSES[key].label)}</span><strong>${report.byStatus[key] || 0}</strong></div>`).join('')}
          </div>
        </div>
      </section>
      <section class="card report-card">
        <div class="card-head"><div><h2>Largest jobs</h2><p>Highest estimated duty and fees.</p></div></div>
        <div class="card-body">
          <div class="report-list">
            ${report.rows.slice().sort((a, b) => b.totals.totalUSD - a.totals.totalUSD).slice(0, 6).map((r) => `<div class="report-row"><span>${esc(r.shipment.ref)} · ${esc(r.client?.name || 'Unassigned')}</span><strong>${esc(moneyCompact(r.totals.totalUSD, 'USD'))}</strong></div>`).join('')}
          </div>
        </div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="card-head"><div><h2>Duty & fee ledger</h2><p>All jobs, current values.</p></div><span class="badge">${report.rows.length} rows</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Job</th><th>Client</th><th>Status</th><th class="num">Entered value</th><th class="num">Duty</th><th class="num">MPF + HMF</th><th class="num">Total (USD)</th></tr></thead>
          <tbody>${report.rows.map((r) => `<tr>
            <td><span class="primary mono">${esc(r.shipment.ref)}</span><div class="secondary">${esc(r.shipment.origin)} → ${esc(r.shipment.port)}</div></td>
            <td>${esc(r.client?.name || 'Unassigned')}</td>
            <td>${statusPill(r.shipment.status)}</td>
            <td class="num">${esc(money(r.totals.customsValue, r.shipment.currency))}</td>
            <td class="num">${esc(money(r.totals.duty, r.shipment.currency))}</td>
            <td class="num">${esc(money(r.totals.fees, r.shipment.currency))}</td>
            <td class="num"><span class="mono">${esc(money(r.totals.totalUSD, 'USD'))}</span></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="report-note">Ledger values are operational estimates based on seeded duty rates, MPF, and HMF. They are not a substitute for a filed entry summary.</div>
    </section>`;
  }

  /* ------------------------------------------------------------------ *
   *  Settings
   * ------------------------------------------------------------------ */

  function renderSettings() {
    const ws = currentWorkspace();
    const s = ws.settings;
    return `${pageHead({
      eyebrow: 'Workspace',
      title: 'Settings',
      sub: 'Firm defaults, duty engine inputs, appearance, and local data controls.',
      actions: `<button type="button" class="btn" data-action="export-workspace">${icon('download')} Export workspace</button>`
    })}
    <div class="settings-layout">
      <div class="stack">
        <form class="card" id="settings-form">
          <div class="settings-section">
            <h2>Firm profile</h2>
            <p>Appears on entry summaries and internal documents.</p>
            <div class="form-grid">
              <div class="field"><label for="set-firm">Firm name</label><input class="input" id="set-firm" name="firmName" value="${esc(s.firmName)}" required></div>
              <div class="field"><label for="set-preparer">Preparer</label><input class="input" id="set-preparer" name="preparer" value="${esc(s.preparer)}" required></div>
              <div class="field"><label for="set-license">Broker / license no.</label><input class="input" id="set-license" name="licenseNo" value="${esc(s.licenseNo)}"></div>
              <div class="field"><label for="set-address">Office address</label><input class="input" id="set-address" name="address" value="${esc(s.address)}"></div>
            </div>
          </div>
          <div class="settings-section">
            <h2>Duty engine defaults</h2>
            <p>Used for operational estimates. Verify current rates before filing.</p>
            <div class="form-grid">
              <div class="field"><label for="set-de-minimis">De minimis threshold (USD)</label><input class="input" id="set-de-minimis" name="deMinimis" type="number" min="0" step="0.01" value="${esc(s.deMinimis)}"></div>
              <div class="field"><label for="set-default-vat">Default import VAT / GST %</label><input class="input" id="set-default-vat" name="defaultVat" type="number" min="0" max="100" step="0.01" value="${esc(s.defaultVat)}"></div>
              <div class="field"><label for="set-mpf-rate">MPF rate (decimal)</label><input class="input" id="set-mpf-rate" name="mpfRate" type="number" min="0" max="1" step="0.000001" value="${esc(s.mpfRate)}"></div>
              <div class="field"><label for="set-mpf-min">MPF minimum (USD)</label><input class="input" id="set-mpf-min" name="mpfMin" type="number" min="0" step="0.01" value="${esc(s.mpfMin)}"></div>
              <div class="field"><label for="set-mpf-max">MPF maximum (USD)</label><input class="input" id="set-mpf-max" name="mpfMax" type="number" min="0" step="0.01" value="${esc(s.mpfMax)}"></div>
              <div class="field"><label for="set-hmf-rate">HMF rate (decimal, ocean)</label><input class="input" id="set-hmf-rate" name="hmfRate" type="number" min="0" max="1" step="0.000001" value="${esc(s.hmfRate)}"></div>
            </div>
            <div class="settings-actions"><button type="submit" class="btn btn-primary">${icon('check')} Save settings</button><span class="filter-note">Changes apply to future calculations.</span></div>
          </div>
        </form>
        <section class="card settings-card">
          <div class="settings-section">
            <h2>Appearance</h2>
            <p>Strict monochrome, light or dark.</p>
            <div class="appearance-row" style="margin-top:12px">
              <div><strong>Theme</strong><span>Applies immediately to this workspace.</span></div>
              <div class="theme-toggle" role="group" aria-label="Theme">
                <button type="button" class="theme-btn" data-action="set-theme" data-theme-value="light" aria-pressed="${getTheme() === 'light'}">${icon('sun', 'icon-sm')} Light</button>
                <button type="button" class="theme-btn" data-action="set-theme" data-theme-value="dark" aria-pressed="${getTheme() === 'dark'}">${icon('moon', 'icon-sm')} Dark</button>
              </div>
            </div>
          </div>
        </section>
        <section class="card settings-card">
          <div class="settings-section">
            <h2>Local data</h2>
            <p>Everything is stored in this browser. Export a JSON copy before clearing site data.</p>
            <div class="settings-actions">
              <button type="button" class="btn" data-action="export-workspace">${icon('download')} Export JSON</button>
              <button type="button" class="btn" data-action="import-workspace">${icon('upload')} Import JSON</button>
              <input type="file" id="import-file" accept="application/json,.json" hidden>
            </div>
            <p class="hint" style="margin-top:8px">Import replaces the current workspace only. User accounts and passwords are not exported.</p>
          </div>
        </section>
        <section class="card settings-card danger-zone">
          <div class="card-head"><div><h2>Danger zone</h2><p>Irreversible local actions.</p></div></div>
          <div class="card-body">
            <div class="appearance-row">
              <div><strong>Restore demo data</strong><span>Replace this workspace with the seeded 14-job demo.</span></div>
              <button type="button" class="btn btn-danger btn-sm" data-action="reset-demo">Restore demo</button>
            </div>
            <div class="appearance-row" style="border-bottom:0">
              <div><strong>Delete this workspace</strong><span>Remove clients and jobs, then start with an empty desk.</span></div>
              <button type="button" class="btn btn-danger btn-sm" data-action="clear-workspace">Clear workspace</button>
            </div>
          </div>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2>Account</h2><p>${esc(currentUser.email)}</p></div></div>
          <div class="settings-section">
            <form id="password-form" class="form-grid" novalidate>
              <div class="field span-2"><label for="pw-current">Current password</label><input class="input" id="pw-current" name="current" type="password" autocomplete="current-password" required></div>
              <div class="field"><label for="pw-new">New password</label><input class="input" id="pw-new" name="new" type="password" autocomplete="new-password" required></div>
              <div class="field"><label for="pw-confirm">Confirm</label><input class="input" id="pw-confirm" name="confirm" type="password" autocomplete="new-password" required></div>
              <div class="settings-actions span-2"><button type="submit" class="btn btn-sm">${icon('check')} Change password</button></div>
            </form>
            <div class="settings-actions" style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
              <button type="button" class="btn btn-sm" data-action="sign-out">${icon('logout')} Sign out</button>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Keyboard</h2><p>Move quickly without the mouse.</p></div></div>
          <div class="settings-section">
            <div class="shortcut-list">
              <div class="shortcut-row"><span>Command palette</span><span class="kbd">⌘K</span></div>
              <div class="shortcut-row"><span>Focus search</span><span class="kbd">/</span></div>
              <div class="shortcut-row"><span>New job</span><span class="kbd">N</span></div>
              <div class="shortcut-row"><span>Close dialog</span><span class="kbd">Esc</span></div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>About</h2><p>Clearway ${esc(APP_VERSION)}</p></div></div>
          <div class="settings-section">
            <p class="small muted">A local-first customs clearance operations desk. No server, no API keys, no external accounts. Data persists in this browser only.</p>
            <p class="small muted" style="margin-top:8px">Duty and fee calculations are operational estimates for workflow planning. Verify tariff classification, valuation, and current rates before filing.</p>
          </div>
        </section>
      </div>
    </div>`;
  }
/* ------------------------------------------------------------------ *
   *  Toasts and modal plumbing
   * ------------------------------------------------------------------ */

  function showToast(message, tone = 'info') {
    if (!toastRoot) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${icon(tone === 'warn' ? 'alert' : tone === 'success' ? 'check-circle' : 'dot')}<p>${esc(message)}</p><button type="button" class="toast-close" aria-label="Dismiss">${icon('close')}</button>`;
    toastRoot.appendChild(toast);
    const remove = () => { toast.remove(); };
    const timer = window.setTimeout(remove, 4200);
    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      window.clearTimeout(timer);
      remove();
    });
    while (toastRoot.children.length > 3) toastRoot.firstElementChild?.remove();
  }

  function syncScrollLock() {
    document.body.classList.toggle('modal-open', Boolean(ui.modal || ui.commandOpen));
  }

  function openModal({ title, subtitle = '', body, footer = '', size = '' }) {
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ui.modal = true;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-head">
          <div><h2 id="modal-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
          <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>
        </header>
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
      </div>
    </div>`;
    syncScrollLock();
    window.setTimeout(() => {
      const focusTarget = modalRoot.querySelector('[autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button');
      focusTarget?.focus();
    }, 0);
  }

  function closeModal() {
    if (!ui.modal) return;
    modalRoot.innerHTML = '';
    ui.modal = false;
    syncScrollLock();
    if (lastFocused && document.contains(lastFocused)) {
      try { lastFocused.focus(); } catch (_) {}
    }
    lastFocused = null;
  }

  /* ------------------------------------------------------------------ *
   *  Command palette
   * ------------------------------------------------------------------ */

  function commandItems() {
    const q = ui.commandQuery.trim().toLowerCase();
    const actions = [
      { kind: 'action', action: 'new-shipment', group: 'Actions', label: 'New shipment', detail: 'Create a job file', icon: 'plus' },
      { kind: 'action', action: 'dashboard', group: 'Navigate', label: 'Dashboard', detail: 'Operations overview', icon: 'grid' },
      { kind: 'action', action: 'entry', group: 'Navigate', label: 'Entry desk', detail: 'Filing queue and worksheets', icon: 'file' },
      { kind: 'action', action: 'documents', group: 'Navigate', label: 'Documents', detail: 'Document register', icon: 'docs' },
      { kind: 'action', action: 'clients', group: 'Navigate', label: 'Clients', detail: 'Importers and consignees', icon: 'users' },
      { kind: 'action', action: 'reports', group: 'Navigate', label: 'Reports', detail: 'Duty and fee ledger', icon: 'chart' },
      { kind: 'action', action: 'export-shipments', group: 'Actions', label: 'Export shipments CSV', detail: 'Download the current filter', icon: 'download' },
      { kind: 'action', action: 'toggle-theme', group: 'Actions', label: 'Toggle theme', detail: 'Light or dark', icon: 'moon' }
    ];
    const shipments = currentWorkspace().shipments
      .filter((s) => !q || [s.ref, s.importer, s.port, s.origin, clientName(s.clientId)].join(' ').toLowerCase().includes(q))
      .slice(0, q ? 6 : 3)
      .map((s) => ({ kind: 'shipment', id: s.id, group: 'Shipments', label: `${s.ref} · ${clientName(s.clientId)}`, detail: `${s.origin} → ${s.port} · ${STATUSES[s.status].label}`, icon: 'box' }));
    const clients = currentWorkspace().clients
      .filter((c) => !q || [c.name, c.contact, c.email, c.taxId].join(' ').toLowerCase().includes(q))
      .slice(0, q ? 4 : 2)
      .map((c) => ({ kind: 'client', id: c.id, group: 'Clients', label: c.name, detail: `${c.contact || 'No contact'} · ${c.email || 'No email'}`, icon: 'users' }));
    return actions.filter((a) => !q || a.label.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q))
      .concat(shipments, clients);
  }

  function openCommand() {
    if (!currentUser) return;
    ui.commandOpen = true;
    ui.commandQuery = '';
    ui.commandIndex = 0;
    commandRoot.innerHTML = `<div class="command-backdrop" data-command-backdrop>
      <div class="command" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="command-search">
          ${icon('search')}
          <input id="command-input" type="search" placeholder="Search jobs, clients, or run a command…" autocomplete="off" aria-label="Command search">
          <span class="kbd">Esc</span>
        </div>
        <div class="command-results" id="command-results" role="listbox" aria-label="Results"></div>
        <div class="command-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">Esc</span> close</span></div>
      </div>
    </div>`;
    syncScrollLock();
    renderCommandResults();
    window.setTimeout(() => document.getElementById('command-input')?.focus(), 0);
  }

  function closeCommand() {
    if (!ui.commandOpen) return;
    ui.commandOpen = false;
    commandRoot.innerHTML = '';
    ui.commandItems = [];
    syncScrollLock();
  }

  function renderCommandResults() {
    const target = document.getElementById('command-results');
    if (!target) return;
    const items = commandItems();
    ui.commandItems = items;
    ui.commandIndex = clamp(ui.commandIndex, 0, Math.max(0, items.length - 1));
    if (!items.length) {
      target.innerHTML = `<div class="command-empty">No matches. Try a job ref, client, or “new”.</div>`;
      return;
    }
    let lastGroup = '';
    target.innerHTML = items.map((item, index) => {
      const group = item.group !== lastGroup ? `<div class="command-group-label">${esc(item.group)}</div>` : '';
      lastGroup = item.group;
      return `${group}<button type="button" class="command-item" role="option" aria-selected="${index === ui.commandIndex}" data-action="run-command" data-command-kind="${esc(item.kind)}" data-command-id="${esc(item.id || '')}" data-command-action="${esc(item.action || '')}">
        ${icon(item.icon)}
        <div class="cmd-main"><strong>${esc(item.label)}</strong><span>${esc(item.detail)}</span></div>
        <span class="kbd">↵</span>
      </button>`;
    }).join('');
  }

  function runCommand(item) {
    if (!item) return;
    closeCommand();
    if (item.kind === 'shipment') {
      location.hash = `#/shipments/${item.id}`;
      return;
    }
    if (item.kind === 'client') {
      openClientDetail(item.id);
      return;
    }
    switch (item.action) {
      case 'new-shipment': openShipmentModal(); break;
      case 'dashboard': location.hash = '#/dashboard'; break;
      case 'entry': location.hash = '#/entry'; break;
      case 'documents': location.hash = '#/documents'; break;
      case 'clients': location.hash = '#/clients'; break;
      case 'reports': location.hash = '#/reports'; break;
      case 'export-shipments': exportShipmentsCSV(); break;
      case 'toggle-theme': setTheme(getTheme() === 'dark' ? 'light' : 'dark'); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------------ *
   *  Client forms
   * ------------------------------------------------------------------ */

  function validateClient(data) {
    const errors = {};
    if (!String(data.name || '').trim()) errors.name = 'Client name is required.';
    if (!String(data.contact || '').trim()) errors.contact = 'Contact name is required.';
    if (!String(data.email || '').trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) errors.email = 'Enter a valid email address.';
    if (data.status && !['active', 'inactive'].includes(data.status)) errors.status = 'Choose a valid status.';
    return errors;
  }

  function clientModalBody(data, errors) {
    const errorList = Object.values(errors);
    return `<div class="inline-error" ${errorList.length ? '' : 'hidden'}><strong>Check the highlighted fields.</strong><ul>${errorList.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <form id="client-form" data-id="${esc(data.id || '')}" novalidate>
        <div class="form-grid">
          <div class="field span-2"><label for="cl-name">Client name</label><input class="input" id="cl-name" name="name" value="${esc(data.name)}" aria-invalid="${Boolean(errors.name)}" required></div>
          <div class="field"><label for="cl-contact">Primary contact</label><input class="input" id="cl-contact" name="contact" value="${esc(data.contact)}" required></div>
          <div class="field"><label for="cl-email">Email</label><input class="input" id="cl-email" name="email" type="email" value="${esc(data.email)}" aria-invalid="${Boolean(errors.email)}" required></div>
          <div class="field"><label for="cl-phone">Phone</label><input class="input" id="cl-phone" name="phone" value="${esc(data.phone)}"></div>
          <div class="field"><label for="cl-tax">Tax ID / EIN</label><input class="input" id="cl-tax" name="taxId" value="${esc(data.taxId)}"></div>
          <div class="field span-2"><label for="cl-address">Address</label><input class="input" id="cl-address" name="address" value="${esc(data.address)}"></div>
          <div class="field"><label for="cl-terms">Payment terms</label><input class="input" id="cl-terms" name="terms" value="${esc(data.terms)}" placeholder="Net 15"></div>
          <div class="field"><label for="cl-status">Status</label><select class="select" id="cl-status" name="status"><option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>Inactive</option></select></div>
        </div>
      </form>`;
  }

  function openClientModal(id = null, initial = null, errors = {}) {
    const existing = id ? getClient(id) : null;
    const data = initial || (existing ? { ...existing } : {
      id: '', name: '', contact: '', email: '', phone: '', address: '',
      taxId: '', terms: 'Net 15', status: 'active'
    });
    ui.clientDraft = data;
    ui.clientErrors = errors;
    openModal({
      title: existing ? 'Edit client' : 'New client',
      subtitle: existing ? 'Update the client record used on job files.' : 'Add an importer or consignee to the desk.',
      size: 'modal-lg',
      body: clientModalBody(data, errors),
      footer: `<span class="small muted">${existing ? 'Changes apply to future job files only.' : 'You can add a contact and tax ID now or later.'}</span><div class="row"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" form="client-form" class="btn btn-primary">${icon('check')} Save client</button></div>`
    });
  }

  function saveClientForm() {
    const form = document.getElementById('client-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    const errors = validateClient(data);
    if (Object.keys(errors).length) {
      openClientModal(form.dataset.id || null, { ...(ui.clientDraft || {}), ...data }, errors);
      return;
    }
    const ws = currentWorkspace();
    const id = form.dataset.id;
    if (id) {
      const client = getClient(id);
      if (client) Object.assign(client, data);
      showToast('Client updated.');
    } else {
      const newClient = { ...data, id: uid('cl'), createdAt: nowISO() };
      ws.clients.push(newClient);
      showToast('Client added.');
    }
    persist();
    closeModal();
    render();
  }

  function openClientDetail(id) {
    const client = getClient(id);
    if (!client) return;
    const jobs = currentWorkspace().shipments.filter((s) => s.clientId === id);
    const openJobs = jobs.filter(isActive);
    const duty = openJobs.reduce((sum, s) => sum + computeEntry(s).totalUSD, 0);
    openModal({
      title: client.name,
      subtitle: `${client.contact || 'No contact'} · ${client.email || 'No email'}`,
      size: 'modal-lg',
      body: `<div class="meta-grid" style="margin-bottom:16px">
          <div class="meta-cell"><span>Status</span><strong>${esc(client.status)}</strong></div>
          <div class="meta-cell"><span>Open jobs</span><strong>${openJobs.length} of ${jobs.length}</strong></div>
          <div class="meta-cell"><span>Duty exposure</span><strong>${esc(money(duty, 'USD'))}</strong></div>
        </div>
        <div class="form-grid" style="margin-bottom:16px">
          <div class="field"><span class="label">Address</span><p class="small muted">${esc(client.address || '—')}</p></div>
          <div class="field"><span class="label">Tax ID / terms</span><p class="small muted">${esc(client.taxId || '—')} · ${esc(client.terms || '—')}</p></div>
        </div>
        <div class="modal-subhead">Job files</div>
        ${jobs.length ? `<div class="table-wrap"><table><thead><tr><th>Job</th><th>Route</th><th>Status</th><th class="num">Duty (USD)</th></tr></thead><tbody>
          ${jobs.map((s) => `<tr><td><span class="mono primary">${esc(s.ref)}</span></td><td>${esc(s.origin)} → ${esc(s.port)}</td><td>${statusPill(s.status)}</td><td class="num">${esc(moneyCompact(computeEntry(s).totalUSD, 'USD'))}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState('No jobs yet', 'This client has no job files on the desk.')}`,
      footer: `<button type="button" class="btn" data-action="close-modal">Close</button><div class="row"><button type="button" class="btn" data-action="edit-client" data-id="${esc(client.id)}">${icon('edit')} Edit</button><button type="button" class="btn btn-primary" data-action="new-shipment">${icon('plus')} New job</button></div>`
    });
  }

  /* ------------------------------------------------------------------ *
   *  Shipment forms and validation
   * ------------------------------------------------------------------ */

  function emptyLine() {
    return {
      id: uid('li'), description: '', hsCode: '', origin: '',
      qty: 1, unitPrice: 0, dutyRate: 0, vatRate: 0
    };
  }

  function defaultDocsForNew(mode, insurance) {
    const defs = [['Commercial Invoice', true], ['Packing List', true], ['Bill of Lading / AWB', true]];
    if (num(insurance) > 0) defs.push(['Insurance Certificate', true]);
    if (String(mode).startsWith('Ocean')) defs.push(['ISF Filing', true]);
    return defs.map(([type, required]) => ({
      id: uid('doc'), type, required, received: false, verified: false, reference: '', note: '', updatedAt: nowISO()
    }));
  }

  function lineRowHtml(item, index) {
    return `<div class="line-row" data-line-id="${esc(item.id)}">
      <input class="input" data-line-field="description" value="${esc(item.description)}" placeholder="Cargo description" aria-label="Line ${index + 1} description">
      <input class="input" data-line-field="hsCode" value="${esc(item.hsCode)}" placeholder="HS code" aria-label="Line ${index + 1} HS code">
      <input class="input" data-line-field="origin" value="${esc(item.origin)}" placeholder="Origin" aria-label="Line ${index + 1} origin">
      <input class="input" data-line-field="qty" type="number" min="0" step="0.01" value="${esc(item.qty)}" aria-label="Line ${index + 1} quantity">
      <input class="input" data-line-field="unitPrice" type="number" min="0" step="0.01" value="${esc(item.unitPrice)}" aria-label="Line ${index + 1} unit value">
      <input class="input" data-line-field="dutyRate" type="number" min="0" max="100" step="0.01" value="${esc(item.dutyRate)}" aria-label="Line ${index + 1} duty rate">
      <input class="input" data-line-field="vatRate" type="number" min="0" max="100" step="0.01" value="${esc(item.vatRate)}" aria-label="Line ${index + 1} VAT rate">
      <span class="line-total">${esc(money(num(item.qty) * num(item.unitPrice), 'USD'))}</span>
      <button type="button" class="row-action-btn line-remove" data-action="remove-line" data-index="${index}" aria-label="Remove line ${index + 1}" title="Remove line">${icon('trash')}</button>
    </div>`;
  }

  function docEditorHtml(doc, index) {
    return `<div class="doc-editor-row" data-doc-id="${esc(doc.id)}" data-doc-type="${esc(doc.type)}">
      <strong>${esc(doc.type)}</strong>
      <label class="check"><input type="checkbox" data-doc-field="required" ${doc.required ? 'checked' : ''}> Required</label>
      <label class="check"><input type="checkbox" data-doc-field="received" ${doc.received ? 'checked' : ''}> Received</label>
      <label class="check"><input type="checkbox" data-doc-field="verified" ${doc.verified ? 'checked' : ''}> Verified</label>
      <button type="button" class="row-action-btn" data-action="remove-doc-row" data-doc="${esc(doc.id)}" aria-label="Remove ${esc(doc.type)}">${icon('trash')}</button>
    </div>`;
  }

  function shipmentCalcHtml(draft) {
    const totals = computeEntry({ ...draft, lineItems: draft.lineItems || [] });
    const usPort = US_PORTS.includes(draft.port);
    return `<div class="calc-panel">
      <h3>Live estimate</h3>
      <div class="calc-row"><span>Goods value</span><strong>${esc(money(totals.goodsValue, draft.currency || 'USD'))}</strong></div>
      <div class="calc-row"><span>Freight + insurance</span><strong>${esc(money(totals.freight + totals.insurance, draft.currency || 'USD'))}</strong></div>
      <div class="calc-row"><span>Entered value</span><strong>${esc(money(totals.customsValue, draft.currency || 'USD'))}</strong></div>
      <div class="calc-row"><span>Duty</span><strong>${esc(money(totals.duty, draft.currency || 'USD'))}</strong></div>
      ${usPort ? `<div class="calc-row"><span>MPF</span><strong>${esc(money(totals.mpf, draft.currency || 'USD'))}</strong></div><div class="calc-row"><span>HMF</span><strong>${esc(money(totals.hmf, draft.currency || 'USD'))}</strong></div>` : ''}
      ${totals.vat > 0 ? `<div class="calc-row"><span>Import VAT</span><strong>${esc(money(totals.vat, draft.currency || 'USD'))}</strong></div>` : ''}
      <div class="calc-row total"><span>Total duty & fees</span><strong>${esc(money(totals.total, draft.currency || 'USD'))}</strong></div>
      ${totals.deMinimis ? `<p class="hint" style="margin-top:8px">Below de minimis threshold. Review eligibility before filing.</p>` : ''}
      <p class="hint" style="margin-top:8px">≈ ${esc(money(totals.totalUSD, 'USD'))} at FX ${esc(num(draft.fxRate, 1).toFixed(4))}.</p>
    </div>`;
  }

  function shipmentModalBody(draft, errors, isEdit) {
    const errorList = Object.values(errors);
    return `<div class="inline-error" ${errorList.length ? '' : 'hidden'}><strong>Fix the following before saving.</strong><ul>${errorList.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <form id="shipment-form" novalidate>
        <div class="grid-main" style="gap:18px;align-items:start">
          <div class="stack-sm">
            <div class="form-section">
              <div class="form-section-head"><h3>Parties & route</h3><span>${isEdit ? 'Editing job file' : 'New job file'}</span></div>
              <div class="form-grid">
                <div class="field"><label for="sh-client">Client</label><select class="select" id="sh-client" name="clientId"><option value="">Choose client</option>${currentWorkspace().clients.map((c) => `<option value="${esc(c.id)}" ${draft.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
                <div class="field"><label for="sh-importer">Importer of record</label><input class="input" id="sh-importer" name="importer" value="${esc(draft.importer)}" placeholder="Legal importer name" required></div>
                <div class="field"><label for="sh-consignee">Consignee</label><input class="input" id="sh-consignee" name="consignee" value="${esc(draft.consignee)}" placeholder="Consignee / receiving point"></div>
                <div class="field"><label for="sh-origin">Origin country</label><input class="input" id="sh-origin" name="origin" value="${esc(draft.origin)}" placeholder="China" required></div>
                <div class="field"><label for="sh-port">Port of entry</label><input class="input" id="sh-port" name="port" list="port-list" value="${esc(draft.port)}" placeholder="Long Beach, CA" required><datalist id="port-list">${US_PORTS.map((p) => `<option value="${esc(p)}"></option>`).join('')}</datalist></div>
                <div class="field"><label for="sh-mode">Mode</label><select class="select" id="sh-mode" name="mode">${MODES.map((m) => `<option value="${esc(m)}" ${draft.mode === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
                <div class="field"><label for="sh-incoterm">Incoterms</label><select class="select" id="sh-incoterm" name="incoterm">${INCOTERMS.map((t) => `<option value="${esc(t)}" ${draft.incoterm === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
                <div class="field"><label for="sh-carrier">Carrier</label><input class="input" id="sh-carrier" name="carrier" value="${esc(draft.carrier)}" placeholder="Maersk / Lufthansa Cargo"></div>
                <div class="field"><label for="sh-bl">B/L or AWB</label><input class="input" id="sh-bl" name="bl" value="${esc(draft.bl)}" placeholder="MAEU-…"></div>
                <div class="field"><label for="sh-etd">ETD</label><input class="input" id="sh-etd" name="etd" type="date" value="${esc(draft.etd)}"></div>
                <div class="field"><label for="sh-eta">ETA</label><input class="input" id="sh-eta" name="eta" type="date" value="${esc(draft.eta)}" required></div>
                <div class="field"><label for="sh-containers">Containers</label><input class="input" id="sh-containers" name="containers" value="${esc((draft.containers || []).join(', '))}" placeholder="MSKU 482913-7, TGHU 773421-0"></div>
                <div class="field"><label for="sh-priority">Priority</label><select class="select" id="sh-priority" name="priority">${['Standard', 'High', 'Urgent'].map((p) => `<option value="${esc(p)}" ${draft.priority === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
              </div>
            </div>
            <div class="form-section">
              <div class="form-section-head"><h3>Cargo & valuation</h3><span>Add at least one line</span></div>
              <div class="line-head"><span>Description</span><span>HS code</span><span>Origin</span><span>Qty</span><span>Unit value</span><span>Duty %</span><span>VAT %</span><span>Total</span><span></span></div>
              <div class="line-editor" id="line-editor">
                ${(draft.lineItems || []).map((l, i) => lineRowHtml(l, i)).join('')}
              </div>
              <button type="button" class="btn btn-sm" data-action="add-line" style="margin-top:8px">${icon('plus')} Add line</button>
              <div class="form-grid-3" style="margin-top:12px">
                <div class="field"><label for="sh-currency">Currency</label><select class="select" id="sh-currency" name="currency">${CURRENCIES.map((c) => `<option value="${esc(c)}" ${draft.currency === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
                <div class="field"><label for="sh-fx">FX to USD</label><input class="input" id="sh-fx" name="fxRate" type="number" min="0.0001" step="0.0001" value="${esc(draft.fxRate)}"></div>
                <div class="field"><label for="sh-freight">Freight (supplementary)</label><input class="input" id="sh-freight" name="freight" type="number" min="0" step="0.01" value="${esc(draft.freight)}"></div>
                <div class="field"><label for="sh-insurance">Insurance</label><input class="input" id="sh-insurance" name="insurance" type="number" min="0" step="0.01" value="${esc(draft.insurance)}"></div>
              </div>
              <p class="hint" style="margin-top:8px">Freight and insurance are added to customs value for estimation. They are not treated as broker fees.</p>
            </div>
            <div class="form-section">
              <div class="form-section-head"><h3>Documents</h3><span>Toggle required and received</span></div>
              <div class="doc-editor" id="doc-editor">
                ${(draft.documents || []).map((d, i) => docEditorHtml(d, i)).join('')}
              </div>
              <div class="row" style="margin-top:8px;gap:6px">
                <select class="select" id="new-doc-type" aria-label="New document type" style="max-width:220px">${DOC_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
                <button type="button" class="btn btn-sm" data-action="add-doc-row">${icon('plus')} Add document</button>
              </div>
            </div>
            <div class="form-section">
              <div class="form-section-head"><h3>Desk notes</h3><span>Visible on the job file</span></div>
              <div class="field"><textarea class="textarea" id="sh-notes" name="notes" placeholder="Hold reasons, client instructions, carrier notes…">${esc(draft.notes)}</textarea></div>
            </div>
          </div>
          <div id="shipment-calc">${shipmentCalcHtml(draft)}</div>
        </div>
      </form>`;
  }

  function openShipmentModal(id = null, initial = null, errors = {}) {
    const ws = currentWorkspace();
    const existing = id ? getShipment(id) : null;
    const draft = initial || (existing ? JSON.parse(JSON.stringify(existing)) : {
      clientId: ws.clients[0]?.id || '',
      importer: '', consignee: '', origin: '', port: 'Long Beach, CA', mode: 'Ocean FCL',
      incoterm: 'FOB', carrier: '', bl: '', etd: '', eta: isoDaysFromNow(5),
      currency: 'USD', fxRate: 1, freight: 0, insurance: 0, containers: [],
      priority: 'Standard', assigned: currentUser.name, notes: '',
      lineItems: [emptyLine()],
      documents: defaultDocsForNew('Ocean FCL', 0)
    });
    ui.shipEditId = id;
    ui.shipDraft = draft;
    ui.shipErrors = errors;
    openModal({
      title: existing ? `Edit ${existing.ref}` : 'New shipment',
      subtitle: existing ? 'Update the job file, cargo, valuation, and documents.' : 'Create a job file. Duty estimates update as you type.',
      size: 'modal-xl',
      body: shipmentModalBody(draft, errors, Boolean(existing)),
      footer: `<span class="small muted">${existing ? `Status: ${STATUSES[existing.status].label}` : 'New jobs start in Draft.'}</span><div class="row"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" form="shipment-form" class="btn btn-primary">${icon('check')} ${existing ? 'Save changes' : 'Create job'}</button></div>`
    });
  }

  function collectShipmentForm() {
    const form = document.getElementById('shipment-form');
    if (!form) return;
    const draft = ui.shipDraft || {};
    const data = Object.fromEntries(new FormData(form));
    draft.clientId = data.clientId || '';
    draft.importer = data.importer || '';
    draft.consignee = data.consignee || '';
    draft.origin = data.origin || '';
    draft.port = data.port || '';
    draft.mode = data.mode || 'Ocean FCL';
    draft.incoterm = data.incoterm || 'FOB';
    draft.carrier = data.carrier || '';
    draft.bl = data.bl || '';
    draft.etd = data.etd || '';
    draft.eta = data.eta || '';
    draft.currency = data.currency || 'USD';
    draft.fxRate = data.fxRate;
    draft.freight = data.freight;
    draft.insurance = data.insurance;
    draft.containers = String(data.containers || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    draft.priority = data.priority || 'Standard';
    draft.notes = data.notes || '';
    draft.lineItems = [...form.querySelectorAll('.line-row')].map((row) => {
      const get = (name) => row.querySelector(`[data-line-field="${name}"]`)?.value ?? '';
      return {
        id: row.dataset.lineId,
        description: get('description'),
        hsCode: get('hsCode'),
        origin: get('origin'),
        qty: get('qty'),
        unitPrice: get('unitPrice'),
        dutyRate: get('dutyRate'),
        vatRate: get('vatRate')
      };
    });
    draft.documents = [...form.querySelectorAll('.doc-editor-row')].map((row) => {
      const existing = (draft.documents || []).find((d) => d.id === row.dataset.docId) || {};
      const checked = (name) => Boolean(row.querySelector(`[data-doc-field="${name}"]`)?.checked);
      return {
        ...existing,
        id: row.dataset.docId,
        type: row.dataset.docType,
        required: checked('required'),
        received: checked('received'),
        verified: checked('verified') && checked('received'),
        updatedAt: nowISO()
      };
    });
    ui.shipDraft = draft;
    updateShipmentCalc();
  }

  function updateShipmentCalc() {
    const target = document.getElementById('shipment-calc');
    if (target && ui.shipDraft) target.innerHTML = shipmentCalcHtml(ui.shipDraft);
  }

  function validateShipment(draft) {
    const errors = {};
    if (!draft.clientId || !getClient(draft.clientId)) errors.clientId = 'Choose an existing client.';
    if (!String(draft.importer || '').trim()) errors.importer = 'Importer of record is required.';
    if (!String(draft.origin || '').trim()) errors.origin = 'Origin country is required.';
    if (!String(draft.port || '').trim()) errors.port = 'Port of entry is required.';
    if (!String(draft.eta || '').trim() || !isValidDate(draft.eta)) errors.eta = 'Enter a valid ETA.';
    if (draft.etd && !isValidDate(draft.etd)) errors.etd = 'Enter a valid ETD.';
    if (!CURRENCIES.includes(draft.currency)) errors.currency = 'Choose a valid currency.';
    if (!(num(draft.fxRate) > 0)) errors.fxRate = 'FX rate must be greater than zero.';
    if (num(draft.freight) < 0) errors.freight = 'Freight cannot be negative.';
    if (num(draft.insurance) < 0) errors.insurance = 'Insurance cannot be negative.';
    const lines = Array.isArray(draft.lineItems) ? draft.lineItems : [];
    if (!lines.length) errors.lines = 'Add at least one cargo line.';
    lines.forEach((l, i) => {
      if (!String(l.description || '').trim()) errors[`line_${i}_description`] = `Line ${i + 1}: description is required.`;
      const hs = String(l.hsCode || '').replace(/[.\s]/g, '');
      if (!/^\d{6,10}$/.test(hs)) errors[`line_${i}_hsCode`] = `Line ${i + 1}: use a 6–10 digit HS code.`;
      if (num(l.qty) <= 0) errors[`line_${i}_qty`] = `Line ${i + 1}: quantity must be positive.`;
      if (num(l.unitPrice) <= 0) errors[`line_${i}_unitPrice`] = `Line ${i + 1}: unit value must be positive.`;
      if (num(l.dutyRate) < 0 || num(l.dutyRate) > 100) errors[`line_${i}_dutyRate`] = `Line ${i + 1}: duty rate must be 0–100%.`;
      if (num(l.vatRate) < 0 || num(l.vatRate) > 100) errors[`line_${i}_vatRate`] = `Line ${i + 1}: VAT rate must be 0–100%.`;
    });
    const clean = {
      clientId: draft.clientId,
      importer: String(draft.importer || '').trim(),
      consignee: String(draft.consignee || '').trim() || String(draft.importer || '').trim(),
      origin: String(draft.origin || '').trim(),
      port: String(draft.port || '').trim(),
      mode: draft.mode,
      incoterm: draft.incoterm,
      carrier: String(draft.carrier || '').trim(),
      bl: String(draft.bl || '').trim(),
      etd: draft.etd || '',
      eta: draft.eta || '',
      currency: draft.currency,
      fxRate: num(draft.fxRate, 1),
      freight: Math.max(0, num(draft.freight)),
      insurance: Math.max(0, num(draft.insurance)),
      containers: Array.isArray(draft.containers) ? draft.containers : [],
      priority: draft.priority || 'Standard',
      assigned: currentUser.name,
      notes: String(draft.notes || ''),
      lineItems: lines.map((l) => ({
        id: l.id || uid('li'),
        description: String(l.description || '').trim(),
        hsCode: String(l.hsCode || '').trim(),
        origin: String(l.origin || '').trim(),
        qty: num(l.qty),
        unitPrice: num(l.unitPrice),
        dutyRate: num(l.dutyRate),
        vatRate: num(l.vatRate)
      })),
      documents: (Array.isArray(draft.documents) ? draft.documents : []).map((d) => ({
        id: d.id || uid('doc'),
        type: d.type,
        required: Boolean(d.required),
        received: Boolean(d.received),
        verified: Boolean(d.received && d.verified),
        reference: String(d.reference || ''),
        note: String(d.note || ''),
        updatedAt: nowISO()
      }))
    };
    return { errors, clean };
  }

  function saveShipmentForm() {
    collectShipmentForm();
    const draft = ui.shipDraft;
    if (!draft) return;
    const { errors, clean } = validateShipment(draft);
    if (Object.keys(errors).length) {
      openShipmentModal(ui.shipEditId || null, draft, errors);
      return;
    }
    const ws = currentWorkspace();
    const existingId = ui.shipEditId;
    if (existingId) {
      const shipment = getShipment(existingId);
      if (!shipment) return;
      Object.assign(shipment, clean, { updatedAt: nowISO() });
      addHistory(shipment, 'edit', 'Job details, cargo, or documents updated.');
      persist();
      closeModal();
      render();
      showToast(`${shipment.ref} updated.`, 'success');
      return;
    }
    const shipment = {
      ...clean,
      id: uid('sh'),
      ref: nextRef(),
      status: 'draft',
      entryNo: '',
      clearedAt: '',
      history: [],
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    addHistory(shipment, 'created', 'Job file created from a new instruction.');
    ws.shipments.unshift(shipment);
    persist();
    closeModal();
    location.hash = `#/shipments/${shipment.id}`;
    render();
    showToast(`${shipment.ref} created.`, 'success');
  }

  /* ------------------------------------------------------------------ *
   *  Document actions and forms
   * ------------------------------------------------------------------ */

  function toggleDocReceived(shipmentId, docId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const doc = (shipment.documents || []).find((d) => d.id === docId);
    if (!doc) return;
    doc.received = !doc.received;
    if (!doc.received) doc.verified = false;
    doc.updatedAt = nowISO();
    addHistory(shipment, 'doc', `${doc.type} marked ${doc.received ? 'received' : 'not received'}.`);
    shipment.updatedAt = nowISO();
    persist();
    render();
    showToast(`${doc.type} ${doc.received ? 'received' : 'marked missing'}.`);
  }

  function toggleDocVerified(shipmentId, docId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const doc = (shipment.documents || []).find((d) => d.id === docId);
    if (!doc || !doc.received) return;
    doc.verified = !doc.verified;
    doc.updatedAt = nowISO();
    addHistory(shipment, 'doc', `${doc.type} ${doc.verified ? 'verified' : 'verification removed'}.`);
    shipment.updatedAt = nowISO();
    persist();
    render();
    showToast(`${doc.type} ${doc.verified ? 'verified' : 'verification removed'}.`);
  }

  function docModalBody(doc, errors) {
    const errorList = Object.values(errors);
    return `<div class="inline-error" ${errorList.length ? '' : 'hidden'}><ul>${errorList.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
      <form id="doc-form" data-shipment="${esc(doc.shipmentId)}" data-doc="${esc(doc.id)}" novalidate>
        <div class="form-grid">
          <div class="field span-2"><label for="doc-doc-type">Document type</label><select class="select" id="doc-doc-type" name="type">${DOC_TYPES.map((t) => `<option value="${esc(t)}" ${doc.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label for="doc-ref">Reference</label><input class="input" id="doc-ref" name="reference" value="${esc(doc.reference)}" placeholder="Invoice / B/L / AWB no."></div>
          <div class="field"><label for="doc-updated">Status</label><div class="row" style="padding-top:7px;gap:14px;flex-wrap:wrap"><label class="check"><input type="checkbox" name="required" ${doc.required ? 'checked' : ''}> Required</label><label class="check"><input type="checkbox" name="received" ${doc.received ? 'checked' : ''}> Received</label><label class="check"><input type="checkbox" name="verified" ${doc.verified ? 'checked' : ''}> Verified</label></div></div>
          <div class="field span-2"><label for="doc-note">Note</label><textarea class="textarea" id="doc-note" name="note" placeholder="Chasing supplier, carrier reference, discrepancy…">${esc(doc.note)}</textarea></div>
        </div>
      </form>`;
  }

  function openGlobalAddDoc() {
    const ws = currentWorkspace();
    if (!ws.shipments.length) {
      showToast('Create a shipment before adding a document.', 'warn');
      return;
    }
    openModal({
      title: 'Add document',
      subtitle: 'Choose the job file that should receive the document.',
      body: `<form id="add-doc-form">
        <div class="field"><label for="add-doc-shipment">Job file</label>
          <select class="select" id="add-doc-shipment" name="shipmentId">
            ${ws.shipments.map((s) => `<option value="${esc(s.id)}">${esc(s.ref)} · ${esc(clientName(s.clientId))} · ${esc(s.origin)} → ${esc(s.port)}</option>`).join('')}
          </select>
          <p class="hint">The document register is shared across all jobs. Choose the job that owns this record.</p>
        </div>
      </form>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" form="add-doc-form" class="btn btn-primary">${icon('arrow-right')} Continue</button>`
    });
  }

  function openDocModal(shipmentId, docId = null) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const existing = docId ? (shipment.documents || []).find((d) => d.id === docId) : null;
    const doc = existing ? { ...existing, shipmentId: shipment.id } : {
      shipmentId: shipment.id, id: uid('doc'), type: 'Other', required: false,
      received: false, verified: false, reference: '', note: '', updatedAt: nowISO()
    };
    openModal({
      title: existing ? 'Edit document' : 'Add document',
      subtitle: `${shipment.ref} · ${clientName(shipment.clientId)}`,
      size: 'modal-lg',
      body: docModalBody(doc, {}),
      footer: `<div class="row"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" form="doc-form" class="btn btn-primary">${icon('check')} Save document</button></div>${existing ? `<button type="button" class="btn btn-danger" data-action="delete-doc" data-shipment="${esc(shipment.id)}" data-doc="${esc(existing.id)}">Delete</button>` : ''}`
    });
  }

  function saveDocForm() {
    const form = document.getElementById('doc-form');
    if (!form) return;
    const shipmentId = form.dataset.shipment;
    const docId = form.dataset.doc;
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const data = Object.fromEntries(new FormData(form));
    const received = Boolean(data.received);
    const verified = Boolean(data.verified) && received;
    const doc = {
      id: docId,
      type: data.type || 'Other',
      required: Boolean(data.required),
      received,
      verified,
      reference: String(data.reference || ''),
      note: String(data.note || ''),
      updatedAt: nowISO()
    };
    const existing = (shipment.documents || []).find((d) => d.id === docId);
    if (existing) Object.assign(existing, doc);
    else shipment.documents = shipment.documents || [];
    if (!existing) shipment.documents.push(doc);
    addHistory(shipment, 'doc', `${doc.type} ${existing ? 'updated' : 'added'}${received ? ' and received' : ''}${verified ? ' and verified' : ''}.`);
    shipment.updatedAt = nowISO();
    persist();
    closeModal();
    render();
    showToast(`${doc.type} saved.`, 'success');
  }

  function openDeleteDoc(shipmentId, docId) {
    const shipment = getShipment(shipmentId);
    const doc = (shipment?.documents || []).find((d) => d.id === docId);
    if (!doc) return;
    openModal({
      title: 'Delete document',
      subtitle: `${doc.type} from ${shipment.ref}`,
      body: `<p class="small">This removes the document record from the job file. It does not delete any file from the client or carrier.</p>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm-delete-doc" data-shipment="${esc(shipmentId)}" data-doc="${esc(docId)}">${icon('trash')} Delete document</button>`
    });
  }

  function confirmDeleteDoc(shipmentId, docId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const doc = (shipment.documents || []).find((d) => d.id === docId);
    if (!doc) return;
    shipment.documents = shipment.documents.filter((d) => d.id !== docId);
    addHistory(shipment, 'doc', `${doc.type} removed from the file.`);
    shipment.updatedAt = nowISO();
    persist();
    closeModal();
    render();
    showToast('Document removed.');
  }

  /* ------------------------------------------------------------------ *
   *  Status transitions
   * ------------------------------------------------------------------ */

  function openStatusModal(shipmentId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    const allowed = NEXT_STATUS[shipment.status] || [];
    if (!allowed.length) {
      showToast(`${shipment.ref} is closed and has no next status.`);
      return;
    }
    openModal({
      title: `Move ${shipment.ref}`,
      subtitle: `Current status: ${STATUSES[shipment.status].label}. Choose the next status and add an audit note.`,
      body: `<form id="status-form" data-id="${esc(shipment.id)}" novalidate>
        <div class="inline-error" id="status-error" hidden></div>
        <div class="field" style="margin-bottom:14px">
          <label for="status-target">Next status</label>
          <select class="select" id="status-target" name="target">${allowed.map((key) => `<option value="${esc(key)}">${esc(STATUSES[key].label)} — ${esc(STATUSES[key].description)}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="status-note">Audit note</label><textarea class="textarea" id="status-note" name="note" placeholder="What changed, who confirmed it, or what is being chased…"></textarea></div>
      </form>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" form="status-form" class="btn btn-primary">${icon('arrow-right')} Move job</button>`
    });
  }

  function changeStatus(shipmentId, target, note = '') {
    const shipment = getShipment(shipmentId);
    if (!shipment) return { ok: false, error: 'Job not found.' };
    if (!(NEXT_STATUS[shipment.status] || []).includes(target)) return { ok: false, error: 'That status transition is not allowed.' };
    const missing = missingDocs(shipment);
    if (['ready', 'filed', 'cleared'].includes(target) && missing.length) {
      return { ok: false, error: `Resolve ${plural(missing.length, 'required document', 'required documents')} before moving to ${STATUSES[target].label}: ${missing.map((d) => d.type).join(', ')}.` };
    }
    if (target === 'cleared' && !shipment.entryNo) return { ok: false, error: 'Assign an entry number before marking cleared.' };
    if (target === 'filed' && !shipment.entryNo) shipment.entryNo = nextEntryNo();
    shipment.status = target;
    shipment.updatedAt = nowISO();
    if (target === 'cleared') shipment.clearedAt = nowISO();
    if (target !== 'cleared') shipment.clearedAt = '';
    addHistory(shipment, 'status', note.trim() || `Status changed to ${STATUSES[target].label}.`);
    persist();
    closeModal();
    render();
    showToast(`${shipment.ref} moved to ${STATUSES[target].label}.`, 'success');
    return { ok: true };
  }

  /* ------------------------------------------------------------------ *
   *  Delete confirmations
   * ------------------------------------------------------------------ */

  function openConfirmDeleteShipment(id) {
    const shipment = getShipment(id);
    if (!shipment) return;
    openModal({
      title: `Delete ${shipment.ref}?`,
      subtitle: 'This removes the job file, its documents, and its history from this workspace.',
      body: `<p class="small">This cannot be undone. Export the job or workspace first if you need a record.</p>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm-delete-shipment" data-id="${esc(id)}">${icon('trash')} Delete job</button>`
    });
  }

  function confirmDeleteShipment(id) {
    const ws = currentWorkspace();
    const shipment = getShipment(id);
    if (!shipment) return;
    ws.shipments = ws.shipments.filter((s) => s.id !== id);
    persist();
    closeModal();
    if (ui.route.id === id) location.hash = '#/shipments';
    render();
    showToast(`${shipment.ref} deleted.`);
  }

  function openConfirmDeleteClient(id) {
    const client = getClient(id);
    if (!client) return;
    const jobs = currentWorkspace().shipments.filter((s) => s.clientId === id);
    if (jobs.length) {
      showToast(`${client.name} still has ${plural(jobs.length, 'job', 'jobs')}. Reassign or delete those first.`, 'warn');
      return;
    }
    openModal({
      title: `Delete ${client.name}?`,
      subtitle: 'This removes the client record from the desk.',
      body: `<p class="small">This cannot be undone. Job files are not affected because this client has none.</p>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm-delete-client" data-id="${esc(id)}">${icon('trash')} Delete client</button>`
    });
  }

  function confirmDeleteClient(id) {
    const ws = currentWorkspace();
    const client = getClient(id);
    if (!client) return;
    ws.clients = ws.clients.filter((c) => c.id !== id);
    persist();
    closeModal();
    render();
    showToast(`${client.name} deleted.`);
  }

  /* ------------------------------------------------------------------ *
   *  Entry summary and document outputs
   * ------------------------------------------------------------------ */

  function entrySummaryHtml(shipment) {
    const totals = computeEntry(shipment);
    const progress = docsProgress(shipment);
    const s = currentSettings();
    return `<div class="entry-doc" id="entry-document">
      <div class="entry-doc-head">
        <div>
          <div class="row" style="gap:8px;margin-bottom:6px"><span class="brand-mark">C</span><div><h2>${esc(s.firmName)}</h2><p>${esc(s.address)} · License ${esc(s.licenseNo)}</p></div></div>
          <p>Internal entry working copy · Generated ${esc(formatDateTime(nowISO()))}</p>
        </div>
        <div class="doc-meta">
          <div>ENTRY NO. ${esc(shipment.entryNo || '—')}</div>
          <div>JOB ${esc(shipment.ref)}</div>
          <div>STATUS ${esc(STATUSES[shipment.status].label.toUpperCase())}</div>
        </div>
      </div>
      <div class="entry-doc-grid">
        <div><span>Importer of record</span><strong>${esc(shipment.importer)}</strong></div>
        <div><span>Consignee</span><strong>${esc(shipment.consignee || shipment.importer)}</strong></div>
        <div><span>Port of entry</span><strong>${esc(shipment.port)}</strong></div>
        <div><span>Origin / mode</span><strong>${esc(shipment.origin)} · ${esc(shipment.mode)}</strong></div>
        <div><span>Carrier / B/L</span><strong>${esc(shipment.carrier || '—')} · ${esc(shipment.bl || '—')}</strong></div>
        <div><span>ETD / ETA</span><strong>${esc(formatDate(shipment.etd))} → ${esc(formatDate(shipment.eta))}</strong></div>
        <div><span>Incoterms</span><strong>${esc(shipment.incoterm)}</strong></div>
        <div><span>Currency / FX</span><strong>${esc(shipment.currency)} @ ${esc(num(shipment.fxRate).toFixed(4))}</strong></div>
      </div>
      <h3>Cargo lines</h3>
      <table>
        <thead><tr><th>#</th><th>Description</th><th>HS code</th><th>Origin</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Value</th><th class="num">Duty %</th><th class="num">Duty</th><th class="num">VAT</th></tr></thead>
        <tbody>${totals.lineTotals.map((l, i) => `<tr>
          <td>${i + 1}</td><td>${esc(l.description)}</td><td class="mono">${esc(l.hsCode)}</td><td>${esc(l.origin)}</td>
          <td class="num">${esc(number(l.qty))}</td><td class="num">${esc(money(l.unitPrice, shipment.currency))}</td>
          <td class="num">${esc(money(l.lineCustoms, shipment.currency))}</td><td class="num">${esc(num(l.dutyRate).toFixed(2))}%</td>
          <td class="num">${esc(money(l.lineDuty, shipment.currency))}</td><td class="num">${esc(money(l.lineVat, shipment.currency))}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div class="entry-doc-totals">
        <div class="note">
          <strong>Document status:</strong> ${progress.received} of ${progress.total} required documents received.<br>
          ${totals.deMinimis ? `<strong>De minimis review:</strong> customs value ${esc(money(totals.customsValue, shipment.currency))} is below ${esc(money(totals.deMinimisThreshold, 'USD'))}. Verify eligibility.<br>` : ''}
          <strong>Internal note:</strong> ${esc(shipment.notes || 'No additional desk notes.')}<br><br>
          Figures are operational estimates. Verify classification, valuation, and current duty rates before filing.
        </div>
        <table>
          <tr><td>Goods value</td><td class="num">${esc(money(totals.goodsValue, shipment.currency))}</td></tr>
          <tr><td>Freight / insurance</td><td class="num">${esc(money(totals.freight + totals.insurance, shipment.currency))}</td></tr>
          <tr><td>Entered value</td><td class="num">${esc(money(totals.customsValue, shipment.currency))}</td></tr>
          <tr><td>Duty</td><td class="num">${esc(money(totals.duty, shipment.currency))}</td></tr>
          ${totals.usPort ? `<tr><td>MPF</td><td class="num">${esc(money(totals.mpf, shipment.currency))}</td></tr><tr><td>HMF</td><td class="num">${esc(money(totals.hmf, shipment.currency))}</td></tr>` : ''}
          ${totals.vat > 0 ? `<tr><td>Import VAT</td><td class="num">${esc(money(totals.vat, shipment.currency))}</td></tr>` : ''}
          <tr class="total"><td>Total</td><td class="num">${esc(money(totals.total, shipment.currency))}</td></tr>
        </table>
      </div>
      <div class="entry-doc-sign"><div>Prepared by: ${esc(currentUser.name)}</div><div>Reviewed / approved: ____________________</div></div>
      <div class="entry-doc-foot">Clearway ${esc(APP_VERSION)} · Local-first working copy · Not a filed CBP entry summary. Duty, MPF, and HMF calculations are seeded operational estimates.</div>
    </div>`;
  }

  function openEntrySummary(shipmentId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    ui.entryDocId = shipment.id;
    openModal({
      title: `Entry summary · ${shipment.ref}`,
      subtitle: `${clientName(shipment.clientId)} · ${shipment.origin} → ${shipment.port}`,
      size: 'modal-xl',
      body: entrySummaryHtml(shipment),
      footer: `<span class="small muted">Printable working copy. Verify rates before filing.</span><div class="row"><button type="button" class="btn" data-action="close-modal">Close</button><button type="button" class="btn" data-action="download-entry-txt">${icon('download')} TXT</button><button type="button" class="btn" data-action="download-entry-csv">${icon('download')} CSV</button><button type="button" class="btn btn-primary" data-action="print-entry">${icon('print')} Print</button></div>`
    });
  }

  function entrySummaryText(shipment) {
    const totals = computeEntry(shipment);
    const s = currentSettings();
    const lines = totals.lineTotals.map((l, i) => `${String(i + 1).padStart(2, ' ')}. ${l.description} | HS ${l.hsCode} | ${l.origin} | qty ${number(l.qty)} | unit ${money(l.unitPrice, shipment.currency)} | line ${money(l.lineCustoms, shipment.currency)} | duty ${money(l.lineDuty, shipment.currency)} | VAT ${money(l.lineVat, shipment.currency)}`).join('\n');
    return `CLEARWAY ENTRY SUMMARY (WORKING COPY)
${s.firmName}
${s.address} · License ${s.licenseNo}
Generated ${formatDateTime(nowISO())}

ENTRY NO.: ${shipment.entryNo || '—'}
JOB: ${shipment.ref}
STATUS: ${STATUSES[shipment.status].label}
CLIENT: ${clientName(shipment.clientId)}
IMPORTER: ${shipment.importer}
CONSIGNEE: ${shipment.consignee || shipment.importer}
ORIGIN: ${shipment.origin}
PORT: ${shipment.port}
MODE: ${shipment.mode}
CARRIER: ${shipment.carrier || '—'}
B/L: ${shipment.bl || '—'}
ETD: ${formatDate(shipment.etd)}
ETA: ${formatDate(shipment.eta)}
INCOTERMS: ${shipment.incoterm}
CURRENCY: ${shipment.currency} @ ${num(shipment.fxRate).toFixed(4)}

CARGO LINES
${lines}

TOTALS
Goods value: ${money(totals.goodsValue, shipment.currency)}
Freight: ${money(totals.freight, shipment.currency)}
Insurance: ${money(totals.insurance, shipment.currency)}
Entered value: ${money(totals.customsValue, shipment.currency)}
Duty: ${money(totals.duty, shipment.currency)}
${totals.usPort ? `MPF: ${money(totals.mpf, shipment.currency)}\nHMF: ${money(totals.hmf, shipment.currency)}\n` : ''}${totals.vat > 0 ? `Import VAT: ${money(totals.vat, shipment.currency)}\n` : ''}TOTAL: ${money(totals.total, shipment.currency)}
USD equivalent: ${money(totals.totalUSD, 'USD')}
De minimis threshold: ${money(totals.deMinimisThreshold, 'USD')}${totals.deMinimis ? ' — review eligibility' : ''}

DOCUMENTS
${(shipment.documents || []).map((d) => `- ${d.type}: ${d.received ? 'received' : 'MISSING'}${d.verified ? ' / verified' : ''}${d.reference ? ` (${d.reference})` : ''}`).join('\n') || 'None'}

NOTES
${shipment.notes || 'No additional desk notes.'}

Prepared by: ${currentUser.name}
Reviewed / approved: ____________________

Operational estimate only. Verify classification, valuation, and current rates before filing.`;
  }

  function entryLineCsv(shipment) {
    const totals = computeEntry(shipment);
    const rows = [
      ['Job', 'Client', 'Entry no.', 'Status', 'Line', 'Description', 'HS code', 'Origin', 'Qty', 'Unit value', 'Line customs value', 'Duty %', 'Duty', 'VAT %', 'VAT', 'Currency', 'FX to USD']
    ];
    totals.lineTotals.forEach((l, i) => rows.push([
      shipment.ref, clientName(shipment.clientId), shipment.entryNo || '', STATUSES[shipment.status].label,
      i + 1, l.description, l.hsCode, l.origin, l.qty, l.unitPrice, l.lineCustoms, l.dutyRate, l.lineDuty, l.vatRate, l.lineVat, shipment.currency, shipment.fxRate
    ]));
    rows.push([]);
    rows.push(['Total', '', '', '', '', '', '', '', '', '', totals.customsValue, '', totals.duty, '', totals.vat, shipment.currency, '']);
    rows.push(['MPF', totals.mpf]);
    rows.push(['HMF', totals.hmf]);
    rows.push(['Total duty & fees', totals.total]);
    rows.push(['USD equivalent', totals.totalUSD]);
    return toCSV(rows);
  }

  function downloadEntryTxt() {
    const shipment = getShipment(ui.entryDocId);
    if (!shipment) return;
    downloadFile(`entry-summary-${shipment.ref}.txt`, entrySummaryText(shipment), 'text/plain;charset=utf-8');
  }

  function downloadEntryCsv(shipmentId) {
    const shipment = getShipment(shipmentId);
    if (!shipment) return;
    downloadFile(`entry-lines-${shipment.ref}.csv`, entryLineCsv(shipment), 'text/csv;charset=utf-8');
  }

  /* ------------------------------------------------------------------ *
   *  CSV exports
   * ------------------------------------------------------------------ */

  function exportShipmentsCSV() {
    const list = filteredShipments();
    const rows = [[
      'Reference', 'Client', 'Status', 'Priority', 'Origin', 'Port', 'Mode', 'Incoterm', 'Carrier', 'B/L', 'ETD', 'ETA',
      'Currency', 'FX to USD', 'Goods value', 'Freight', 'Insurance', 'Entered value', 'Duty', 'MPF', 'HMF', 'VAT', 'Total', 'Total USD', 'Required docs', 'Docs received', 'Entry no.'
    ]];
    list.forEach((s) => {
      const t = computeEntry(s);
      const p = docsProgress(s);
      rows.push([
        s.ref, clientName(s.clientId), STATUSES[s.status].label, s.priority, s.origin, s.port, s.mode, s.incoterm, s.carrier,
        s.bl, s.etd, s.eta, s.currency, s.fxRate, t.goodsValue, t.freight, t.insurance, t.customsValue, t.duty, t.mpf, t.hmf,
        t.vat, t.total, t.totalUSD, p.total, p.received, s.entryNo || ''
      ]);
    });
    downloadFile(`clearway-shipments-${isoDaysFromNow(0)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showToast(`${list.length} shipments exported.`);
  }

  function exportEntryQueueCSV() {
    const rows = [['Reference', 'Client', 'Status', 'ETA', 'Docs received', 'Docs required', 'Duty USD', 'Entry no.']];
    entryQueueShipments().forEach((s) => {
      const p = docsProgress(s);
      rows.push([s.ref, clientName(s.clientId), STATUSES[s.status].label, s.eta, p.received, p.total, computeEntry(s).totalUSD, s.entryNo || '']);
    });
    downloadFile(`clearway-entry-queue-${isoDaysFromNow(0)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showToast('Entry queue exported.');
  }

  function exportMissingDocsCSV() {
    const rows = [['Job', 'Client', 'Document', 'Required', 'Reference', 'Note', 'ETA', 'Status']];
    allDocRows().filter((r) => r.doc.required && !r.doc.received).forEach((r) => {
      rows.push([r.shipment.ref, clientName(r.shipment.clientId), r.doc.type, 'Yes', r.doc.reference || '', r.doc.note || '', r.shipment.eta, STATUSES[r.shipment.status].label]);
    });
    downloadFile(`clearway-missing-docs-${isoDaysFromNow(0)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showToast('Missing document report exported.');
  }

  function exportReportCSV() {
    const report = reportData();
    if (!report) return;
    const rows = [['Job', 'Client', 'Status', 'Origin', 'Port', 'Currency', 'Entered value', 'Duty', 'MPF', 'HMF', 'VAT', 'Total', 'Total USD', 'Entry no.']];
    report.rows.forEach((r) => rows.push([
      r.shipment.ref, r.client?.name || 'Unassigned', STATUSES[r.shipment.status].label, r.shipment.origin, r.shipment.port,
      r.shipment.currency, r.totals.customsValue, r.totals.duty, r.totals.mpf, r.totals.hmf, r.totals.vat, r.totals.total,
      r.totals.totalUSD, r.shipment.entryNo || ''
    ]));
    downloadFile(`clearway-duty-ledger-${isoDaysFromNow(0)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showToast('Duty ledger exported.');
  }

  function exportDashboardCSV() {
    const active = currentWorkspace().shipments.filter(isActive).sort((a, b) => String(a.eta).localeCompare(String(b.eta)));
    const rows = [['Ref', 'Client', 'Status', 'ETA', 'Docs', 'Duty USD']];
    active.forEach((s) => {
      const p = docsProgress(s);
      rows.push([s.ref, clientName(s.clientId), STATUSES[s.status].label, s.eta, `${p.received}/${p.total}`, computeEntry(s).totalUSD]);
    });
    downloadFile(`clearway-desk-snapshot-${isoDaysFromNow(0)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showToast('Desk snapshot exported.');
  }

  /* ------------------------------------------------------------------ *
   *  Workspace import / export / reset
   * ------------------------------------------------------------------ */

  function exportWorkspace() {
    const ws = currentWorkspace();
    const payload = {
      schema: 'clearway-workspace',
      version: 1,
      exportedAt: nowISO(),
      settings: ws.settings,
      counters: ws.counters,
      clients: ws.clients,
      shipments: ws.shipments
    };
    downloadFile(`clearway-workspace-${isoDaysFromNow(0)}.json`, JSON.stringify(payload, null, 2), 'application/json');
    showToast('Workspace exported.');
  }

  function handleImportFile(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('That file is too large to import.', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        const candidate = data && data.workspace ? data.workspace : data;
        if (!candidate || !Array.isArray(candidate.clients) || !Array.isArray(candidate.shipments)) throw new Error('bad shape');
        ui.pendingImport = candidate;
        const firstClient = candidate.clients[0] || {};
        openModal({
          title: 'Import workspace',
          subtitle: 'This replaces the clients, jobs, settings, and counters in the current workspace.',
          body: `<p class="small">Found <strong>${candidate.clients.length}</strong> clients and <strong>${candidate.shipments.length}</strong> job files${firstClient.name ? `, starting with ${esc(firstClient.name)}` : ''}. Your user account and password are not changed.</p><p class="hint" style="margin-top:8px">This action cannot be undone. Export the current workspace first if needed.</p>`,
          footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-primary" data-action="confirm-import">${icon('upload')} Replace workspace</button>`
        });
      } catch (err) {
        showToast('That JSON file is not a valid Clearway workspace export.', 'warn');
      }
    };
    reader.onerror = () => showToast('The file could not be read.', 'warn');
    reader.readAsText(file);
  }

  function applyImport(candidate) {
    if (!candidate) return;
    const ws = currentWorkspace();
    ws.clients = candidate.clients.map((c) => ({ ...c, id: c.id || uid('cl'), createdAt: c.createdAt || nowISO() }));
    ws.shipments = candidate.shipments.map((s) => ({ ...s, id: s.id || uid('sh'), history: s.history || [], documents: s.documents || [], lineItems: s.lineItems || [] }));
    if (candidate.settings && typeof candidate.settings === 'object') ws.settings = { ...ws.settings, ...candidate.settings, theme: getTheme() };
    if (candidate.counters && typeof candidate.counters === 'object') ws.counters = { ...ws.counters, ...candidate.counters };
    persist();
    closeModal();
    render();
    showToast('Workspace imported.', 'success');
  }

  function openResetDemo() {
    openModal({
      title: 'Restore demo data?',
      subtitle: 'Replace this workspace with the seeded 14-job demo desk.',
      body: `<p class="small">Your current clients and jobs in this workspace will be replaced. Your account and password stay the same.</p>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm-reset-demo">${icon('alert')} Restore demo</button>`
    });
  }

  function resetDemo() {
    if (!currentUser) return;
    db.workspaces[currentUser.id] = buildWorkspace('full', currentUser.name, currentUser.company);
    persist();
    closeModal();
    render();
    showToast('Demo workspace restored.', 'success');
  }

  function openClearWorkspace() {
    openModal({
      title: 'Clear this workspace?',
      subtitle: 'Remove every client and job file from this workspace.',
      body: `<p class="small">The firm settings and your account remain. This cannot be undone.</p>`,
      footer: `<button type="button" class="btn" data-action="close-modal">Cancel</button><button type="button" class="btn btn-danger" data-action="confirm-clear-workspace">${icon('trash')} Clear workspace</button>`
    });
  }

  function clearWorkspace() {
    if (!currentUser) return;
    const ws = currentWorkspace();
    ws.clients = [];
    ws.shipments = [];
    ws.counters = { ref: 156, entry: 160 };
    persist();
    closeModal();
    render();
    showToast('Workspace cleared.');
  }

  /* ------------------------------------------------------------------ *
   *  Settings and account forms
   * ------------------------------------------------------------------ */

  function saveSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    const errors = [];
    if (!String(data.firmName || '').trim()) errors.push('Firm name is required.');
    if (!String(data.preparer || '').trim()) errors.push('Preparer is required.');
    const deMinimis = num(data.deMinimis);
    const defaultVat = num(data.defaultVat);
    const mpfRate = num(data.mpfRate);
    const mpfMin = num(data.mpfMin);
    const mpfMax = num(data.mpfMax);
    const hmfRate = num(data.hmfRate);
    if (deMinimis < 0) errors.push('De minimis threshold cannot be negative.');
    if (defaultVat < 0 || defaultVat > 100) errors.push('Default VAT must be 0–100%.');
    if (mpfRate < 0 || mpfRate > 1) errors.push('MPF rate must be 0–1.');
    if (mpfMin < 0 || mpfMax < 0) errors.push('MPF minimum and maximum cannot be negative.');
    if (mpfMin > mpfMax) errors.push('MPF minimum cannot exceed maximum.');
    if (hmfRate < 0 || hmfRate > 1) errors.push('HMF rate must be 0–1.');
    if (errors.length) {
      showToast(errors[0], 'warn');
      return;
    }
    const ws = currentWorkspace();
    ws.settings = {
      ...ws.settings,
      firmName: String(data.firmName).trim(),
      preparer: String(data.preparer).trim(),
      licenseNo: String(data.licenseNo || '').trim(),
      address: String(data.address || '').trim(),
      deMinimis,
      defaultVat,
      mpfRate,
      mpfMin,
      mpfMax,
      hmfRate
    };
    persist();
    applyTheme();
    render();
    showToast('Settings saved.', 'success');
  }

  function changePasswordForm() {
    const form = document.getElementById('password-form');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    if (!verifyPassword(data.current || '', currentUser)) {
      showToast('Current password is incorrect.', 'warn');
      return;
    }
    if (!data.new || String(data.new).length < 8) {
      showToast('New password must be at least 8 characters.', 'warn');
      return;
    }
    if (data.new !== data.confirm) {
      showToast('New passwords do not match.', 'warn');
      return;
    }
    const salt = makeSalt();
    currentUser.salt = salt;
    currentUser.passwordHash = hashPassword(String(data.new), salt);
    persist();
    form.reset();
    showToast('Password changed.', 'success');
  }

  /* ------------------------------------------------------------------ *
   *  Action router
   * ------------------------------------------------------------------ */

  function handleAction(action, el) {
    const id = el?.dataset?.id || '';
    const shipmentId = el?.dataset?.shipment || '';
    const docId = el?.dataset?.doc || '';
    switch (action) {
      case 'close-modal': closeModal(); break;
      case 'auth-tab': ui.authMode = el.dataset.mode; renderAuth(); break;
      case 'demo-login': {
        const demo = db.users.find((u) => u.email === 'ops@clearway.co') || db.users[0];
        if (demo) loginUser(demo);
        break;
      }
      case 'toggle-password': {
        const input = document.getElementById('auth-password');
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
        break;
      }
      case 'open-command': openCommand(); break;
      case 'close-command': closeCommand(); break;
      case 'run-command': {
        runCommand({
          kind: el.dataset.commandKind,
          id: el.dataset.commandId,
          action: el.dataset.commandAction
        });
        break;
      }
      case 'new-shipment': openShipmentModal(); break;
      case 'edit-shipment': openShipmentModal(id); break;
      case 'open-shipment': location.hash = `#/shipments/${id}`; break;
      case 'delete-shipment': openConfirmDeleteShipment(id); break;
      case 'confirm-delete-shipment': confirmDeleteShipment(id); break;
      case 'new-client': openClientModal(); break;
      case 'edit-client': openClientModal(id); break;
      case 'view-client': openClientDetail(id); break;
      case 'delete-client': openConfirmDeleteClient(id); break;
      case 'confirm-delete-client': confirmDeleteClient(id); break;
      case 'clear-shipment-filters':
        ui.shipFilters = { search: '', status: 'all', client: 'all', mode: 'all', atRisk: false, sort: 'eta' };
        render();
        break;
      case 'clear-doc-filters':
        ui.docFilters = { search: '', status: 'all', type: 'all', client: 'all' };
        render();
        break;
      case 'clear-client-filters':
        ui.clientFilters = { search: '', status: 'all' };
        render();
        break;
      case 'export-shipments': exportShipmentsCSV(); break;
      case 'export-entry-queue': exportEntryQueueCSV(); break;
      case 'export-missing-docs': exportMissingDocsCSV(); break;
      case 'export-report': exportReportCSV(); break;
      case 'export-dashboard': exportDashboardCSV(); break;
      case 'export-entry-csv': downloadEntryCsv(id); break;
      case 'select-entry': ui.entrySelected = id; render(); break;
      case 'open-status': openStatusModal(id); break;
      case 'open-entry-summary': openEntrySummary(id); break;
      case 'add-doc': if (id) openDocModal(id); else openGlobalAddDoc(); break;
      case 'edit-doc': openDocModal(shipmentId, docId); break;
      case 'delete-doc': openDeleteDoc(shipmentId, docId); break;
      case 'confirm-delete-doc': confirmDeleteDoc(shipmentId, docId); break;
      case 'toggle-doc-received': toggleDocReceived(shipmentId, docId); break;
      case 'toggle-doc-verified': toggleDocVerified(shipmentId, docId); break;
      case 'add-line': {
        collectShipmentForm();
        ui.shipDraft.lineItems.push(emptyLine());
        openShipmentModal(ui.shipEditId, ui.shipDraft, ui.shipErrors);
        break;
      }
      case 'remove-line': {
        collectShipmentForm();
        const index = num(el.dataset.index);
        if (ui.shipDraft.lineItems.length > 1) ui.shipDraft.lineItems.splice(index, 1);
        openShipmentModal(ui.shipEditId, ui.shipDraft, ui.shipErrors);
        break;
      }
      case 'add-doc-row': {
        collectShipmentForm();
        const type = document.getElementById('new-doc-type')?.value || 'Other';
        ui.shipDraft.documents.push({
          id: uid('doc'), type, required: false, received: false, verified: false, reference: '', note: '', updatedAt: nowISO()
        });
        openShipmentModal(ui.shipEditId, ui.shipDraft, ui.shipErrors);
        break;
      }
      case 'remove-doc-row': {
        collectShipmentForm();
        ui.shipDraft.documents = ui.shipDraft.documents.filter((d) => d.id !== docId);
        openShipmentModal(ui.shipEditId, ui.shipDraft, ui.shipErrors);
        break;
      }
      case 'toggle-theme': setTheme(getTheme() === 'dark' ? 'light' : 'dark'); break;
      case 'set-theme': setTheme(el.dataset.themeValue || 'light'); break;
      case 'export-workspace': exportWorkspace(); break;
      case 'import-workspace': document.getElementById('import-file')?.click(); break;
      case 'confirm-import': applyImport(ui.pendingImport); ui.pendingImport = null; break;
      case 'reset-demo': openResetDemo(); break;
      case 'confirm-reset-demo': resetDemo(); break;
      case 'clear-workspace': openClearWorkspace(); break;
      case 'confirm-clear-workspace': clearWorkspace(); break;
      case 'download-entry-txt': downloadEntryTxt(); break;
      case 'download-entry-csv': downloadEntryCsv(ui.entryDocId); break;
      case 'print-entry': window.print(); break;
      case 'sign-out': signOut(); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------------ *
   *  Event wiring
   * ------------------------------------------------------------------ */

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      event.preventDefault();
      handleAction(actionEl.dataset.action, actionEl);
      return;
    }
    if (event.target.matches('[data-modal-backdrop]')) closeModal();
    if (event.target.matches('[data-command-backdrop]')) closeCommand();
  });

  document.addEventListener('keydown', (event) => {
    if (ui.commandOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCommand();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        ui.commandIndex = clamp(ui.commandIndex + 1, 0, Math.max(0, ui.commandItems.length - 1));
        renderCommandResults();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        ui.commandIndex = clamp(ui.commandIndex - 1, 0, Math.max(0, ui.commandItems.length - 1));
        renderCommandResults();
        return;
      }
      if (event.key === 'Enter') {
        const item = ui.commandItems[ui.commandIndex];
        if (item) {
          event.preventDefault();
          runCommand(item);
        }
        return;
      }
    }

    if (event.key === 'Escape' && ui.modal) {
      closeModal();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommand();
      return;
    }

    const typing = event.target instanceof HTMLElement && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable
    );
    if (typing) return;

    if (event.key === '/') {
      event.preventDefault();
      openCommand();
    } else if (event.key.toLowerCase() === 'n' && !ui.modal && currentUser) {
      event.preventDefault();
      openShipmentModal();
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.matches('tr[data-action="open-shipment"]')) {
      event.preventDefault();
      location.hash = `#/shipments/${event.target.dataset.id}`;
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'shipment-search') {
      ui.shipFilters.search = target.value;
      updateShipmentResults();
    } else if (target.id === 'doc-search') {
      ui.docFilters.search = target.value;
      updateDocResults();
    } else if (target.id === 'client-search') {
      ui.clientFilters.search = target.value;
      updateClientResults();
    } else if (target.id === 'command-input') {
      ui.commandQuery = target.value;
      ui.commandIndex = 0;
      renderCommandResults();
    } else if (target.closest('#shipment-form')) {
      collectShipmentForm();
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'shipment-status') { ui.shipFilters.status = target.value; updateShipmentResults(); }
    else if (target.id === 'shipment-client') { ui.shipFilters.client = target.value; updateShipmentResults(); }
    else if (target.id === 'shipment-mode') { ui.shipFilters.mode = target.value; updateShipmentResults(); }
    else if (target.id === 'shipment-sort') { ui.shipFilters.sort = target.value; updateShipmentResults(); }
    else if (target.id === 'shipment-at-risk') { ui.shipFilters.atRisk = target.checked; updateShipmentResults(); }
    else if (target.id === 'doc-status') { ui.docFilters.status = target.value; updateDocResults(); }
    else if (target.id === 'doc-type') { ui.docFilters.type = target.value; updateDocResults(); }
    else if (target.id === 'doc-client') { ui.docFilters.client = target.value; updateDocResults(); }
    else if (target.id === 'client-status') { ui.clientFilters.status = target.value; updateClientResults(); }
    else if (target.id === 'import-file') {
      const file = target.files && target.files[0];
      target.value = '';
      if (file) handleImportFile(file);
    }
    if (target.closest('#shipment-form')) collectShipmentForm();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    switch (form.id) {
      case 'auth-form': {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const email = String(data.email || '').trim().toLowerCase();
        if (ui.authMode === 'signup') {
          const name = String(data.name || '').trim();
          const company = String(data.company || '').trim();
          const password = String(data.password || '');
          const confirm = String(data.confirm || '');
          if (!name) { showAuthError('Enter your full name.'); return; }
          if (!company) { showAuthError('Enter your firm name.'); return; }
          if (!email) { showAuthError('Enter a work email.'); return; }
          if (db.users.some((u) => u.email.toLowerCase() === email)) { showAuthError('An account with that email already exists in this browser.'); return; }
          if (password.length < 8) { showAuthError('Password must be at least 8 characters.'); return; }
          if (password !== confirm) { showAuthError('Passwords do not match.'); return; }
          const salt = makeSalt();
          const user = {
            id: uid('usr'), name, company, email, role: 'Operations',
            salt, passwordHash: hashPassword(password, salt), createdAt: nowISO()
          };
          db.users.push(user);
          db.workspaces[user.id] = buildWorkspace('starter', user.name, user.company);
          persist();
          loginUser(user);
          showToast('Workspace created with sample data.');
        } else {
          const password = String(data.password || '');
          const user = db.users.find((u) => u.email.toLowerCase() === email);
          if (!user || !verifyPassword(password, user)) { showAuthError('Those credentials do not match an account in this browser.'); return; }
          loginUser(user);
        }
        break;
      }
      case 'client-form': saveClientForm(); break;
      case 'shipment-form': saveShipmentForm(); break;
      case 'add-doc-form': {
        event.preventDefault();
        const shipmentId = String(new FormData(form).get('shipmentId') || '');
        if (shipmentId) openDocModal(shipmentId);
        break;
      }
      case 'doc-form': saveDocForm(); break;
      case 'status-form': {
        event.preventDefault();
        const formEl = event.target;
        const shipmentId = formEl.dataset.id;
        const data = Object.fromEntries(new FormData(formEl));
        const result = changeStatus(shipmentId, data.target, data.note);
        if (!result.ok) {
          const box = document.getElementById('status-error');
          if (box) {
            box.hidden = false;
            box.innerHTML = esc(result.error);
          }
        }
        break;
      }
      case 'note-form': {
        event.preventDefault();
        const shipmentId = form.dataset.shipment;
        const shipment = getShipment(shipmentId);
        const note = String(new FormData(form).get('note') || '').trim();
        if (!shipment || !note) return;
        addHistory(shipment, 'note', note);
        shipment.updatedAt = nowISO();
        persist();
        render();
        showToast('Note added.');
        break;
      }
      case 'settings-form': saveSettingsForm(); break;
      case 'password-form': changePasswordForm(); break;
      default: break;
    }
  });

  /* ------------------------------------------------------------------ *
   *  Boot
   * ------------------------------------------------------------------ */

  function init() {
    loadState();
    if (!location.hash) {
      try { history.replaceState(null, '', '#/dashboard'); } catch (_) { location.hash = '#/dashboard'; }
    }
    render();
    if (!storageOk) {
      window.setTimeout(() => showToast('Local storage is unavailable. The app will run in memory for this session.', 'warn'), 300);
    }
  }

  window.addEventListener('hashchange', () => {
    if (!ui.modal && !ui.commandOpen) render();
  });

  init();
})();