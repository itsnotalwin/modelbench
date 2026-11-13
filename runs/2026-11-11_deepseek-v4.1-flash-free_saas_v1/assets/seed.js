/* Declarant — demo workspace. All dates are generated relative to first launch. */
(function (root) {
  'use strict';

  root.buildDeclarantSeed = function buildDeclarantSeed(options) {
    const C = root.Declarant;
    const opts = options || {};
    const now = opts.now ? new Date(opts.now) : new Date();
    const today = C.isoDate(now);
    const nowStamp = now.toISOString();
    let lineSeq = 0;
    let disbSeq = 3001;
    let activitySeq = 0;

    function at(offset, hour, minute) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      d.setHours(hour == null ? 9 : hour, minute == null ? 10 : minute, 0, 0);
      // Never place seeded activity in the future, even if the app is first opened just after midnight.
      const ceiling = now.getTime() - 5 * 60000;
      if (d.getTime() > ceiling) d.setTime(ceiling);
      return d.toISOString();
    }

    function line(hs, qty, unitValue, weight, origin, description, preferential) {
      const t = C.tariffFor(hs);
      lineSeq += 1;
      return {
        id: 'ln_' + String(lineSeq).padStart(3, '0'),
        hs: hs,
        description: description || (t ? t.desc : ''),
        qty: qty,
        unit: t ? t.unit : 'unit',
        unitValue: unitValue,
        weight: weight,
        origin: origin || '',
        preferential: !!preferential
      };
    }

    const clients = [
      {
        id: 'CL-001', name: 'Kestrel Medical Ltd', short: 'Kestrel Medical', contact: 'Dr. Nia Wambui',
        email: 'nia@kestrelmedical.co.ke', phone: '+254 20 445 0182', terms: 30, creditLimit: 75000,
        address: 'Kestrel House, Riverside Drive, Nairobi', status: 'active', since: '2021-04-18',
        notes: 'Medical consignments. Cold-chain evidence required for diagnostics. Prefers air freight.'
      },
      {
        id: 'CL-002', name: 'Savanna Agro Exports', short: 'Savanna Agro', contact: 'Peter Mutiso',
        email: 'peter@savannaagro.co.ke', phone: '+254 51 221 9074', terms: 15, creditLimit: 45000,
        address: 'Kenyatta Avenue, Nakuru', status: 'active', since: '2022-08-02',
        notes: 'Inputs and animal feed. Seasonal volumes; prefers transit through Namanga.'
      },
      {
        id: 'CL-003', name: 'Rift Motors Ltd', short: 'Rift Motors', contact: 'Salim Omar',
        email: 'salim@riftmotors.co.ke', phone: '+254 41 222 6180', terms: 45, creditLimit: 140000,
        address: 'Moi Avenue, Mombasa', status: 'active', since: '2019-11-11',
        notes: 'Vehicle importer. Valuation queries are common; keep purchase agreements on file.'
      },
      {
        id: 'CL-004', name: 'Halcyon Pharma', short: 'Halcyon Pharma', contact: 'Grace Atieno',
        email: 'grace@halcyonpharma.co.ke', phone: '+254 57 202 4418', terms: 30, creditLimit: 85000,
        address: 'Oginga Odinga Street, Kisumu', status: 'active', since: '2020-02-27',
        notes: 'Pharmaceutical distributor. All batches require cold-chain and batch records.'
      },
      {
        id: 'CL-005', name: 'Coastline Chemicals', short: 'Coastline Chemicals', contact: 'Yusuf Hassan',
        email: 'yusuf@coastlinechem.co.ke', phone: '+254 41 231 7742', terms: 30, creditLimit: 105000,
        address: 'Changamwe Industrial Area, Mombasa', status: 'active', since: '2018-07-09',
        notes: 'Hazardous and regulated cargo. DG declarations required before berthing.'
      },
      {
        id: 'CL-006', name: 'Mwangaza Retail Group', short: 'Mwangaza Retail', contact: 'Lillian Njeri',
        email: 'lillian@mwangazaretail.co.ke', phone: '+254 20 271 3366', terms: 45, creditLimit: 60000,
        address: 'Enterprise Road, Nairobi', status: 'active', since: '2023-01-16',
        notes: 'Home and lifestyle retail. High SKU count; packing list quality matters.'
      },
      {
        id: 'CL-007', name: 'Terra Fresh Produce', short: 'Terra Fresh', contact: 'Kevin Ochieng',
        email: 'kevin@terrafresh.co.ke', phone: '+254 50 202 1187', terms: 15, creditLimit: 40000,
        address: 'Moi South Lake Road, Naivasha', status: 'active', since: '2022-10-05',
        notes: 'Perishables. Clear within free time; phytosanitary certificates always required.'
      },
      {
        id: 'CL-008', name: 'Northstar Energy', short: 'Northstar Energy', contact: 'Fatima Noor',
        email: 'fatima@northstarenergy.co.ke', phone: '+254 41 222 9081', terms: 60, creditLimit: 180000,
        address: 'Nyali Road, Mombasa', status: 'active', since: '2017-03-21',
        notes: 'Energy and solar equipment. Large capital files; board reporting at month end.'
      }
    ];
    const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));

    const users = [
      {
        id: 'usr_manager', name: 'Amara Njoroge', initials: 'AN', email: 'amara@meridian.co.ke',
        role: 'manager', title: 'Principal customs broker', active: true, createdAt: at(-620, 8, 15)
      },
      {
        id: 'usr_clerk', name: 'Daniel Kimani', initials: 'DK', email: 'daniel@meridian.co.ke',
        role: 'clerk', title: 'Clearance officer', active: true, createdAt: at(-380, 8, 40)
      }
    ];
    users.forEach((user) => {
      user.salt = C.makeSalt(16);
      user.passwordHash = C.hashPassword('demo1234', user.salt);
    });

    const specs = [
      {
        id: 'ENT-1044', clientId: 'CL-001', reference: 'KML-PO-2291', mode: 'air', status: 'intake',
        origin: 'Germany', port: 'JKIA Cargo', facility: 'Agent warehouse', carrier: 'Lufthansa Cargo', voyage: 'LH 830',
        documentRef: 'AWB 020-4471 8823', container: '', age: 0, etaOffset: 4, arrived: false,
        incoterm: 'CIF', procedure: 'Home use', currency: 'EUR', fxRate: 1.084, freight: 1420, insurance: 380,
        serviceFee: 480, ownerId: 'usr_clerk', freeDays: 3, storageRate: 40, detentionRate: 85,
        lines: [
          line('3004.90.00', 40, 180, 520, 'DE', 'Oncology support medication, retail packs'),
          line('9018.90.00', 8, 1250, 160, 'DE', 'Infusion pump sets and accessories'),
          line('8471.30.00', 6, 1400, 75, 'DE', 'Clinical review laptops and docking stations')
        ],
        docs: null,
        note: 'New consignment advised by Kestrel. Supplier invoice received by email; originals in transit.'
      },
      {
        id: 'ENT-1043', clientId: 'CL-006', reference: 'MRG/IMP/881', mode: 'sea', status: 'docs',
        origin: 'China', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'MSC', voyage: 'MSC Verona / 447W',
        documentRef: 'BL 227894410', container: 'MSKU 482 119-2', age: 1, etaOffset: 2, arrived: false,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2200, insurance: 310,
        serviceFee: 620, ownerId: 'usr_manager', freeDays: 6, storageRate: 85, detentionRate: 150,
        lines: [
          line('9403.60.00', 90, 85, 2800, 'CN', 'Oak-effect sideboards and media units'),
          line('9401.30.00', 120, 42, 1600, 'CN', 'Adjustable office chairs, fabric'),
          line('6109.10.00', 40, 210, 680, 'CN', 'Cotton retail t-shirts, assorted sizes')
        ],
        docs: { packing_list: 'received', declaration: 'missing' },
        note: 'Declaration blocked on final packing list. Client asked to confirm carton count before lodging.'
      },
      {
        id: 'ENT-1042', clientId: 'CL-001', reference: 'KML/IMP/0426', mode: 'air', status: 'duty',
        origin: 'Germany', port: 'JKIA Cargo', facility: 'Swissport cargo', carrier: 'Lufthansa Cargo', voyage: 'LH 590',
        documentRef: 'AWB 020-9014 2276', container: '', age: 11, etaOffset: -6, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'EUR', fxRate: 1.084, freight: 2380, insurance: 610,
        serviceFee: 780, ownerId: 'usr_manager', freeDays: 4, storageRate: 55, detentionRate: 110,
        assessedOffset: -6, demandOffset: -5,
        lines: [
          line('3004.90.00', 120, 210, 980, 'DE', 'Cardiac care medication, retail cartons'),
          line('3822.00.00', 30, 460, 260, 'DE', 'Clinical diagnostic reagent kits'),
          line('8471.30.00', 12, 1250, 120, 'DE', 'Diagnostic workstation laptops')
        ],
        docs: null,
        note: 'Cold-chain release pending duty settlement. Client finance has been copied on the demand.'
      },
      {
        id: 'ENT-1041', clientId: 'CL-003', reference: 'RIF/PO/7781', mode: 'sea', status: 'query',
        origin: 'Japan', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'K Line', voyage: 'Kota Nabil / 038E',
        documentRef: 'BL KMTI-441908', container: 'TCLU 771 640-9', age: 15, etaOffset: -9, arrived: true,
        incoterm: 'FOB', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 3900, insurance: 0,
        serviceFee: 1450, ownerId: 'usr_manager', freeDays: 5, storageRate: 95, detentionRate: 180,
        queryOffset: -3,
        lines: [
          line('8703.23.00', 3, 21500, 5100, 'JP', 'Toyota Harrier, 2,000 cc, used'),
          line('8708.99.00', 12, 380, 420, 'JP', 'Vehicle body and suspension parts')
        ],
        docs: null,
        query: {
          ref: 'QRY/2026/0714',
          text: 'Customs disputes the declared transaction value and requests the purchase agreement, bank remittance advice and an independent valuation.',
          raisedAt: at(-3, 10, 20),
          officer: 'P. Mwangi'
        },
        note: 'Valuation query open. Client has sent the purchase agreement; awaiting bank advice.'
      },
      {
        id: 'ENT-1040', clientId: 'CL-002', reference: 'SAV/IN/2026-118', mode: 'sea', status: 'docs',
        origin: 'India', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Maersk', voyage: 'Maersk Cabo Verde / 446S',
        documentRef: 'BL MAEU-8827193', container: 'MRKU 209 884-1', age: 2, etaOffset: 1, arrived: false,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2600, insurance: 390,
        serviceFee: 540, ownerId: 'usr_clerk', freeDays: 5, storageRate: 90, detentionRate: 160,
        lines: [
          line('3105.10.00', 400, 32.5, 20000, 'IN', 'NPK 17-17-17 mineral fertiliser', true),
          line('2309.90.00', 120, 24, 6000, 'IN', 'Dairy cattle mineral feed supplement'),
          line('3917.39.00', 80, 75, 900, 'IN', 'Drip irrigation hose and connectors')
        ],
        docs: { certificate_of_origin: 'missing' },
        note: 'Preferential origin claimed under AfCFTA. Certificate of origin is outstanding; client expects it today.'
      },
      {
        id: 'ENT-1039', clientId: 'CL-004', reference: 'HAL/PO/5521', mode: 'air', status: 'released',
        origin: 'India', port: 'JKIA Cargo', facility: 'Swissport cargo', carrier: 'Qatar Airways', voyage: 'QR 1346',
        documentRef: 'AWB 157-3380 1174', container: '', age: 9, etaOffset: -2, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 1850, insurance: 220,
        serviceFee: 460, ownerId: 'usr_clerk', freeDays: 4, storageRate: 50, detentionRate: 95,
        assessedOffset: -5, demandOffset: -4, releaseOffset: -1,
        lines: [
          line('3004.90.00', 80, 195, 640, 'IN', 'Antiretroviral medication, retail packs'),
          line('3822.00.00', 15, 520, 120, 'IN', 'Rapid test kits, sealed packs'),
          line('8471.30.00', 8, 1450, 90, 'IN', 'Laboratory data-capture laptops')
        ],
        docs: null,
        note: 'Released yesterday. Client arranging collection; terminal handling invoice still open.'
      },
      {
        id: 'ENT-1038', clientId: 'CL-005', reference: 'COC/PO/9910', mode: 'sea', status: 'assessed',
        origin: 'United Arab Emirates', port: 'Mombasa', facility: 'Changamwe tank farm', carrier: 'CMA CGM', voyage: 'CMA CGM Kribi / 312W',
        documentRef: 'BL CMDU-7712094', container: 'CMAU 660 418-5', age: 13, etaOffset: -4, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'AED', fxRate: 0.2723, freight: 3200, insurance: 480,
        serviceFee: 890, ownerId: 'usr_manager', freeDays: 5, storageRate: 110, detentionRate: 190,
        assessedOffset: -1,
        lines: [
          line('2710.19.90', 40, 820, 7600, 'AE', 'Industrial solvent blend, Class 3'),
          line('3304.99.00', 60, 240, 900, 'AE', 'Private-label skincare preparations')
        ],
        docs: null,
        note: 'Assessment received. DG handling invoice to be raised with the duty demand.'
      },
      {
        id: 'ENT-1037', clientId: 'CL-006', reference: 'MRG/IMP/874', mode: 'sea', status: 'lodged',
        origin: 'China', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Evergreen', voyage: 'Ever Gifted / 116E',
        documentRef: 'BL EGLV-4471288', container: 'EGHU 882 401-3', age: 5, etaOffset: -1, arrived: true,
        incoterm: 'FOB', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 3100, insurance: 0,
        serviceFee: 710, ownerId: 'usr_clerk', freeDays: 6, storageRate: 85, detentionRate: 150,
        lodgeOffset: -1,
        lines: [
          line('9403.60.00', 60, 92, 2100, 'CN', 'Bedroom furniture, flat-packed'),
          line('6403.99.00', 80, 260, 1100, 'CN', 'Leather upper footwear, assorted')
        ],
        docs: null,
        note: 'Declaration lodged and awaiting assessment. All documents verified at counter.'
      },
      {
        id: 'ENT-1036', clientId: 'CL-007', reference: 'TFP/IN/0912', mode: 'air', status: 'docs',
        origin: 'Ethiopia', port: 'JKIA Cargo', facility: 'Kuehne+Nagel perishables', carrier: 'Ethiopian Airlines', voyage: 'ET 318',
        documentRef: 'AWB 071-2210 6804', container: '', age: 3, etaOffset: 3, arrived: false,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 980, insurance: 160,
        serviceFee: 390, ownerId: 'usr_clerk', freeDays: 2, storageRate: 35, detentionRate: 70,
        lines: [
          line('0803.10.00', 600, 14.5, 7200, 'ET', 'Fresh Cavendish bananas, 13.5 kg cartons')
        ],
        docs: { packing_list: 'received', declaration: 'missing' },
        note: 'Perishable. Declaration waits on final carton weight; cold store booked for arrival.'
      },
      {
        id: 'ENT-1035', clientId: 'CL-008', reference: 'NSE/PO/4482', mode: 'sea', status: 'closed',
        origin: 'United Arab Emirates', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Maersk', voyage: 'Maersk Sheerness / 441W',
        documentRef: 'BL MAEU-6610458', container: 'MRKU 441 720-8', age: 32, etaOffset: -20, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 4200, insurance: 680,
        serviceFee: 1200, ownerId: 'usr_manager', freeDays: 7, storageRate: 105, detentionRate: 180,
        assessedOffset: -18, demandOffset: -17, releaseOffset: -15, deliveryOffset: -12, closeOffset: -10,
        lines: [
          line('2710.19.90', 80, 760, 15200, 'AE', 'Lubricating base oil, industrial drums'),
          line('8541.43.00', 120, 145, 3200, 'AE', 'Monocrystalline solar modules, 550 W')
        ],
        docs: null,
        note: 'File reconciled and closed. Storage credit note matched to the final invoice.'
      },
      {
        id: 'ENT-1034', clientId: 'CL-001', reference: 'KML/IMP/0419', mode: 'air', status: 'delivered',
        origin: 'Germany', port: 'JKIA Cargo', facility: 'Swissport cargo', carrier: 'Lufthansa Cargo', voyage: 'LH 590',
        documentRef: 'AWB 020-8871 4102', container: '', age: 18, etaOffset: -10, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'EUR', fxRate: 1.084, freight: 1120, insurance: 290,
        serviceFee: 520, ownerId: 'usr_clerk', freeDays: 4, storageRate: 50, detentionRate: 95,
        assessedOffset: -10, demandOffset: -9, releaseOffset: -5, deliveryOffset: -2,
        lines: [
          line('3004.90.00', 36, 210, 300, 'DE', 'Oncology medication, retail packs'),
          line('9018.90.00', 2, 4200, 65, 'DE', 'Patient monitoring units'),
          line('8471.30.00', 6, 1350, 70, 'DE', 'Ward workstation laptops')
        ],
        docs: null,
        delivery: { ref: 'POD-8841', recipient: 'N. Wambui', date: at(-2, 11, 20) },
        note: 'Delivered to Kestrel Riverside. Transport invoice remains unpaid.'
      },
      {
        id: 'ENT-1033', clientId: 'CL-002', reference: 'SAV/TR/2026-094', mode: 'road', status: 'docs',
        origin: 'Tanzania', port: 'Namanga Border', facility: 'Namanga OSBP', carrier: 'Riftline Transport', voyage: 'Truck KDG 441X',
        documentRef: 'T1 2026-441-908', container: '', age: 4, etaOffset: 0, arrived: false,
        incoterm: 'FOB', procedure: 'Transit', currency: 'USD', fxRate: 1, freight: 650, insurance: 0,
        serviceFee: 380, ownerId: 'usr_clerk', freeDays: 2, storageRate: 40, detentionRate: 80,
        lines: [
          line('2309.90.00', 80, 22, 4000, 'TZ', 'Concentrated dairy feed pellets'),
          line('1006.30.00', 100, 38, 5000, 'TZ', 'Milled rice, 25 kg bags')
        ],
        docs: { road_manifest: 'received', declaration: 'received' },
        note: 'Transit to Kampala. T1 and declaration are at verification; driver waiting at the border.'
      },
      {
        id: 'ENT-1032', clientId: 'CL-003', reference: 'RIF/PO/7726', mode: 'sea', status: 'duty',
        origin: 'United Kingdom', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Grimaldi', voyage: 'Grande Lagos / 229N',
        documentRef: 'BL GRIM-7718820', container: 'GRIU 880 319-4', age: 22, etaOffset: -12, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'GBP', fxRate: 1.272, freight: 4600, insurance: 920,
        serviceFee: 1600, ownerId: 'usr_manager', freeDays: 4, storageRate: 120, detentionRate: 220,
        assessedOffset: -9, demandOffset: -8,
        lines: [
          line('8703.23.00', 4, 18500, 6800, 'GB', 'Range Rover Evoque, 1,999 cc, used'),
          line('8708.99.00', 20, 420, 700, 'GB', 'Vehicle trim and electrical parts')
        ],
        docs: null,
        note: 'Partial duty receipt filed. Balance must clear before release; storage now accruing daily.'
      },
      {
        id: 'ENT-1031', clientId: 'CL-004', reference: 'HAL/PO/5489', mode: 'air', status: 'closed',
        origin: 'India', port: 'JKIA Cargo', facility: 'Swissport cargo', carrier: 'Qatar Airways', voyage: 'QR 1346',
        documentRef: 'AWB 157-3277 0912', container: '', age: 38, etaOffset: -28, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2100, insurance: 280,
        serviceFee: 520, ownerId: 'usr_manager', freeDays: 4, storageRate: 50, detentionRate: 95,
        assessedOffset: -27, demandOffset: -26, releaseOffset: -24, deliveryOffset: -22, closeOffset: -21,
        lines: [
          line('3004.90.00', 65, 188, 520, 'IN', 'Respiratory medication, retail packs'),
          line('3822.00.00', 18, 480, 140, 'IN', 'Laboratory reagent panels'),
          line('8471.30.00', 5, 1420, 60, 'IN', 'Pharmacy dispensing terminals')
        ],
        docs: null,
        note: 'Closed with all charges recovered.'
      },
      {
        id: 'ENT-1030', clientId: 'CL-005', reference: 'COC/PO/9844', mode: 'rail', status: 'released',
        origin: 'Tanzania', port: 'Nairobi ICD', facility: 'Nairobi ICD', carrier: 'Tanzania Railways', voyage: 'TRC 118',
        documentRef: 'RCN 441-7782', container: 'TRHU 220 418-1', age: 12, etaOffset: -3, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 1500, insurance: 260,
        serviceFee: 640, ownerId: 'usr_clerk', freeDays: 5, storageRate: 65, detentionRate: 120,
        assessedOffset: -7, demandOffset: -6, releaseOffset: -1,
        lines: [
          line('3304.99.00', 50, 225, 700, 'TZ', 'Industrial skincare concentrates'),
          line('3917.39.00', 30, 180, 1200, 'TZ', 'Flexible PVC hose, reinforced')
        ],
        docs: null,
        note: 'Released at Nairobi ICD. Terminal handling invoice to follow.'
      },
      {
        id: 'ENT-1029', clientId: 'CL-008', reference: 'NSE/PO/4410', mode: 'sea', status: 'delivered',
        origin: 'China', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'COSCO', voyage: 'COSCO Africa / 052W',
        documentRef: 'BL COSU-9912471', container: 'CSNU 772 109-6', age: 24, etaOffset: -15, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 5100, insurance: 760,
        serviceFee: 1350, ownerId: 'usr_manager', freeDays: 7, storageRate: 105, detentionRate: 190,
        assessedOffset: -14, demandOffset: -13, releaseOffset: -10, deliveryOffset: -8,
        lines: [
          line('8541.43.00', 200, 132, 5600, 'CN', 'Solar modules, 450 W'),
          line('8504.40.00', 60, 180, 900, 'CN', 'Grid-tie inverters, 5 kW')
        ],
        docs: null,
        delivery: { ref: 'POD-8772', recipient: 'F. Noor', date: at(-8, 15, 5) },
        note: 'Delivered to Northstar Nyali store. Documentation fee remains open.'
      },
      {
        id: 'ENT-1028', clientId: 'CL-006', reference: 'MRG/IMP/866', mode: 'sea', status: 'assessed',
        origin: 'China', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Evergreen', voyage: 'Ever Genius / 108E',
        documentRef: 'BL EGLV-4401287', container: 'EGHU 719 440-2', age: 8, etaOffset: -2, arrived: true,
        incoterm: 'FOB', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2800, insurance: 0,
        serviceFee: 660, ownerId: 'usr_clerk', freeDays: 6, storageRate: 85, detentionRate: 150,
        assessedOffset: 0,
        lines: [
          line('6109.10.00', 60, 200, 900, 'CN', 'Cotton promotional t-shirts'),
          line('6403.99.00', 50, 260, 700, 'CN', 'Leather upper casual shoes')
        ],
        docs: null,
        note: 'Assessed today. Duty demand to be prepared for client approval.'
      },
      {
        id: 'ENT-1027', clientId: 'CL-008', reference: 'NSE/PO/4388', mode: 'sea', status: 'docs',
        origin: 'Germany', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Hapag-Lloyd', voyage: 'Berlin Express / 024W',
        documentRef: 'BL HLCU-2287041', container: 'HLXU 441 092-7', age: 6, etaOffset: 5, arrived: false,
        incoterm: 'CIF', procedure: 'Home use', currency: 'EUR', fxRate: 1.084, freight: 3900, insurance: 610,
        serviceFee: 920, ownerId: 'usr_manager', freeDays: 7, storageRate: 110, detentionRate: 190,
        lines: [
          line('8419.89.00', 2, 68000, 18000, 'DE', 'Industrial heat-exchange skids'),
          line('9027.80.00', 3, 4200, 300, 'DE', 'Inline chemical analysis units')
        ],
        docs: { packing_list: 'missing', declaration: 'received' },
        note: 'Heavy lift. Packing list must match crate marks before declaration can be lodged.'
      },
      {
        id: 'ENT-1026', clientId: 'CL-001', reference: 'KML/TR/2026-082', mode: 'road', status: 'delivered',
        origin: 'Uganda', port: 'Namanga Border', facility: 'Namanga OSBP', carrier: 'Kestrel fleet', voyage: 'Truck KDA 882Y',
        documentRef: 'T1 2026-388-117', container: '', age: 20, etaOffset: -15, arrived: true,
        incoterm: 'FOB', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 720, insurance: 0,
        serviceFee: 440, ownerId: 'usr_clerk', freeDays: 2, storageRate: 40, detentionRate: 80,
        assessedOffset: -14, demandOffset: -13, releaseOffset: -10, deliveryOffset: -6,
        lines: [
          line('3004.90.00', 20, 220, 180, 'UG', 'Primary care medication, retail packs'),
          line('3822.00.00', 10, 510, 80, 'UG', 'Rapid diagnostic kits'),
          line('8471.30.00', 4, 1380, 50, 'UG', 'Clinic intake tablets')
        ],
        docs: null,
        delivery: { ref: 'POD-8620', recipient: 'J. Mwangi', date: at(-6, 10, 40) },
        note: 'Delivered. Documentation fee overdue and escalated to client finance.'
      },
      {
        id: 'ENT-1025', clientId: 'CL-002', reference: 'SAV/IN/2026-071', mode: 'sea', status: 'closed',
        origin: 'India', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'Maersk', voyage: 'Maersk Cabo Verde / 438S',
        documentRef: 'BL MAEU-7712904', container: 'MRKU 190 771-0', age: 50, etaOffset: -38, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2400, insurance: 340,
        serviceFee: 520, ownerId: 'usr_clerk', freeDays: 5, storageRate: 90, detentionRate: 160,
        assessedOffset: -36, demandOffset: -35, releaseOffset: -30, deliveryOffset: -28, closeOffset: -25,
        lines: [
          line('1006.30.00', 300, 35, 15000, 'IN', 'Long grain milled rice, 25 kg')
        ],
        docs: null,
        note: 'Closed. Duty paid and storage reconciled.'
      },
      {
        id: 'ENT-1024', clientId: 'CL-007', reference: 'TFP/IN/0871', mode: 'air', status: 'closed',
        origin: 'Ethiopia', port: 'JKIA Cargo', facility: 'Kuehne+Nagel perishables', carrier: 'Ethiopian Airlines', voyage: 'ET 318',
        documentRef: 'AWB 071-1988 4421', container: '', age: 64, etaOffset: -55, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 940, insurance: 140,
        serviceFee: 380, ownerId: 'usr_manager', freeDays: 2, storageRate: 35, detentionRate: 70,
        assessedOffset: -53, demandOffset: -52, releaseOffset: -50, deliveryOffset: -48, closeOffset: -45,
        lines: [
          line('0803.10.00', 480, 14, 5800, 'ET', 'Fresh bananas, export grade')
        ],
        docs: null,
        note: 'Closed. Perishable cleared within free time.'
      },
      {
        id: 'ENT-1023', clientId: 'CL-006', reference: 'MRG/IMP/842', mode: 'sea', status: 'closed',
        origin: 'China', port: 'Mombasa', facility: 'Kilindini Terminal', carrier: 'MSC', voyage: 'MSC Palak / 421W',
        documentRef: 'BL MSCU-4417720', container: 'MSKU 771 882-3', age: 86, etaOffset: -74, arrived: true,
        incoterm: 'CIF', procedure: 'Home use', currency: 'USD', fxRate: 1, freight: 2700, insurance: 360,
        serviceFee: 590, ownerId: 'usr_clerk', freeDays: 6, storageRate: 85, detentionRate: 150,
        assessedOffset: -69, demandOffset: -68, releaseOffset: -66, deliveryOffset: -63, closeOffset: -60,
        lines: [
          line('9403.60.00', 75, 88, 2500, 'CN', 'Dining tables and sideboards'),
          line('9401.30.00', 90, 41, 1200, 'CN', 'Office task chairs')
        ],
        docs: null,
        note: 'Closed. Client statement issued with month-end accounts.'
      }
    ];

    function makeDocs(entry) {
      const modeDoc = C.MODES[entry.mode].doc;
      const pref = entry.lines.some((l) => l.preferential);
      const permit = entry.lines.some((l) => {
        const t = C.tariffFor(l.hs);
        return t && t.permit;
      });
      const dangerous = entry.lines.some((l) => {
        const t = C.tariffFor(l.hs);
        return t && t.dangerous;
      });
      const insured = ['CIF', 'CIP'].indexOf(entry.incoterm) !== -1;
      const docs = {
        commercial_invoice: 'verified',
        packing_list: 'verified',
        declaration: 'verified',
        [modeDoc]: 'verified',
        certificate_of_origin: pref ? 'verified' : 'missing',
        insurance_certificate: insured ? 'verified' : 'missing',
        import_permit: permit ? 'verified' : 'missing',
        dangerous_goods: dangerous ? 'verified' : 'missing',
        weight_certificate: 'missing',
        bank_evidence: 'missing'
      };
      if (entry.status === 'intake') {
        docs.commercial_invoice = 'missing';
        docs.packing_list = 'missing';
        docs.declaration = 'missing';
        docs[modeDoc] = 'missing';
        if (pref) docs.certificate_of_origin = 'missing';
        if (insured) docs.insurance_certificate = 'missing';
        if (permit) docs.import_permit = 'missing';
        if (dangerous) docs.dangerous_goods = 'missing';
      } else if (entry.status === 'docs' && entry._docOverrides) {
        Object.assign(docs, entry._docOverrides);
      }
      return docs;
    }

    const entries = specs.map((spec, index) => {
      const createdAt = at(-spec.age, 8, 30 + (index % 4) * 5);
      const entry = {
        id: spec.id,
        clientId: spec.clientId,
        reference: spec.reference,
        mode: spec.mode,
        status: spec.status,
        origin: spec.origin,
        port: spec.port,
        facility: spec.facility || '',
        carrier: spec.carrier || '',
        voyage: spec.voyage || '',
        bl: spec.documentRef || '',
        container: spec.container || '',
        eta: C.addDays(today, spec.etaOffset),
        arrivalDate: spec.arrived ? C.addDays(today, spec.etaOffset) : '',
        incoterm: spec.incoterm,
        procedure: spec.procedure,
        currency: spec.currency,
        fxRate: spec.fxRate,
        freight: spec.freight,
        insurance: spec.insurance,
        serviceFee: spec.serviceFee,
        ownerId: spec.ownerId,
        freeDays: spec.freeDays,
        storageRate: spec.storageRate,
        detentionRate: spec.detentionRate,
        lines: spec.lines,
        notes: spec.note || '',
        createdAt: createdAt,
        updatedAt: nowStamp,
        timeline: [],
        _docOverrides: spec.docs || null
      };
      const serial = entry.id.replace(/\D/g, '');
      if (['lodged', 'query', 'assessed', 'duty', 'released', 'delivered', 'closed'].indexOf(entry.status) !== -1) {
        entry.declarationRef = 'MCD/2026/' + serial;
      }
      if (['released', 'delivered', 'closed'].indexOf(entry.status) !== -1) {
        entry.releaseRef = 'REL/2026/' + serial;
        entry.releasedTo = clientById[entry.clientId].contact;
        if (!entry.releasedAt) entry.releasedAt = at(spec.releaseOffset == null ? -1 : spec.releaseOffset, 14, 20);
      }
      entry.docs = makeDocs(entry);
      entry.priority = ['duty', 'query', 'docs'].indexOf(entry.status) !== -1 ? 'attention' : 'normal';

      if (['assessed', 'duty'].indexOf(entry.status) !== -1) {
        const assessedAt = at(spec.assessedOffset == null ? -2 : spec.assessedOffset, 11, 10);
        entry.assessment = {
          ref: spec.assessmentRef || ('ASM/2026/' + String(1740 + index)),
          date: C.isoDate(assessedAt),
          officer: index % 3 === 0 ? 'C. Mwende' : (index % 3 === 1 ? 'P. Mwangi' : 'J. Otieno'),
          amount: 0,
          note: spec.assessmentNote || ''
        };
      }
      if (['duty', 'released', 'delivered', 'closed'].indexOf(entry.status) !== -1) {
        const assessedAt = at(spec.assessedOffset == null ? -2 : spec.assessedOffset, 11, 10);
        entry.assessment = entry.assessment || {
          ref: spec.assessmentRef || ('ASM/2026/' + String(1740 + index)),
          date: C.isoDate(assessedAt),
          officer: 'C. Mwende',
          amount: 0,
          note: ''
        };
        entry.assessment.date = C.isoDate(assessedAt);
      }
      if (spec.query) entry.query = Object.assign({}, spec.query);
      if (spec.releaseOffset != null) {
        entry.releasedAt = at(spec.releaseOffset, 14, 20);
      }
      if (spec.delivery) {
        entry.delivery = Object.assign({}, spec.delivery, { date: spec.delivery.date || at(spec.deliveryOffset || -2, 11, 0) });
      } else if (['delivered', 'closed'].indexOf(entry.status) !== -1) {
        entry.delivery = {
          ref: 'POD-' + (8700 + index),
          recipient: clientById[entry.clientId].contact,
          date: at(spec.deliveryOffset == null ? -2 : spec.deliveryOffset, 11, 0)
        };
      }
      if (spec.closeOffset != null) entry.closedAt = at(spec.closeOffset, 16, 30);
      if (entry.releasedAt && ['released', 'delivered', 'closed'].indexOf(entry.status) !== -1) {
        entry.billedAt = entry.releasedAt;
      } else {
        entry.billedAt = createdAt;
      }
      return entry;
    });
    const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));

    // Compute assessment amounts once the freight and line detail exist.
    entries.forEach((entry) => {
      const calc = C.calculateEntry(entry);
      if (entry.assessment) entry.assessment.amount = calc.totals.taxes;
    });

    function statusMoment(entry, status, spec) {
      if (status === 'intake') return entry.createdAt;
      if (status === 'docs') return at(-Math.max(0, spec.age - 1), 10, 25);
      if (status === 'lodged') return at(spec.lodgeOffset == null ? (spec.assessedOffset != null ? spec.assessedOffset - 2 : -2) : spec.lodgeOffset, 13, 40);
      if (status === 'query') return at(spec.queryOffset == null ? -3 : spec.queryOffset, 10, 20);
      if (status === 'assessed') return at(spec.assessedOffset == null ? -2 : spec.assessedOffset, 11, 10);
      if (status === 'duty') return at(spec.demandOffset == null ? (spec.assessedOffset == null ? -2 : spec.assessedOffset) : spec.demandOffset, 15, 5);
      if (status === 'released') return at(spec.releaseOffset == null ? -1 : spec.releaseOffset, 14, 20);
      if (status === 'delivered') return at(spec.deliveryOffset == null ? -2 : spec.deliveryOffset, 11, 0);
      if (status === 'closed') return at(spec.closeOffset == null ? -3 : spec.closeOffset, 16, 30);
      return entry.createdAt;
    }

    const statusText = {
      intake: 'File opened. Supplier documents requested.',
      docs: 'Document checklist opened and verification started.',
      lodged: 'Declaration lodged with customs.',
      query: 'Customs query raised on the entry.',
      assessed: 'Customs assessment received.',
      duty: 'Duty demand prepared and issued to the client.',
      released: 'Customs release granted. Cargo cleared for collection.',
      delivered: 'Cargo delivered. Proof of delivery filed.',
      closed: 'File reconciled and closed.'
    };

    entries.forEach((entry, index) => {
      const spec = specs[index];
      const path = entry.status === 'query'
        ? ['intake', 'docs', 'lodged', 'query']
        : C.PIPELINE.slice(0, C.PIPELINE.indexOf(entry.status) + 1);
      const owner = users.find((u) => u.id === entry.ownerId) || users[0];
      const events = path.map((status, position) => {
        const timestamp = statusMoment(entry, status, spec);
        let text = statusText[status];
        if (status === 'query' && entry.query) text = 'Query ' + entry.query.ref + ' raised: ' + entry.query.text;
        if (status === 'assessed' && entry.assessment) text = 'Assessment ' + entry.assessment.ref + ' received from customs.';
        if (status === 'released' && entry.assessment) text = 'Customs release granted against assessment ' + entry.assessment.ref + '.';
        return {
          id: 'evt_' + entry.id + '_' + position,
          at: timestamp,
          status: status,
          by: owner.id,
          type: 'status',
          text: text
        };
      }).sort((a, b) => (a.at < b.at ? -1 : 1));
      entry.timeline = events;
      if (entry.delivery) {
        const deliveredEvent = entry.timeline.find((e) => e.status === 'delivered');
        if (deliveredEvent) deliveredEvent.text = 'Cargo delivered to ' + entry.delivery.recipient + ' under ' + entry.delivery.ref + '.';
      }
      if (spec.note && ['duty', 'query', 'docs', 'assessed'].indexOf(entry.status) !== -1) {
        entry.timeline.push({
          id: 'evt_' + entry.id + '_note',
          at: at(-0.2, 16, 10),
          status: entry.status,
          by: owner.id,
          type: 'note',
          text: spec.note
        });
      }
      entry.timeline.sort((a, b) => (a.at < b.at ? -1 : 1));
      entry.updatedAt = entry.timeline[entry.timeline.length - 1].at;
      entry.statusSince = entry.timeline[entry.timeline.length - 1].at;
    });

    const disbursements = [];
    const paymentsLog = [];

    function addDisb(entry, data) {
      const client = clientById[entry.clientId];
      const seq = disbSeq++;
      const payments = [];
      if (data.paidDate) {
        payments.push({
          id: 'pay_' + seq,
          date: data.paidDate,
          amount: data.paidAmount == null ? data.amount : data.paidAmount,
          method: data.method || 'Bank transfer',
          ref: data.receipt || ('RC-' + (8800 + seq))
        });
      } else if (data.partialAmount) {
        payments.push({
          id: 'pay_' + seq,
          date: data.partialDate || at(-2, 12, 30),
          amount: data.partialAmount,
          method: 'Bank transfer',
          ref: data.receipt || ('RC-' + (8800 + seq))
        });
      }
      const disb = {
        id: 'dsb_' + seq,
        ref: 'DIS-' + seq,
        entryId: entry.id,
        clientId: entry.clientId,
        type: data.type,
        description: data.description || (data.type + ' — ' + entry.id),
        amount: C.round(data.amount),
        incurredDate: data.incurredDate || C.isoDate(entry.assessment ? entry.assessment.date : entry.createdAt),
        dueDate: data.dueDate || C.addDays(data.incurredDate || today, client.terms),
        paidTo: data.paidTo || 'Supplier',
        receiptNo: data.receiptNo || '',
        billable: data.billable !== false,
        void: false,
        createdAt: at(-Math.max(1, Math.round((Date.now() - C.toDate(data.incurredDate || entry.createdAt).getTime()) / 86400000)), 12, 0),
        payments: payments,
        notes: data.notes || ''
      };
      disbursements.push(disb);
      payments.forEach((payment) => paymentsLog.push({ disb: disb, payment: payment }));
      return disb;
    }

    entries.forEach((entry) => {
      if (['duty', 'released', 'delivered', 'closed'].indexOf(entry.status) === -1) return;
      const calc = C.calculateEntry(entry);
      const client = clientById[entry.clientId];
      const assessedDate = entry.assessment.date;
      const paidDate = entry.releasedAt || null;
      const demand = addDisb(entry, {
        type: 'Duty & taxes',
        description: 'Customs duty, excise, VAT and levies — ' + entry.id,
        amount: calc.totals.taxes,
        incurredDate: assessedDate,
        dueDate: C.addDays(assessedDate, client.terms),
        paidTo: 'Kenya Revenue Authority',
        receiptNo: entry.status === 'duty' ? '' : ('KRA-' + entry.id.replace('ENT-', '')),
        paidDate: entry.status === 'duty' ? null : paidDate,
        paidAmount: entry.status === 'duty' ? null : calc.totals.taxes,
        partialAmount: entry.id === 'ENT-1032' ? C.round(calc.totals.taxes * 0.55) : 0,
        partialDate: entry.id === 'ENT-1032' ? at(-2, 12, 30) : null,
        receipt: entry.id === 'ENT-1032' ? 'RC-9012' : null,
        method: 'Bank transfer',
        notes: entry.status === 'duty' ? 'Balance remains outstanding; release is blocked.' : 'Settled before release.'
      });
      if (entry.status === 'duty') demand.notes = entry.id === 'ENT-1032' ? '55% received. Balance still outstanding.' : 'Demand issued. Release is blocked until settled.';
    });

    // Operational charges that live alongside duty.
    const operational = [
      { id: 'ENT-1039', type: 'Terminal handling', amount: 640, incurredOffset: -2, dueOffset: 26, description: 'Swissport cargo handling and cold-room fee', paidTo: 'Swissport Kenya', note: '' },
      { id: 'ENT-1042', type: 'Transport', amount: 480, incurredOffset: -1, dueOffset: 12, description: 'Airside transfer to Kestrel cold chain', paidTo: 'ColdLink Ltd', note: '' },
      { id: 'ENT-1032', type: 'Storage', amount: 1500, incurredOffset: -8, dueOffset: 8, description: 'Container storage beyond free time', paidTo: 'Kilindini Terminal', partialAmount: 500, partialDate: at(-3, 10, 0), note: 'Storage continues to accrue at $340 per day.' },
      { id: 'ENT-1034', type: 'Transport', amount: 1840, incurredOffset: -6, dueOffset: -6, description: 'Temperature-controlled delivery to Riverside', paidTo: 'ColdLink Ltd', note: 'Overdue. Client finance has been reminded twice.' },
      { id: 'ENT-1029', type: 'Documentation', amount: 420, incurredOffset: -18, dueOffset: -3, description: 'Certificate of conformity and agency documentation', paidTo: 'SGS Kenya', note: 'Documentation cost recovered late.' },
      { id: 'ENT-1038', type: 'Dangerous goods', amount: 350, incurredOffset: -1, dueOffset: 29, description: 'DG segregation survey and tank inspection', paidTo: 'Coastline Compliance', note: '' },
      { id: 'ENT-1041', type: 'Storage', amount: 1100, incurredOffset: -4, dueOffset: -2, description: 'Accrued port storage while valuation query open', paidTo: 'Kilindini Terminal', note: 'Recoverable from client subject to query outcome.' },
      { id: 'ENT-1037', type: 'Documentation', amount: 300, incurredOffset: -1, dueOffset: 44, description: 'Pre-shipment inspection certificate', paidTo: 'Bureau Veritas', note: '' },
      { id: 'ENT-1026', type: 'Documentation', amount: 420, incurredOffset: -25, dueOffset: -12, description: 'Cross-border documentation and courier', paidTo: 'Namanga clearing desk', note: 'Overdue and escalated.' },
      { id: 'ENT-1035', type: 'Terminal handling', amount: 1200, incurredOffset: -16, dueOffset: 14, description: 'Terminal handling and weighbridge', paidTo: 'Kilindini Terminal', paidDate: at(-12, 11, 30), note: '' },
      { id: 'ENT-1031', type: 'Transport', amount: 860, incurredOffset: -23, dueOffset: 7, description: 'Cold-chain airport transfer', paidTo: 'ColdLink Ltd', paidDate: at(-21, 9, 0), note: '' },
      { id: 'ENT-1025', type: 'Storage', amount: 750, incurredOffset: -31, dueOffset: 24, description: 'Storage and fumigation', paidTo: 'Kilindini Terminal', paidDate: at(-27, 14, 0), note: '' },
      { id: 'ENT-1024', type: 'Transport', amount: 320, incurredOffset: -49, dueOffset: 6, description: 'Perishable transfer to Naivasha', paidTo: 'FreshMove', paidDate: at(-47, 10, 0), note: '' },
      { id: 'ENT-1023', type: 'Terminal handling', amount: 1450, incurredOffset: -65, dueOffset: 21, description: 'Terminal handling and container cleaning', paidTo: 'Kilindini Terminal', paidDate: at(-61, 15, 0), note: '' },
      { id: 'ENT-1030', type: 'Terminal handling', amount: 980, incurredOffset: -2, dueOffset: 28, description: 'Nairobi ICD handling and rail transfer', paidTo: 'Nairobi ICD', note: '' }
    ];
    operational.forEach((item) => {
      const entry = entryById[item.id];
      if (!entry) return;
      addDisb(entry, {
        type: item.type,
        description: item.description,
        amount: item.amount,
        incurredDate: C.addDays(today, item.incurredOffset),
        dueDate: C.addDays(today, item.dueOffset),
        paidTo: item.paidTo,
        paidDate: item.paidDate || null,
        paidAmount: item.paidDate ? item.amount : null,
        partialAmount: item.partialAmount || 0,
        partialDate: item.partialDate || null,
        notes: item.note || ''
      });
    });

    // Global activity feed built from the actual entry timelines and payments.
    const activity = [];
    entries.forEach((entry) => {
      entry.timeline.forEach((event) => {
        if (event.type === 'note') return;
        const user = users.find((u) => u.id === event.by) || users[0];
        const client = clientById[entry.clientId];
        activity.push({
          id: 'act_' + (++activitySeq),
          at: event.at,
          userId: user.id,
          entryId: entry.id,
          clientId: entry.clientId,
          text: event.text,
          meta: entry.id + ' · ' + client.short
        });
      });
    });
    paymentsLog.forEach(({ disb, payment }) => {
      const entry = entryById[disb.entryId];
      const client = clientById[disb.clientId];
      activity.push({
        id: 'act_' + (++activitySeq),
        at: payment.date,
        userId: 'usr_manager',
        entryId: disb.entryId,
        clientId: disb.clientId,
        text: 'Payment of ' + C.money(payment.amount) + ' recorded for ' + disb.ref + '.',
        meta: entry.id + ' · ' + client.short
      });
    });
    activity.sort((a, b) => (a.at < b.at ? 1 : -1));

    return {
      schema: C.SCHEMA,
      createdAt: nowStamp,
      updatedAt: nowStamp,
      org: {
        name: 'Meridian Customs',
        legalName: 'Meridian Clearing & Forwarding Ltd',
        initials: 'MC',
        email: 'desk@meridian.co.ke',
        phone: '+254 41 220 1840',
        address: 'Moi Avenue, Mombasa',
        country: 'Kenya',
        baseCurrency: 'USD',
        taxAuthority: 'Kenya Revenue Authority',
        declarationPrefix: 'MCD',
        defaultFreeDays: 5,
        defaultStorageRate: 85,
        defaultDetentionRate: 150
      },
      users: users,
      clients: clients,
      entries: entries,
      disbursements: disbursements,
      activity: activity.slice(0, 40),
      counters: {
        entry: 1045,
        client: 9,
        disbursement: disbSeq,
        activity: activitySeq
      },
      settings: {
        defaultFreeDays: 5,
        defaultStorageRate: 85,
        defaultDetentionRate: 150,
        declarationPrefix: 'MCD',
        notifyOverdue: true,
        notifyDocs: true,
        lastBackup: null
      }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
