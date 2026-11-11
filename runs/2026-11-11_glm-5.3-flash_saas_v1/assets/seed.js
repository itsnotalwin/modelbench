/* ============================================================
   ClearDesk — demo/seed data. Built relative to the current date
   so KPIs, aging and permit warnings look alive on first launch.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.CDSeed = factory(root.CDCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  function isoDaysAgo(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
  function tsDaysAgo(days, hour) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour != null ? hour : 9, (days * 7) % 50 + 5, 0, 0);
    return d.toISOString();
  }

  function buildSeed() {
    var org = {
      name: 'Atlas Freight Clearing Ltd', short: 'Atlas Freight', country: 'Kenya', port: 'Mombasa',
      currency: 'USD', vatRate: 16, feePercent: 2,
      address: 'Berth 4 Road, Port Reitz, Mombasa', email: 'ops@atlasfreight.app',
      phone: '+254 41 655 0100', licenseNo: 'CBA/2024/0891'
    };

    var saltC = C.uid('s'), saltJ = C.uid('s');
    var users = [
      { id: 'u_clara', name: 'Clara Otien', email: 'clara.otien@atlasfreight.app', role: 'manager',
        salt: saltC, passHash: C.hashPassword('demo1234', saltC), createdAt: isoDaysAgo(320) },
      { id: 'u_james', name: 'James Mwangi', email: 'james.mwangi@atlasfreight.app', role: 'clerk',
        salt: saltJ, passHash: C.hashPassword('demo1234', saltJ), createdAt: isoDaysAgo(210) }
    ];

    var tariff = [
      { code: '1006.30.00', description: 'Rice, semi-milled or wholly milled', dutyRate: 35, exciseRate: 0,  vatExempt: false },
      { code: '0902.30.00', description: 'Black tea, fermented, packaged', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '1511.90.10', description: 'Refined palm oil for food use', dutyRate: 10, exciseRate: 0,  vatExempt: false },
      { code: '2202.99.00', description: 'Non-alcoholic beverages, nesoi', dutyRate: 25, exciseRate: 5,  vatExempt: false },
      { code: '2402.20.00', description: 'Cigarettes containing tobacco', dutyRate: 35, exciseRate: 25, vatExempt: false },
      { code: '3004.90.00', description: 'Medicaments, put up in measured doses, nesoi', dutyRate: 0, exciseRate: 0, vatExempt: true },
      { code: '3105.10.00', description: 'Goods in tablets/similar forms for agriculture', dutyRate: 10, exciseRate: 0, vatExempt: false },
      { code: '3926.90.99', description: 'Articles of plastics, nesoi', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '4011.10.00', description: 'New pneumatic tyres, of rubber, motor cars', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '6109.10.00', description: 'T-shirts, singlets, knitted, of cotton', dutyRate: 35, exciseRate: 0,  vatExempt: false },
      { code: '6403.99.00', description: 'Footwear with uppers of leather, nesoi', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '7323.93.00', description: 'Table/kitchen articles, stainless steel', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '8309.90.00', description: 'Stoppers, lids and closures, of iron or steel', dutyRate: 10, exciseRate: 0,  vatExempt: false },
      { code: '8413.70.00', description: 'Centrifugal pumps, nesoi', dutyRate: 0, exciseRate: 0,  vatExempt: false },
      { code: '8471.30.00', description: 'Portable automatic data-processing machines', dutyRate: 0, exciseRate: 0,  vatExempt: false },
      { code: '8507.60.00', description: 'Lithium-ion accumulators', dutyRate: 10, exciseRate: 0,  vatExempt: false },
      { code: '8517.13.00', description: 'Smartphones', dutyRate: 0, exciseRate: 10, vatExempt: false },
      { code: '8544.42.00', description: 'Insulated electric conductors fitted with connectors', dutyRate: 10, exciseRate: 0,  vatExempt: false },
      { code: '8703.23.00', description: 'Motor cars, spark-ignition, 1500–3000 cc', dutyRate: 25, exciseRate: 20, vatExempt: false },
      { code: '8704.21.00', description: 'Motor vehicles for goods, diesel, ≤ 5 t', dutyRate: 25, exciseRate: 10, vatExempt: false },
      { code: '8708.99.00', description: 'Parts and accessories of motor vehicles, nesoi', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '8711.20.00', description: 'Motorcycles, 50–250 cc', dutyRate: 35, exciseRate: 0,  vatExempt: false },
      { code: '9018.39.00', description: 'Catheters, cannulae and the like', dutyRate: 0, exciseRate: 0,  vatExempt: true },
      { code: '9403.60.00', description: 'Wooden furniture, nesoi', dutyRate: 35, exciseRate: 0,  vatExempt: false },
      { code: '9405.40.00', description: 'Electric table/desk/floor lamps', dutyRate: 25, exciseRate: 0,  vatExempt: false },
      { code: '4821.10.00', description: 'Printed paper labels and transferences', dutyRate: 10, exciseRate: 0,  vatExempt: false }
    ];

    var clients = [
      { id: 'c_kilifi',  code: 'CL-01', name: 'Kilifi Foods Ltd',           taxId: 'P051234567X', country: 'Kenya',        email: 'imports@kilififoods.co.ke',      phone: '+254 720 100 200', terms: 'credit30', permitType: 'Food Import Permit',        permitExpiry: isoDaysAgo(-20),  notes: 'Cold-chain and dry foodstuff importer. Prefers combined weekly statements.', createdAt: isoDaysAgo(400) },
      { id: 'c_motors',  code: 'CL-02', name: 'Nairobi Motors Imports',     taxId: 'P051987654Z', country: 'Kenya',        email: 'ops@nairobimotors.co.ke',        phone: '+254 733 220 110', terms: 'credit15', permitType: 'Dealer Trading Licence',    permitExpiry: isoDaysAgo(-9),   notes: 'Used vehicles from Japan/UAE. Duty-sensitive; always verify excise band by cc.', createdAt: isoDaysAgo(380) },
      { id: 'c_meds',    code: 'CL-03', name: 'MedSupply East Africa',      taxId: 'P052000111A', country: 'Kenya',        email: 'procurement@medsupply.or.ke',    phone: '+254 710 465 002', terms: 'credit30', permitType: 'Pharmacy & Poisons Board Permit', permitExpiry: isoDaysAgo(12), notes: 'Medical consumables; most lines VAT-exempt under the health schedule.', createdAt: isoDaysAgo(330) },
      { id: 'c_prime',   code: 'CL-04', name: 'Prime Electronics Traders',  taxId: 'P052222333B', country: 'Kenya',        email: 'imports@primeelectronics.ke',    phone: '+254 722 908 771', terms: 'prepaid',  permitType: 'KEBS Import Standard Mark', permitExpiry: isoDaysAgo(-150), notes: 'Prepaid disbursements only — never advance duties without confirmation.', createdAt: isoDaysAgo(300) },
      { id: 'c_bev',     code: 'CL-05', name: 'Coastal Beverages Ltd',      taxId: 'P052444555C', country: 'Kenya',        email: 'logistics@coastalbev.co.ke',     phone: '+254 741 335 808', terms: 'credit45', permitType: 'Excise Licence (Manufacturer)', permitExpiry: isoDaysAgo(-45), notes: 'Excise-sensitive inputs. Reconcile excise stamps on every consignment.', createdAt: isoDaysAgo(500) },
      { id: 'c_lakes',   code: 'CL-06', name: 'Lakeside Furnishers',        taxId: 'P052666777D', country: 'Uganda',       email: 'buy@lakesidefurnish.ug',         phone: '+256 772 044 510', terms: 'credit30', permitType: '', permitExpiry: '', notes: 'Furniture via Mombasa northern corridor.', createdAt: isoDaysAgo(260) },
      { id: 'c_agri',    code: 'CL-07', name: 'AgriTech Inputs Ltd',        taxId: 'P052888999E', country: 'Kenya',        email: 'supply@agritechinputs.ke',       phone: '+254 705 611 340', terms: 'credit30', permitType: 'Fertilizer Import Permit', permitExpiry: isoDaysAgo(-75), notes: 'Seasonal peaks: Feb–Mar and Aug–Sep.', createdAt: isoDaysAgo(240) },
      { id: 'c_textile', code: 'CL-08', name: 'Textile House EA',           taxId: 'P053111222F', country: 'Tanzania',     email: 'trade@textilehouse.co.tz',       phone: '+255 754 220 090', terms: 'prepaid',  permitType: '', permitExpiry: '', notes: 'Road freight via Namanga. Cash on document handover.', createdAt: isoDaysAgo(150) }
    ];

    var CLARA = 'Clara Otien', JAMES = 'James Mwangi';
    var entries = [];
    var payments = [];

    function line(hs, desc, packages, pkgUnit, weight, qty, unitPrice) {
      return { id: C.uid('l'), hsCode: hs, desc: desc, packages: packages, pkgUnit: pkgUnit, weight: weight, qty: qty, unitPrice: unitPrice };
    }
    function tl(daysAgo, who, action, text) { return { ts: tsDaysAgo(daysAgo, 9), who: who, action: action, text: text }; }
    function docsSet(entry, marks) {
      entry.docs.forEach(function (d) {
        var m = marks.filter(function (x) { return x[0] === d.key; })[0];
        if (m) { d.received = true; d.ref = m[1] || ''; }
      });
      return entry;
    }
    function addEntry(e) { entries.push(e); return e; }

    /* ---- AE/2026/0101 — rice, closed, fully paid ---- */
    var e1 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0101', clientId: 'c_kilifi', mode: 'sea', transportRef: 'MAEU8812340', incoterm: 'FOB',
      originCountry: 'Thailand', arrivalDate: isoDaysAgo(84), currency: 'USD', fxRate: 1, freight: 4200, insurance: 350,
      charges: { port: 640, handling: 380, transport: 520, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('1006.30.00', 'Long-grain white rice, 25 kg woven bags', 800, 'bags', 20000, 800, 28.5)],
      status: 'closed', notes: 'Annual Q1 rice programme, vessel MSC AMBITION. Clean release, no queries.',
      createdAt: tsDaysAgo(88), updatedAt: tsDaysAgo(40, 15), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(83), assessedDate: isoDaysAgo(72), paidDate: isoDaysAgo(63), releasedDate: isoDaysAgo(60), deliveredDate: isoDaysAgo(55), closedDate: isoDaysAgo(40),
      timeline: [
        tl(88, CLARA, 'create', 'Entry created'),
        tl(86, JAMES, 'docs', 'All required documents received'),
        tl(83, CLARA, 'status', 'Status: New → Lodged'),
        tl(72, CLARA, 'status', 'Status: Lodged → Assessed'),
        tl(63, CLARA, 'status', 'Status: Assessed → Duty paid'),
        tl(60, JAMES, 'status', 'Status: Duty paid → Released'),
        tl(55, JAMES, 'status', 'Status: Released → Delivered'),
        tl(40, CLARA, 'status', 'Status: Delivered → Closed')
      ]
    });
    ensure(e1);
    docsSet(e1, [['bl', 'MAEU8812340'], ['invoice', 'KFI/TH/2026-014'], ['packing', 'PL-8812340'], ['origin', 'COO-TH-9921'], ['insurance', 'JW-INS-4410']]);

    /* ---- AE/2026/0102 — electronics air, delivered, partially paid ---- */
    var e2 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0102', clientId: 'c_prime', mode: 'air', transportRef: '176-88237755', incoterm: 'CIF',
      originCountry: 'China', arrivalDate: isoDaysAgo(66), currency: 'EUR', fxRate: 1.08, freight: 1800, insurance: 120,
      charges: { port: 210, handling: 180, transport: 260, other: 45 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [
        line('8517.13.00', 'Smartphones, 5G, assorted models', 40, 'cartons', 460, 200, 210),
        line('3926.90.99', 'Phone cases and screen protectors', 30, 'cartons', 210, 2000, 1.4)
      ],
      status: 'delivered', notes: 'Prepaid client. Balance includes agency fee only — chase on next order.',
      createdAt: tsDaysAgo(70), updatedAt: tsDaysAgo(20, 11), createdBy: 'u_james',
      lodgedDate: isoDaysAgo(64), assessedDate: isoDaysAgo(48), releasedDate: isoDaysAgo(26), deliveredDate: isoDaysAgo(20),
      timeline: [
        tl(70, JAMES, 'create', 'Entry created'),
        tl(64, JAMES, 'status', 'Status: Ready to lodge → Lodged'),
        tl(48, CLARA, 'status', 'Status: Lodged → Assessed'),
        tl(26, CLARA, 'status', 'Status: Duty paid → Released'),
        tl(20, JAMES, 'status', 'Status: Released → Delivered'),
        tl(25, CLARA, 'pay', 'Part payment received — balance carried')
      ]
    });
    ensure(e2);
    docsSet(e2, [['awb', '176-88237755'], ['invoice', 'PE/CN/26-0417'], ['packing', 'PL-0417'], ['permit', 'KEBS-ISM-2026-118']]);

    /* ---- AE/2026/0103 — two cars + parts, released, fully paid ---- */
    var e3 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0103', clientId: 'c_motors', mode: 'sea', transportRef: 'ONEY5501987', incoterm: 'FOB',
      originCountry: 'Japan', arrivalDate: isoDaysAgo(46), currency: 'USD', fxRate: 1, freight: 6800, insurance: 900,
      charges: { port: 1100, handling: 760, transport: 890, other: 250 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [
        line('8703.23.00', 'Used motor cars 1800 cc, Toyota Harrier ×2', 2, 'units', 3200, 2, 14500),
        line('8708.99.00', 'Assorted spare parts and filters', 12, 'cartons', 1900, 47, 50)
      ],
      status: 'released', notes: 'Excise band confirmed at 20% for 1800 cc. KEBS inspection passed at gate.',
      createdAt: tsDaysAgo(50), updatedAt: tsDaysAgo(10, 16), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(45), assessedDate: isoDaysAgo(36), paidDate: isoDaysAgo(18), releasedDate: isoDaysAgo(10),
      timeline: [
        tl(50, CLARA, 'create', 'Entry created'),
        tl(45, CLARA, 'status', 'Status: Ready to lodge → Lodged'),
        tl(36, CLARA, 'status', 'Status: Lodged → Assessed'),
        tl(18, CLARA, 'status', 'Status: Assessed → Duty paid'),
        tl(10, JAMES, 'status', 'Status: Duty paid → Released')
      ]
    });
    ensure(e3);
    docsSet(e3, [['bl', 'ONEY5501987'], ['invoice', 'NMI/JP/26-2231'], ['packing', 'PL-2231'], ['origin', 'JEVIC-88213']]);

    /* ---- AE/2026/0104 — beverage concentrate, assessed, unpaid ---- */
    var e4 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0104', clientId: 'c_bev', mode: 'sea', transportRef: 'HLXU2204551', incoterm: 'CIF',
      originCountry: 'South Africa', arrivalDate: isoDaysAgo(9), currency: 'USD', fxRate: 1, freight: 3100, insurance: 200,
      charges: { port: 610, handling: 420, transport: 480, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('2202.99.00', 'Beverage concentrate, tanks', 24, 'tanks', 19200, 1200, 22)],
      status: 'assessed', notes: 'Excise stamps to be verified before release. Payment due on 45-day terms.',
      createdAt: tsDaysAgo(14), updatedAt: tsDaysAgo(5, 10), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(11), assessedDate: isoDaysAgo(5),
      timeline: [
        tl(14, CLARA, 'create', 'Entry created'),
        tl(11, CLARA, 'status', 'Status: Ready to lodge → Lodged'),
        tl(5, CLARA, 'status', 'Status: Lodged → Assessed')
      ]
    });
    ensure(e4);
    docsSet(e4, [['bl', 'HLXU2204551'], ['invoice', 'CBL-ZA-2026-118'], ['packing', 'PL-118'], ['permit', 'EXC-LIC-2026']]);

    /* ---- AE/2026/0105 — medical consumables, customs query ---- */
    var e5 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0105', clientId: 'c_meds', mode: 'air', transportRef: '618-33451100', incoterm: 'CIF',
      originCountry: 'India', arrivalDate: isoDaysAgo(13), currency: 'USD', fxRate: 1, freight: 950, insurance: 60,
      charges: { port: 140, handling: 110, transport: 190, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('3004.90.00', 'Surgical dressings and IV consumables', 55, 'cartons', 1400, 350, 18)],
      status: 'query', notes: 'Verification officer assigned. Respond to query by ' + isoDaysAgo(-7) + ' or goods move to a bonded warehouse.',
      createdAt: tsDaysAgo(16), updatedAt: tsDaysAgo(8, 14), createdBy: 'u_james',
      lodgedDate: isoDaysAgo(12),
      timeline: [
        tl(16, JAMES, 'create', 'Entry created'),
        tl(12, JAMES, 'status', 'Status: Ready to lodge → Lodged'),
        tl(8, CLARA, 'status', 'Status: Lodged → Customs query'),
        tl(8, CLARA, 'note', 'Query: HS classification verification — officer requested invoice breakdown and PPB permit.')
      ]
    });
    ensure(e5);
    docsSet(e5, [['awb', '618-33451100'], ['invoice', 'MSE/IN/26-7742'], ['packing', 'PL-7742'], ['permit', 'PPB-IMP-2026-339']]);

    /* ---- AE/2026/0106 — furniture, paid ---- */
    var e6 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0106', clientId: 'c_lakes', mode: 'sea', transportRef: 'MSCU7781234', incoterm: 'FOB',
      originCountry: 'China', arrivalDate: isoDaysAgo(7), currency: 'USD', fxRate: 1, freight: 2900, insurance: 180,
      charges: { port: 520, handling: 360, transport: 410, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('9403.60.00', 'Flat-pack wooden cabinets and shelving', 180, 'cartons', 15000, 180, 96)],
      status: 'paid', notes: 'Northern corridor delivery booked for next week.',
      createdAt: tsDaysAgo(13), updatedAt: tsDaysAgo(3, 9), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(10), assessedDate: isoDaysAgo(6), paidDate: isoDaysAgo(3),
      timeline: [
        tl(13, CLARA, 'create', 'Entry created'),
        tl(10, CLARA, 'status', 'Status: Ready to lodge → Lodged'),
        tl(6, CLARA, 'status', 'Status: Lodged → Assessed'),
        tl(3, CLARA, 'status', 'Status: Assessed → Duty paid')
      ]
    });
    ensure(e6);
    docsSet(e6, [['bl', 'MSCU7781234'], ['invoice', 'LF/CN/26-0903'], ['packing', 'PL-0903']]);

    /* ---- AE/2026/0107 — textiles road, ready to lodge ---- */
    var e7 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0107', clientId: 'c_textile', mode: 'road', transportRef: 'TZ-NMG-4482', incoterm: 'FOB',
      originCountry: 'Tanzania', arrivalDate: isoDaysAgo(-2), currency: 'USD', fxRate: 1, freight: 640, insurance: 0,
      charges: { port: 0, handling: 120, transport: 260, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('6109.10.00', 'Cotton T-shirts, assorted colours', 200, 'cartons', 5400, 6000, 2.8)],
      status: 'ready', notes: 'Docs complete. Client confirms funds received before lodging.',
      createdAt: tsDaysAgo(6), updatedAt: tsDaysAgo(2, 10), createdBy: 'u_james',
      timeline: [
        tl(6, JAMES, 'create', 'Entry created'),
        tl(2, JAMES, 'status', 'Status: Awaiting docs → Ready to lodge')
      ]
    });
    ensure(e7);
    docsSet(e7, [['cmr', 'TZ-NMG-4482'], ['invoice', 'THZ/26-0512'], ['packing', 'PL-0512']]);

    /* ---- AE/2026/0108 — fertilizer, awaiting docs ---- */
    var e8 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0108', clientId: 'c_agri', mode: 'sea', transportRef: 'CMAU9981223', incoterm: 'FOB',
      originCountry: 'Saudi Arabia', arrivalDate: isoDaysAgo(-4), currency: 'USD', fxRate: 1, freight: 2200, insurance: 90,
      charges: { port: 430, handling: 300, transport: 520, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('3105.10.00', 'NPK 20-10-10 fertilizer in 50 kg bags', 400, 'bags', 20000, 25, 480)],
      status: 'awaiting_docs', notes: 'Chasing commercial invoice and fertilizer permit copy from client.',
      createdAt: tsDaysAgo(4), updatedAt: tsDaysAgo(1, 8), createdBy: 'u_james',
      timeline: [
        tl(4, JAMES, 'create', 'Entry created'),
        tl(1, JAMES, 'status', 'Status: New → Awaiting docs')
      ]
    });
    ensure(e8);
    docsSet(e8, [['bl', 'CMAU9981223']]);

    /* ---- AE/2026/0109 — LED lamps sea, lodged ---- */
    var e9 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0109', clientId: 'c_prime', mode: 'sea', transportRef: 'EVER1948220', incoterm: 'FOB',
      originCountry: 'China', arrivalDate: isoDaysAgo(-1), currency: 'USD', fxRate: 1, freight: 2400, insurance: 140,
      charges: { port: 480, handling: 300, transport: 390, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('9405.40.00', 'LED desk lamps, assorted finishes', 260, 'cartons', 9100, 5200, 3.6)],
      status: 'lodged', notes: 'Awaiting first assessment.',
      createdAt: tsDaysAgo(5), updatedAt: tsDaysAgo(2, 13), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(2),
      timeline: [
        tl(5, CLARA, 'create', 'Entry created'),
        tl(2, CLARA, 'status', 'Status: Ready to lodge → Lodged')
      ]
    });
    ensure(e9);
    docsSet(e9, [['bl', 'EVER1948220'], ['invoice', 'PE/CN/26-0521'], ['packing', 'PL-0521']]);

    /* ---- AE/2026/0110 — spare parts air, new, no lines yet ---- */
    var e10 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0110', clientId: 'c_kilifi', mode: 'air', transportRef: '', incoterm: 'FOB',
      originCountry: 'United Arab Emirates', arrivalDate: isoDaysAgo(-3), currency: 'USD', fxRate: 1, freight: 0, insurance: 0,
      charges: { port: 0, handling: 0, transport: 0, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [], status: 'new', notes: 'Awaiting supplier documents for cold-room spare parts ex Dubai.',
      createdAt: tsDaysAgo(1), updatedAt: tsDaysAgo(1, 9), createdBy: 'u_clara',
      timeline: [tl(1, CLARA, 'create', 'Entry created')]
    });
    ensure(e10);

    /* ---- AE/2026/0111 — closures road, delivered, OVERDUE balance ---- */
    var e11 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0111', clientId: 'c_bev', mode: 'road', transportRef: 'KE-NGM-7731', incoterm: 'FOB',
      originCountry: 'Kenya', arrivalDate: isoDaysAgo(58), currency: 'USD', fxRate: 1, freight: 520, insurance: 0,
      charges: { port: 0, handling: 95, transport: 210, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('8309.90.00', 'Crown caps and closures, steel', 90, 'cartons', 8100, 9000, 0.85)],
      status: 'delivered', notes: 'Balance overdue — statements issued 12 Jan and 02 Feb, no response yet. Flagged for credit control.',
      createdAt: tsDaysAgo(62), updatedAt: tsDaysAgo(50, 11), createdBy: 'u_james',
      lodgedDate: isoDaysAgo(60), assessedDate: isoDaysAgo(58), paidDate: isoDaysAgo(40), releasedDate: isoDaysAgo(55), deliveredDate: isoDaysAgo(50),
      timeline: [
        tl(62, JAMES, 'create', 'Entry created'),
        tl(60, JAMES, 'status', 'Status: Ready to lodge → Lodged'),
        tl(58, JAMES, 'status', 'Status: Lodged → Assessed'),
        tl(40, CLARA, 'status', 'Status: Assessed → Duty paid'),
        tl(55, JAMES, 'status', 'Status: Duty paid → Released'),
        tl(50, JAMES, 'status', 'Status: Released → Delivered'),
        tl(40, CLARA, 'pay', 'Part payment received — reminder sent for balance')
      ]
    });
    ensure(e11);
    docsSet(e11, [['cmr', 'KE-NGM-7731'], ['invoice', 'CBL-KE-2026-044']]);

    /* ---- AE/2026/0112 — cancelled ---- */
    var e12 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0112', clientId: 'c_lakes', mode: 'sea', transportRef: 'APMU6612009', incoterm: 'FOB',
      originCountry: 'China', arrivalDate: '', currency: 'USD', fxRate: 1, freight: 900, insurance: 0,
      charges: { port: 0, handling: 0, transport: 0, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('9403.60.00', 'Wooden office desks, flat-pack', 60, 'cartons', 5800, 60, 88)],
      status: 'cancelled', cancelledReason: 'Consignee redirected cargo to Dar es Salaam; entry withdrawn at client request.',
      notes: 'Cancelled before lodging; no duties or charges incurred.',
      createdAt: tsDaysAgo(26), updatedAt: tsDaysAgo(20, 15), createdBy: 'u_clara',
      timeline: [
        tl(26, CLARA, 'create', 'Entry created'),
        tl(20, CLARA, 'status', 'Status: Awaiting docs → Cancelled — consignee redirected cargo to Dar es Salaam; entry withdrawn at client request.')
      ]
    });
    ensure(e12);
    docsSet(e12, [['bl', 'APMU6612009']]);

    /* ---- AE/2026/0113 — catheters air, assessed (VAT-exempt demo) ---- */
    var e13 = addEntry({
      id: C.uid('e'), ref: 'AE/2026/0113', clientId: 'c_meds', mode: 'air', transportRef: '176-99412206', incoterm: 'CIF',
      originCountry: 'Netherlands', arrivalDate: isoDaysAgo(3), currency: 'USD', fxRate: 1, freight: 780, insurance: 40,
      charges: { port: 120, handling: 80, transport: 140, other: 0 }, feeMode: 'percent', feePercent: 2, feeValue: 0,
      lines: [line('9018.39.00', 'Sterile catheters and cannulae', 30, 'cartons', 620, 24000, 0.42)],
      status: 'assessed', notes: 'Zero-rated duty; VAT-exempt under health schedule. Charges only.',
      createdAt: tsDaysAgo(6), updatedAt: tsDaysAgo(2, 10), createdBy: 'u_clara',
      lodgedDate: isoDaysAgo(4), assessedDate: isoDaysAgo(2),
      timeline: [
        tl(6, CLARA, 'create', 'Entry created'),
        tl(4, CLARA, 'status', 'Status: Ready to lodge → Lodged'),
        tl(2, CLARA, 'status', 'Status: Lodged → Assessed')
      ]
    });
    ensure(e13);
    docsSet(e13, [['awb', '176-99412206'], ['invoice', 'MSE/NL/26-1142'], ['permit', 'PPB-IMP-2026-410']]);

    function ensure(e) { C.ensureDocs(e); }

    /* ---- payments: derived from computed totals for consistency ---- */
    var idx = C.tariffIndex(tariff);
    function payFor(entry, fraction, daysAgo, method, note, who) {
      var c = C.computeEntry(entry, idx, org);
      var amount = C.round2(c.totalDue * fraction);
      if (amount <= 0) return;
      payments.push({
        id: C.uid('p'), clientId: entry.clientId, entryId: entry.id, amount: amount,
        date: isoDaysAgo(daysAgo), method: method || 'Bank transfer',
        note: note || '', createdAt: tsDaysAgo(daysAgo, 12), createdBy: 'u_clara'
      });
      entry.timeline.push(tl(daysAgo, who || CLARA, 'pay', 'Payment received: ' + amount.toFixed(2) + ' USD' + (note ? ' — ' + note : '')));
    }
    payFor(e1, 1,    63, 'Bank transfer', 'Full settlement');
    payFor(e2, 0.85, 25, 'Bank transfer', 'Part payment — balance on next order');
    payFor(e3, 1,    18, 'Bank transfer', 'Full settlement');
    payFor(e6, 1,     3, 'Bank transfer', 'Full settlement');
    payFor(e11, 0.5, 40, 'Mobile money', 'Part payment — balance overdue');

    return { version: 1, org: org, users: users, clients: clients, tariff: tariff, entries: entries, payments: payments };
  }

  return { buildSeed: buildSeed };
});
