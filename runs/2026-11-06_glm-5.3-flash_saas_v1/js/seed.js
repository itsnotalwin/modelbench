/* ClearLink seed/demo data — built fresh on first launch or "reset demo". */
(function (root) {
  'use strict';
  var CORE = (typeof window !== 'undefined' ? window.CDCore : require('./core.js'));

  function build(today) {
    var T = today || CORE.todayISO();
    function daysAgo(n) {
      var d = CORE.parseDate(T);
      d.setUTCDate(d.getUTCDate() - n);
      return d.toISOString().slice(0, 10);
    }
    function daysAhead(n) {
      var d = CORE.parseDate(T);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    }

    var db = {
      schema: 1,
      createdAt: new Date().toISOString(),
      settings: {
        orgName: 'ClearLink Logistics (Pty) Ltd',
        regNo: '2014/188392/07',
        orgAddress: 'Unit 7, Harbour Park, umgeni Road, Durban, 4001',
        orgEmail: 'ops@clearlink.co.za',
        orgPhone: '+27 31 555 0184',
        bankName: 'First National Bank', bankAcc: '6244 1188 902', bankBranch: '250655',
        currency: 'ZAR',
        vatRate: 0.15,
        fees: { perEntry: 950, perLine: 190, disbursement: 420 },
        demurrage: {
          seaFreeDays: 4,
          seaTiers: [
            { upTo: 7,    day20: 335,  day40: 540 },
            { upTo: 14,   day20: 640,  day40: 1010 },
            { upTo: null, day20: 1120, day40: 1760 }
          ],
          airFreeDays: 2,
          airTiers: [
            { upTo: 3,    perKg: 1.35 },
            { upTo: 7,    perKg: 2.60 },
            { upTo: null, perKg: 4.80 }
          ]
        }
      },
      seq: { entry: 115, quote: 4, invoice: 6 },
      users: [],
      clients: [],
      tariff: [],
      rates: [],
      entries: [],
      quotes: []
    };

    db.users = [{
      id: 'u_demo', name: 'Demo Agent', email: 'demo@clearlink.co.za',
      salt: 'c1earlink', hash: CORE.hashPassword('c1earlink', 'demo1234'),
      createdAt: new Date().toISOString()
    }];

    db.clients = [
      { id: 'cl_cape',  name: 'Cape Union Traders',      taxNo: '4123456789',  contactName: 'Priya Naidoo',    email: 'imports@capeunion.co.za',   phone: '+27 21 555 0142', address: '12 Paarden Eiland Rd, Cape Town, 7405',  creditDays: 30, notes: 'Retail importer; prefers morning collection slots.', createdAt: daysAgo(400) },
      { id: 'cl_karoo', name: 'Karoo Foods (Pty) Ltd',   taxNo: '4890012345',  contactName: 'Deon van Wyk',    email: 'deon@karofoods.co.za',      phone: '+27 11 555 0778', address: '88 Isando Business Park, Kempton Park, 1619', creditDays: 45, notes: 'Cold chain. Temperature certificate required per shipment.', createdAt: daysAgo(388) },
      { id: 'cl_highv', name: 'Highveld Machinery',      taxNo: '4655778901',  contactName: 'Thabo Mokoena',   email: 'procurement@highveldmach.co.za', phone: '+27 11 555 0912', address: '5 Boksburg East Drift, Boksburg, 1459', creditDays: 30, notes: 'Spare parts under rebate codes \u2014 check ITAC before quoting.', createdAt: daysAgo(310) },
      { id: 'cl_blue',  name: 'Blue Ocean Imports',      taxNo: '4901234567',  contactName: 'Lerato Dlamini',  email: 'lerato@blueocean.co.za',    phone: '+27 31 555 0230', address: '3 Maydon Wharf, Durban, 4057', creditDays: 15, notes: 'Occasional customs queries \u2014 always keep docs copies on file.', createdAt: daysAgo(220) },
      { id: 'cl_nomad', name: 'Nomad Outdoor Gear',      taxNo: '4730112233',  contactName: 'Sam Kelbrick',    email: 'sam@nomadgear.co.za',       phone: '+27 41 555 0661', address: '19 Kragga Kamma Rd, Gqeberha, 6025', creditDays: 30, notes: 'Seasonal peaks Nov\u2013Jan.', createdAt: daysAgo(150) },
      { id: 'cl_aurora',name: 'Aurora Pharmaceuticals',  taxNo: '4511998877',  contactName: 'Dr. Funmi Adeleke', email: 'supply@aurorapharm.co.za', phone: '+27 31 555 0455', address: '2 Springfield Park Dr, Durban, 4051', creditDays: 60, notes: 'SAHPRA licences on file; schedule medicines need permit ref.', createdAt: daysAgo(95) }
    ];

    db.tariff = [
      { id: 't01', hsCode: '8471.30.00', description: 'Portable automatic data processing machines, weight \u2264 10kg', dutyRate: 0,    exciseRate: 0,     vatRate: null },
      { id: 't02', hsCode: '8471.70.00', description: 'Storage units (SSD / HDD)',                        dutyRate: 0,    exciseRate: 0,     vatRate: null },
      { id: 't03', hsCode: '8517.62.00', description: 'Machines for reception/transmission of data (routers, modems)', dutyRate: 0, exciseRate: 0, vatRate: null },
      { id: 't04', hsCode: '8528.72.00', description: 'Television receivers, colour',                     dutyRate: 0.15, exciseRate: 0,     vatRate: null },
      { id: 't05', hsCode: '8507.60.00', description: 'Lithium-ion accumulators',                         dutyRate: 0,    exciseRate: 0,     vatRate: null },
      { id: 't06', hsCode: '8544.42.00', description: 'Electric conductors fitted with connectors',       dutyRate: 0.10, exciseRate: 0,     vatRate: null },
      { id: 't07', hsCode: '8708.99.00', description: 'Parts and accessories of motor vehicles, other',   dutyRate: 0.20, exciseRate: 0,     vatRate: null },
      { id: 't08', hsCode: '8703.23.00', description: 'Motor cars, spark-ignition, 1500\u20133000cc',     dutyRate: 0.25, exciseRate: 0.186, vatRate: null },
      { id: 't09', hsCode: '6109.10.00', description: 'T-shirts, singlets, knitted, of cotton',           dutyRate: 0.40, exciseRate: 0.22,  vatRate: null },
      { id: 't10', hsCode: '6115.95.00', description: 'Pantyhose and tights, knitted, of synthetic fibres', dutyRate: 0.40, exciseRate: 0.22, vatRate: null },
      { id: 't11', hsCode: '6403.99.00', description: 'Footwear with uppers of leather, other',           dutyRate: 0.40, exciseRate: 0.22,  vatRate: null },
      { id: 't12', hsCode: '4202.21.00', description: 'Handbags, with outer surface of leather',          dutyRate: 0.30, exciseRate: 0,     vatRate: null },
      { id: 't13', hsCode: '9403.60.00', description: 'Wooden furniture, other',                          dutyRate: 0.20, exciseRate: 0,     vatRate: null },
      { id: 't14', hsCode: '7326.90.00', description: 'Articles of iron or steel, other',                 dutyRate: 0.15, exciseRate: 0,     vatRate: null },
      { id: 't15', hsCode: '8413.70.00', description: 'Centrifugal pumps, other',                         dutyRate: 0.05, exciseRate: 0,     vatRate: null },
      { id: 't16', hsCode: '8207.50.00', description: 'Interchangeable tools for boring or drilling',     dutyRate: 0.10, exciseRate: 0,     vatRate: null },
      { id: 't17', hsCode: '4011.10.00', description: 'New pneumatic tyres, motor cars',                  dutyRate: 0.25, exciseRate: 0,     vatRate: null },
      { id: 't18', hsCode: '3304.99.00', description: 'Beauty or make-up preparations, other',            dutyRate: 0.20, exciseRate: 0,     vatRate: null },
      { id: 't19', hsCode: '3004.90.00', description: 'Medicaments, put up in measured doses, other',     dutyRate: 0,    exciseRate: 0,     vatRate: null },
      { id: 't20', hsCode: '9018.90.00', description: 'Instruments and appliances for medical sciences, other', dutyRate: 0, exciseRate: 0,  vatRate: null },
      { id: 't21', hsCode: '9506.61.00', description: 'Articles and equipment for general physical exercise', dutyRate: 0.15, exciseRate: 0, vatRate: null },
      { id: 't22', hsCode: '7113.19.00', description: 'Articles of jewellery of other precious metal',    dutyRate: 0.20, exciseRate: 0,     vatRate: null },
      { id: 't23', hsCode: '4419.19.00', description: 'Tableware and kitchenware, of wood, other',        dutyRate: 0.15, exciseRate: 0,     vatRate: null },
      { id: 't24', hsCode: '2204.21.00', description: 'Wine of fresh grapes in containers \u2264 2 litres', dutyRate: 0.25, exciseRate: 0.15, vatRate: null },
      { id: 't25', hsCode: '2202.10.00', description: 'Waters, including mineral waters, sweetened',      dutyRate: 0,    exciseRate: 0,     vatRate: null },
      { id: 't26', hsCode: '4821.90.00', description: 'Printed labels of paper or paperboard',            dutyRate: 0,    exciseRate: 0,     vatRate: null }
    ];

    db.rates = [
      { id: 'r01', date: '2026-09-07', usdZar: 18.12 }, { id: 'r02', date: '2026-09-14', usdZar: 18.28 },
      { id: 'r03', date: '2026-09-21', usdZar: 18.05 }, { id: 'r04', date: '2026-09-28', usdZar: 18.34 },
      { id: 'r05', date: '2026-10-05', usdZar: 18.46 }, { id: 'r06', date: '2026-10-12', usdZar: 18.41 },
      { id: 'r07', date: '2026-10-19', usdZar: 18.55 }, { id: 'r08', date: '2026-10-26', usdZar: 18.63 },
      { id: 'r09', date: '2026-11-02', usdZar: 18.58 }
    ];

    function ev(daysOffset, text) {
      return { ts: new Date(Date.now() - daysOffset * 86400000).toISOString(), text: text, by: 'Demo Agent' };
    }
    function item(id, hs, desc, qty, unit, val) {
      return { id: id, hsCode: hs, description: desc, qty: qty, unit: unit, unitValueUsd: val };
    }

    /* ---- consignments across the full lifecycle ---- */
    var entries = [];
    var seq = db.seq.entry;
    function mk(ref, clientId, o) {
      var e = {
        id: 'en_' + ref.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ref: ref, clientId: clientId,
        mode: o.mode || 'sea', containerSize: o.size || '40', grossKg: o.grossKg || 0,
        vessel: o.vessel || '', blNo: o.bl || '', containerNo: o.container || '',
        originCountry: o.origin || 'China', pol: o.pol || 'Shanghai', pod: o.pod || 'Durban',
        arrivalDate: o.arrival, exchangeRate: o.rate,
        freightUsd: o.freight, insuranceUsd: o.insurance, otherChargesUsd: o.other || 0,
        transportZar: o.transport || 0,
        items: o.items || [], docs: o.docs || {}, status: o.status,
        queryFrom: o.queryFrom || null,
        assignee: o.assignee || 'S. Pillay',
        payments: o.payments || [], invoice: o.invoice || null,
        releasedDate: o.releasedDate || null, deliveredDate: o.deliveredDate || null,
        notes: o.notes || '', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        timeline: o.timeline || []
      };
      entries.push(e);
      return e;
    }

    /* Closed & paid */
    mk('CL-26-0101', 'cl_cape', {
      arrival: daysAgo(24), rate: 18.34, freight: 2100, insurance: 120,
      bl: 'MAEU881120344', container: 'MSCU4471203', vessel: 'MSC Meridian V.042W',
      size: '40', grossKg: 8400,
      items: [item('i1', '9403.60.00', 'Solid pine bookshelves, flat-pack', 320, 'ctn', 26.5),
              item('i2', '4419.19.00', 'Acacia serving boards', 450, 'ctn', 9.8)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: true, permit: false },
      status: 'closed',
      payments: [{ id: 'p1', date: daysAgo(18), amount: 41000, ref: 'SARS-EFT-88213', method: 'eft' }],
      invoice: { no: 'INV-26-0001', date: daysAgo(17), paid: true, paidDate: daysAgo(8), lines: [], total: 0 },
      releasedDate: daysAgo(18), deliveredDate: daysAgo(14),
      timeline: [ev(30, 'Consignment captured.'), ev(28, 'All documents received; ready to lodge.'),
        ev(27, 'Declaration lodged with customs.'), ev(22, 'Customs assessment received.'),
        ev(18, 'Government charges paid in full (SARS-EFT-88213).'), ev(18, 'Cargo released by customs.'),
        ev(14, 'Delivered to client premises.'), ev(8, 'Client invoice paid in full. Consignment closed.')]
    });

    /* Released, invoiced, awaiting payment */
    mk('CL-26-0102', 'cl_karoo', {
      arrival: daysAgo(15), rate: 18.46, freight: 3400, insurance: 210,
      bl: 'HLCU982047712', container: 'TCLU9982130', vessel: 'Santa Catarina V.118E',
      size: '40RF', grossKg: 12400, pod: 'Durban', origin: 'Brazil',
      items: [item('i1', '2204.21.00', 'Cabernet Sauvignon, 750ml bottles', 2600, 'ctn', 22.4)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: true, permit: false },
      status: 'released',
      payments: [{ id: 'p1', date: daysAgo(10), amount: 62000, ref: 'SARS-EFT-88560', method: 'eft' }],
      invoice: { no: 'INV-26-0002', date: daysAgo(9), paid: false, paidDate: null, lines: [], total: 0 },
      releasedDate: daysAgo(10),
      notes: 'Cold chain \u2014 temperature certificate filed with docs.',
      timeline: [ev(21, 'Consignment captured.'), ev(16, 'Documents received and verified.'),
        ev(15, 'Declaration lodged with customs.'), ev(12, 'Assessed by customs.'),
        ev(10, 'Government charges paid in full (SARS-EFT-88560).'), ev(10, 'Cargo released by customs.'),
        ev(9, 'Client invoice INV-26-0002 generated.')]
    });

    /* Duty paid, awaiting release */
    mk('CL-26-0103', 'cl_highv', {
      arrival: daysAgo(11), rate: 18.55, freight: 4800, insurance: 260,
      bl: 'CMAU771203885', container: 'CMAU5510247', vessel: 'CMG Nevada V.204S',
      size: '20', grossKg: 9100,
      items: [item('i1', '8413.70.00', 'Industrial centrifugal pumps, cast iron', 28, 'pc', 340),
              item('i2', '8207.50.00', 'Drill bits, HSS, assorted', 1200, 'pc', 4.2)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'duty_paid',
      payments: [{ id: 'p1', date: daysAgo(6), amount: 78000, ref: 'SARS-EFT-89021', method: 'eft' }],
      timeline: [ev(18, 'Consignment captured.'), ev(13, 'Documents received; lodged same day.'),
        ev(11, 'Declaration lodged with customs.'), ev(8, 'Customs assessment received.'),
        ev(6, 'Government charges paid in full (SARS-EFT-89021).')]
    });

    /* Assessed with partial payment */
    mk('CL-26-0104', 'cl_nomad', {
      arrival: daysAgo(9), rate: 18.55, freight: 2900, insurance: 150,
      bl: 'ONEY662031447', container: 'ONEU3309128', vessel: 'Ocean Endeavour V.55N',
      size: '40', grossKg: 6800,
      items: [item('i1', '6109.10.00', 'Printed cotton t-shirts, adult', 2400, 'ctn', 18.5),
              item('i2', '6403.99.00', 'Leather hiking boots', 480, 'pr', 41.0)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'assessed',
      payments: [{ id: 'p1', date: daysAgo(4), amount: 50000, ref: 'FNB-EFT-77219', method: 'eft' }],
      timeline: [ev(15, 'Consignment captured.'), ev(10, 'Documents received and checked.'),
        ev(9, 'Declaration lodged with customs.'), ev(6, 'Customs assessment received \u2014 clothing lines flagged for quota check, cleared.'),
        ev(4, 'Part payment received against duty account.')]
    });

    /* Lodged, docs complete */
    mk('CL-26-0105', 'cl_aurora', {
      mode: 'air', size: '', grossKg: 640, pod: 'OR Tambo (JNB)', origin: 'India',
      vessel: 'ET-583 / AI-221', bl: '176-88201975', container: '',
      arrival: daysAgo(3), rate: 18.63, freight: 1650, insurance: 90,
      items: [item('i1', '3004.90.00', 'Paracetamol tablets 500mg, blister packs', 300, 'ctn', 46.0),
              item('i2', '9018.90.00', 'Digital thermometer probes', 850, 'pc', 2.6)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: true, permit: true },
      status: 'lodged',
      timeline: [ev(6, 'Consignment captured.'), ev(4, 'SAHPRA permit copy filed against consignment.'),
        ev(3, 'Air waybill and docs complete \u2014 lodged with customs at OR Tambo.')]
    });

    /* Docs pending */
    mk('CL-26-0106', 'cl_blue', {
      arrival: daysAgo(5), rate: 18.63, freight: 5200, insurance: 310,
      bl: 'ZIMU442019987', container: 'ZIMU8814402', vessel: 'Zim Kingston V.77W',
      size: '40', grossKg: 14200,
      items: [item('i1', '7326.90.00', 'Steel fasteners and brackets', 5200, 'kg', 2.35)],
      docs: { commercialInvoice: true, packingList: false, billOfLading: true, coo: false, permit: false },
      status: 'docs_pending',
      notes: 'Packing list chased with supplier twice; manifest mismatch risk if not received before day 7.',
      timeline: [ev(9, 'Consignment captured.'), ev(5, 'Vessel arrived Durban.'),
        ev(4, 'Packing list requested from supplier (follow-up #2).')]
    });

    /* Under query */
    mk('CL-26-0107', 'cl_karoo', {
      arrival: daysAgo(13), rate: 18.46, freight: 4100, insurance: 220,
      bl: 'MSCU220114909', container: 'MSCU7780121', vessel: 'MSC Ambition V.038E',
      size: '20', grossKg: 5400,
      items: [item('i1', '2202.10.00', 'Sparkling mineral water, 330ml cans', 4800, 'ctn', 3.1)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'query', queryFrom: 'lodged',
      notes: 'Customs inspection requested \u2014 possible classification dispute on sweetened vs mineral.',
      timeline: [ev(19, 'Consignment captured.'), ev(14, 'Declaration lodged with customs.'),
        ev(13, 'Vessel arrived Durban.'), ev(7, 'Customs placed consignment under inspection \u2014 classification query raised.')]
    });

    /* Two drafts */
    mk('CL-26-0108', 'cl_cape', {
      arrival: daysAhead(4), rate: 18.58, freight: 6100, insurance: 380,
      bl: 'HLXU903118822', container: 'HLXU2210455', vessel: 'Hyundai Drive V.066W',
      size: '40', grossKg: 11500,
      items: [item('i1', '4202.21.00', 'Leather handbags, assorted colours', 900, 'pc', 24.0),
              item('i2', '7113.19.00', 'Silver jewellery sets', 350, 'pc', 19.5)],
      docs: { commercialInvoice: false, packingList: false, billOfLading: true, coo: false, permit: false },
      status: 'draft', assignee: 'N. Khumalo',
      timeline: [ev(2, 'Consignment captured. Awaiting commercial invoice and packing list from supplier.')]
    });
    mk('CL-26-0109', 'cl_highv', {
      arrival: daysAhead(8), rate: 18.58, freight: 2750, insurance: 140,
      bl: 'DALU881203447', container: 'DALU9987701', vessel: 'DAL Karoo V.112N',
      size: '20', grossKg: 7300,
      items: [item('i1', '8708.99.00', 'Truck suspension components', 140, 'pc', 96.0)],
      docs: { commercialInvoice: false, packingList: false, billOfLading: false, coo: false, permit: false },
      status: 'draft', assignee: 'S. Pillay',
      timeline: [ev(1, 'Consignment captured from pro-forma invoice.')]
    });

    /* Delivered, invoiced */
    mk('CL-26-0110', 'cl_nomad', {
      arrival: daysAgo(20), rate: 18.41, freight: 3200, insurance: 180,
      bl: 'COSU661203718', container: 'COSU4410909', vessel: 'COSCO Galaxy V.191W',
      size: '40', grossKg: 9200,
      items: [item('i1', '9506.61.00', 'Exercise bikes, domestic', 210, 'ctn', 58.0)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'delivered',
      payments: [{ id: 'p1', date: daysAgo(14), amount: 46500, ref: 'SARS-EFT-88404', method: 'eft' }],
      invoice: { no: 'INV-26-0003', date: daysAgo(12), paid: false, paidDate: null, lines: [], total: 0 },
      releasedDate: daysAgo(14), deliveredDate: daysAgo(11),
      timeline: [ev(26, 'Consignment captured.'), ev(21, 'Declaration lodged with customs.'),
        ev(20, 'Vessel arrived Gqeberha.'), ev(16, 'Customs assessment received.'),
        ev(14, 'Government charges paid (SARS-EFT-88404). Cargo released.'),
        ev(11, 'Delivered to distribution centre.'), ev(12, 'Client invoice INV-26-0003 generated.')]
    });

    /* Released, NOT yet invoiced */
    mk('CL-26-0111', 'cl_aurora', {
      arrival: daysAgo(16), rate: 18.46, freight: 980, insurance: 60,
      bl: '176-99102218', container: '', vessel: 'QR-903 / EK-771',
      mode: 'air', size: '', grossKg: 310, pod: 'OR Tambo (JNB)', origin: 'Germany',
      items: [item('i1', '9018.90.00', 'Laboratory analysis instruments', 12, 'pc', 1240)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: true, permit: true },
      status: 'released', releasedDate: daysAgo(11),
      payments: [{ id: 'p1', date: daysAgo(11), amount: 15600, ref: 'SARS-EFT-88712', method: 'eft' }],
      timeline: [ev(21, 'Consignment captured.'), ev(17, 'Permit verified against SAHPRA schedule.'),
        ev(16, 'Lodged at OR Tambo.'), ev(13, 'Assessed \u2014 zero-rated medicines confirmed.'),
        ev(11, 'Government charges settled. Cargo released.'), ev(11, 'Awaiting delivery booking.')]
    });

    /* Old assessed consignment \u2014 large demurrage exposure */
    mk('CL-26-0112', 'cl_blue', {
      arrival: daysAgo(17), rate: 18.46, freight: 5900, insurance: 340,
      bl: 'MAEU441209011', container: 'MSCU1102344', vessel: 'MSC Aphrodite V.129W',
      size: '40', grossKg: 16800,
      items: [item('i1', '7326.90.00', 'Steel racking components', 7800, 'kg', 1.95),
              item('i2', '8708.99.00', 'Towbars, steel', 240, 'pc', 62.0)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'assessed',
      notes: 'Client payment delayed \u2014 demurrage accruing at 40ft tier-2 rate since day 8.',
      timeline: [ev(22, 'Consignment captured.'), ev(18, 'Declaration lodged with customs.'),
        ev(17, 'Vessel arrived Durban.'), ev(13, 'Customs assessment received.'),
        ev(3, 'Client advised of accruing demurrage exposure.')]
    });

    /* Cancelled */
    mk('CL-26-0113', 'cl_cape', {
      arrival: daysAgo(26), rate: 18.41, freight: 1800, insurance: 90,
      bl: 'ONEY112034490', container: 'ONEU7780012', vessel: 'Ocean Pioneer V.51S',
      size: '20', grossKg: 4200,
      items: [item('i1', '3304.99.00', 'Lipstick ranges, assorted', 600, 'pc', 6.8)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: false, permit: false },
      status: 'cancelled',
      notes: 'Client rerouted to a competitor over price; consignment withdrawn before lodging.',
      timeline: [ev(30, 'Consignment captured.'), ev(27, 'Documents received.'),
        ev(26, 'Consignment cancelled at client request.')]
    });

    /* Lodged air */
    mk('CL-26-0114', 'cl_karoo', {
      mode: 'air', size: '', grossKg: 1120, pod: 'OR Tambo (JNB)', origin: 'Netherlands',
      vessel: 'KL-591 / SA-223', bl: '074-88201144',
      arrival: daysAgo(2), rate: 18.63, freight: 2400, insurance: 130,
      items: [item('i1', '3004.90.00', 'Oral rehydration salts, sachets', 1800, 'ctn', 2.9),
              item('i2', '4821.90.00', 'Printed pharmaceutical labels', 900000, 'lbl', 0.004)],
      docs: { commercialInvoice: true, packingList: true, billOfLading: true, coo: true, permit: false },
      status: 'lodged', assignee: 'N. Khumalo',
      timeline: [ev(5, 'Consignment captured.'), ev(2, 'Lodged at OR Tambo \u2014 docs complete.')]
    });

    /* Populate the seeded invoices that reference totals (cost recharge at compute time) */
    var byRef = {};
    entries.forEach(function (e) { byRef[e.ref] = e; });

    db.entries = entries;

    db.quotes = [
      {
        id: 'qt_1', ref: 'QT-26-0001', clientId: 'cl_nomad', date: daysAgo(6), validUntil: daysAhead(14),
        mode: 'sea', containerSize: '40', grossKg: 8200, pol: 'Ningbo', pod: 'Durban',
        items: [item('q1', '6109.10.00', 'Printed cotton t-shirts, spring range', 3200, 'ctn', 16.8),
                item('q2', '6115.95.00', 'Sports tights, synthetic', 900, 'ctn', 12.4)],
        freightUsd: 3900, insuranceUsd: 220, otherChargesUsd: 0, exchangeRate: 18.63,
        status: 'sent', convertedEntryId: null,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        timeline: [ev(6, 'Quotation drafted from supplier pro-forma.'), ev(5, 'Quotation sent to client.')]
      },
      {
        id: 'qt_2', ref: 'QT-26-0002', clientId: 'cl_highv', date: daysAgo(3), validUntil: daysAhead(11),
        mode: 'sea', containerSize: '20', grossKg: 9400, pol: 'Rotterdam', pod: 'Durban',
        items: [item('q1', '8413.70.00', 'Centrifugal pump assemblies', 44, 'pc', 315),
                item('q2', '8207.50.00', 'Drilling tool sets', 800, 'pc', 5.6)],
        freightUsd: 3100, insuranceUsd: 160, otherChargesUsd: 0, exchangeRate: 18.63,
        status: 'accepted', convertedEntryId: null,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        timeline: [ev(3, 'Quotation sent to client.'), ev(1, 'Quotation accepted \u2014 ready to convert to consignment.')]
      },
      {
        id: 'qt_3', ref: 'QT-26-0003', clientId: 'cl_aurora', date: daysAgo(9), validUntil: daysAgo(1),
        mode: 'air', containerSize: '', grossKg: 480, pol: 'Mumbai', pod: 'OR Tambo (JNB)',
        items: [item('q1', '3004.90.00', 'Antiseptic liquid, 500ml', 700, 'ctn', 8.4)],
        freightUsd: 1980, insuranceUsd: 80, otherChargesUsd: 0, exchangeRate: 18.55,
        status: 'declined', convertedEntryId: null,
        createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
        timeline: [ev(9, 'Quotation sent to client.'), ev(2, 'Client declined \u2014 used own freight contract instead.')]
      }
    ];

    return db;
  }

  /* Invoice totals are re-derived from live tariff/rate data so the seeded
     ledger always matches what the app computes. */
  function refreshSeedInvoices(db) {
    db.entries.forEach(function (e) {
      if (!e.invoice) return;
      var t = CORE.computeTotals(e, db.settings, db.tariff, CORE.todayISO());
      var lines = [];
      if (t.duty > 0) lines.push({ desc: 'Import duty (recharge at cost)', amount: t.duty });
      if (t.excise > 0) lines.push({ desc: 'Excise duty (recharge at cost)', amount: t.excise });
      if (t.vat > 0) lines.push({ desc: 'Import VAT (recharge at cost)', amount: t.vat });
      if (t.demurrage.cost > 0) lines.push({ desc: 'Port storage / demurrage (recharge at cost)', amount: t.demurrage.cost });
      t.fees.lines.forEach(function (l) { lines.push({ desc: l.desc, amount: l.amount }); });
      if (t.transportZar > 0) lines.push({ desc: 'Road transport / delivery', amount: t.transportZar });
      e.invoice.lines = lines;
      e.invoice.total = CORE.round2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
    });
    return db;
  }

  var SEED = {
    build: function (today) {
      return refreshSeedInvoices(build(today));
    },
    defaultUsers: function () {
      return [{
        id: 'u_demo', name: 'Demo Agent', email: 'demo@clearlink.co.za',
        salt: 'c1earlink', hash: CORE.hashPassword('c1earlink', 'demo1234'),
        createdAt: new Date().toISOString()
      }];
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SEED;
  else root.CDSeed = SEED;
})(typeof window !== 'undefined' ? window : globalThis);
