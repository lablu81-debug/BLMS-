import { LicenseEntry, UserAccount, PaymentLink, NotificationConfig } from '../types';
import { VEHICLE_SEED_DATA } from './vehicleSeedData';

export const INITIAL_COMPANIES = ['TAL', 'BGL', 'RHL', 'MISAMI', 'CORP'];

export const INITIAL_LICENSE_TYPES = [
  "Business License",
  "Trade License",
  "Factory License",
  "Boiler & Pressure Vessel",
  "Fire License",
  "Building & Structural Safety",
  "Environmental Clearance",
  "Import/Export License",
  "Labour License",
  "Tax Certificate",
  "VAT Registration",
  "BGMEA Membership",
  "Trade Association & Chamber Membership",
  "Utility & Energy",
  "Explosives & Chemicals",
  "Health & Food Safety",
  "Transport & Vehicle (BRTA)",
  "Land & Property",
  "Compliance & Certification",
  "Other"
];

export const INITIAL_LICENSE_NAMES: Record<string, string[]> = {
  "Business License": [
    "Company Registration",
    "RJSC Certificate",
    "Certificate of Incorporation (RJSC)",
    "Memorandum & Articles of Association (RJSC)",
    "Form XII — List of Directors (RJSC)",
    "Annual Return Filing Receipt (RJSC)",
    "Partnership Firm Registration (RJSC)",
    "BIDA (BOI) Registration Certificate",
    "Bangladesh Bank Foreign Investment Approval"
  ],
  "Trade License": [
    "City Corporation Trade License",
    "Municipality License",
    "Pourashava Trade License",
    "Union Parishad Trade License",
    "Cantonment Board Trade License",
    "Signboard / Advertisement License",
    "Professional / Occupation Tax Receipt"
  ],
  "Factory License": [
    "Factory Inspection Certificate",
    "DIFE Certificate",
    "Factory Registration Certificate (DIFE)",
    "Factory License Renewal (DIFE)",
    "Factory Layout Plan Approval (DIFE)",
    "Annual Factory Inspection Report (DIFE)",
    "Occupational Safety & Health Inspection Certificate"
  ],
  "Boiler & Pressure Vessel": [
    "Boiler License",
    "Boiler Registration & Fitness Certificate (Chief Inspector of Boilers)",
    "Boiler Operator Competency Certificate",
    "Steam Boiler Annual Inspection Certificate",
    "Pressure Vessel Inspection Certificate",
    "Compressor / Air Receiver Test Certificate"
  ],
  "Fire License": [
    "Fire Safety Certificate",
    "NOC from Fire Service",
    "Fire License (Fire Service & Civil Defence)",
    "Fire Safety Plan Approval (FSCD)",
    "Fire Fighting Equipment Inspection Certificate",
    "Fire Drill & Emergency Evacuation Certificate",
    "Fire Door / Fire Alarm System Test Certificate"
  ],
  "Building & Structural Safety": [
    "Building Plan Approval (RAJUK / CDA / KDA / RDA)",
    "Building Completion / Occupancy Certificate",
    "Structural Integrity Assessment Certificate (BUET / Accredited Engineer)",
    "Electrical Safety Inspection Certificate",
    "Lift / Elevator Inspection Certificate",
    "Lightning Protection / Earthing Test Certificate",
    "Building Use Permission"
  ],
  "Environmental Clearance": [
    "DoE Environmental Certificate",
    "ETP Certificate",
    "DoE Site Clearance Certificate",
    "DoE Environmental Clearance Certificate (ECC) Renewal",
    "Initial Environmental Examination (IEE) Approval",
    "Environmental Impact Assessment (EIA) Approval",
    "ETP Design / Operation Approval (DoE)",
    "Waste Management / Disposal Permit",
    "Air Emission & Effluent Test Report (DoE)"
  ],
  "Import/Export License": [
    "IRC",
    "ERC",
    "Import Registration Certificate (CCI&E)",
    "Export Registration Certificate (CCI&E)",
    "Bonded Warehouse License",
    "Special Bonded Warehouse License (NBR Customs)",
    "Utilization Declaration (UD) Registration (BGMEA / BKMEA)",
    "Utilization Permission (UP)",
    "Duty Drawback Registration (NBR)",
    "EPB Registration Certificate",
    "Back-to-Back L/C Authorization"
  ],
  "Labour License": [
    "Labour Compliance Certificate",
    "Social Audit Certificate",
    "Workers' Participation Committee (WPC) Formation Certificate",
    "Safety Committee Formation Certificate",
    "Group Insurance Policy (Bangladesh Labour Act)",
    "Workers' Welfare Foundation Registration",
    "Central Fund Contribution Certificate",
    "Employer Registration (DIFE / Dept. of Labour)",
    "Canteen & Day-Care Centre Permission",
    "Trade Union Registration (if applicable)"
  ],
  "Tax Certificate": [
    "TIN Certificate",
    "Tax Clearance Certificate",
    "e-TIN Registration Certificate (NBR)",
    "Income Tax Return Acknowledgement Receipt",
    "Tax Deduction at Source (TDS) Compliance Certificate",
    "Tax Residence Certificate"
  ],
  "VAT Registration": [
    "BIN Certificate",
    "VAT Registration Certificate",
    "Turnover Tax Registration",
    "VAT Return Submission Acknowledgement",
    "VAT Clearance Certificate"
  ],
  "BGMEA Membership": [
    "BGMEA Member Certificate",
    "BKMEA Certificate",
    "BGMEA Membership Renewal Certificate",
    "BGMEA Registration Card"
  ],
  "Trade Association & Chamber Membership": [
    "BTMA Membership Certificate",
    "DCCI Membership Certificate",
    "MCCI Membership Certificate",
    "FBCCI Membership Certificate",
    "BEPZA / BEZA Enlistment Certificate",
    "BSCIC Industrial Registration",
    "Certificate of Origin Registration (Chamber)"
  ],
  "Utility & Energy": [
    "Industrial Electricity Connection Approval (BREB / DESCO / DPDC / NESCO)",
    "Gas Connection Approval (Titas / Bakhrabad / Jalalabad / Karnaphuli)",
    "Captive Power Generation Permit (BERC)",
    "Generator Installation Approval",
    "Deep Tube Well / Groundwater Extraction Permit (WASA / BWDB)",
    "Rooftop Solar / Net Metering Approval (SREDA)",
    "Energy Audit Certificate (SREDA)"
  ],
  "Explosives & Chemicals": [
    "Petroleum Storage License (Dept. of Explosives)",
    "Explosives License (Dept. of Explosives)",
    "Gas Cylinder / LPG Storage License",
    "Hazardous Chemical Storage Permit",
    "Chemical Inventory & MSDS Compliance Certificate",
    "ZDHC MRSL Conformance Certificate"
  ],
  "Health & Food Safety": [
    "Medical Centre Registration (DGHS)",
    "Drug License (DGDA)",
    "Ambulance Registration & Fitness Certificate",
    "Canteen Food Safety License (BFSA)",
    "Drinking Water Quality Test Certificate",
    "Sanitary / Public Health Clearance"
  ],
  "Transport & Vehicle (BRTA)": [
    "Vehicle Registration Certificate (BRTA)",
    "Vehicle Fitness Certificate (BRTA)",
    "Route Permit (BRTA)",
    "Tax Token (BRTA)",
    "Driver Licence — Company Drivers (BRTA)",
    "Vehicle Insurance Policy"
  ],
  "Land & Property": [
    "Land Development Tax (Khajna) Receipt",
    "Land Mutation (Namjari) Certificate",
    "Holding Tax Receipt",
    "Land Use / Zoning Clearance",
    "Lease Agreement Registration",
    "Deed Registration Certificate",
    "Fire & Property Insurance Policy"
  ],
  "Compliance & Certification": [
    "RSC (RMG Sustainability Council) Compliance Certificate",
    "Accord / Alliance Transition Certificate",
    "BSCI Audit Certificate",
    "WRAP Certification",
    "SEDEX / SMETA Audit Report",
    "SA8000 Certification",
    "ISO 9001:2015 Certificate",
    "ISO 14001:2015 Certificate",
    "ISO 45001:2018 Certificate",
    "ISO 50001:2018 Certificate",
    "OEKO-TEX STANDARD 100",
    "GOTS Certificate",
    "GRS / RCS Certificate (Textile Exchange)",
    "Better Cotton Initiative (BCI) Membership",
    "LEED Certification (USGBC)",
    "Higg FEM Verification",
    "Sustainable Apparel Coalition (SAC) Membership"
  ],
  "Other": [
    "Other License / Permit"
  ]
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u1',
    name: 'Kaudore Ali',
    empId: 'BIT-0001',
    dept: 'HR, Admin & Sustainability',
    desig: 'Deputy General Manager',
    role: 'Administrator',
    units: 'All',
    loginId: 'admin'
  },
  {
    id: 'u2',
    name: 'Rahul (TAL)',
    empId: 'TAL-0142',
    dept: 'Compliance',
    desig: 'Compliance Executive',
    role: 'Operator / Contributor',
    units: ['TAL'],
    loginId: 'rahul.tal'
  },
  {
    id: 'u3',
    name: 'Nadia (BGL)',
    empId: 'BGL-0087',
    dept: 'Compliance',
    desig: 'Senior Manager',
    role: 'Verifier',
    units: 'All',
    loginId: 'nadia.bgl'
  },
  {
    id: 'u4',
    name: 'HR Head (RHL)',
    empId: 'RHL-0021',
    dept: 'Human Resources',
    desig: 'Head of HR',
    role: 'Viewer',
    units: ['RHL'],
    loginId: 'hr.rhl'
  },
  {
    id: 'u5',
    name: 'Management Viewer',
    empId: 'GRP-0005',
    dept: 'Management',
    desig: 'Director (Operations)',
    role: 'Viewer',
    units: ['TAL', 'BGL', 'RHL'],
    loginId: 'director'
  },
  {
    id: 'u6',
    name: 'Farhana (Multi-unit)',
    empId: 'GRP-0063',
    dept: 'Admin',
    desig: 'Assistant Manager',
    role: 'Operator / Contributor',
    units: ['TAL', 'BGL', 'RHL'],
    unitRoles: { BGL: 'Verifier', RHL: 'Viewer' },
    loginId: 'farhana'
  }
];

export const INITIAL_GENERAL_LICENSES: LicenseEntry[] = [
  {
    id: '2024_TAL_001',
    company: 'TAL',
    type: 'Trade License',
    name: 'City Corporation Trade License',
    year: '2024',
    number: 'CCC-2024-45123',
    from: '2024-01-01',
    till: '2026-12-31',
    status: 'Valid',
    category: 'Renewal',
    comments: 'Renewed on time with annual fee paid',
    action: 'Completed',
    feedback: 'Looks good. Keep digital copy in safe store.',
    reviewState: 'Closed',
    locked: true,
    thread: [
      {
        id: 'msg_001_1',
        at: Date.now() - 86400000 * 5,
        by: 'Nadia (BGL)',
        from: 'Reviewer',
        text: 'Please confirm annual fee payment receipt for DNCC trade license.'
      },
      {
        id: 'msg_001_2',
        at: Date.now() - 86400000 * 4,
        by: 'Kabir Ahmed (TAL)',
        from: 'Dept',
        text: 'Annual fee paid online via Sonali e-Sheba portal. Challan copy uploaded.'
      },
      {
        id: 'msg_001_3',
        at: Date.now() - 86400000 * 3,
        by: 'Nadia (BGL)',
        from: 'Reviewer',
        text: 'Looks good. Keep digital copy in safe store.'
      },
      {
        id: 'msg_001_4',
        at: Date.now() - 86400000 * 3,
        by: 'Nadia (BGL)',
        from: 'Reviewer',
        text: 'Approved and locked by Nadia (BGL)',
        system: true
      }
    ]
  },
  {
    id: '2023_BGL_001',
    company: 'BGL',
    type: 'Factory License',
    name: 'Factory Inspection Certificate',
    year: '2023',
    number: 'DIFE-2023-0892',
    from: '2023-06-01',
    till: '2026-06-30',
    status: 'Valid',
    category: 'Renewal',
    comments: 'Annual inspection done by DIFE inspector',
    action: 'Completed',
    feedback: 'DIFE inspector noted ventilation improvement required in sewing line A. Please provide compliance update.',
    reviewState: 'Awaiting Dept',
    thread: [
      {
        id: 'msg_002_1',
        at: Date.now() - 86400000 * 2,
        by: 'Nadia (BGL)',
        from: 'Reviewer',
        text: 'DIFE inspector noted ventilation improvement required in sewing line A. Please provide compliance update with engineering team sign-off.'
      }
    ]
  },
  {
    id: '2025_RHL_001',
    company: 'RHL',
    type: 'Fire License',
    name: 'Fire Safety Certificate',
    year: '2025',
    number: 'FSD-2025-1122',
    from: '2025-01-15',
    till: '2026-07-15',
    status: 'Valid',
    category: 'Renewal',
    comments: '',
    action: 'In Progress',
    feedback: 'Submit updated floor plan with clear emergency exits to Fire Service',
    reviewState: 'Awaiting Dept',
    thread: [
      {
        id: 'msg_003_1',
        at: Date.now() - 86400000 * 3,
        by: 'Kaudore Ali',
        from: 'Reviewer',
        text: 'Submit updated floor plan with clear emergency exits to Fire Service before scheduled inspection.'
      }
    ]
  },
  {
    id: '2025_MISAMI_001',
    company: 'MISAMI',
    type: 'Labour License',
    name: 'Labour Compliance Certificate',
    year: '2025',
    number: 'DIFE-LC-2025-009',
    from: '2025-01-01',
    till: '2026-07-20',
    status: 'Valid',
    category: 'Renewal',
    comments: '',
    action: 'In Progress',
    feedback: '',
    reviewState: undefined
  },
  {
    id: '2024_CORP_001',
    company: 'CORP',
    type: 'Tax Certificate',
    name: 'TIN Certificate',
    year: '2024',
    number: 'TIN-12345678',
    from: '2024-01-01',
    till: '2027-01-01',
    status: 'Valid',
    category: 'Renewal',
    comments: 'Permanent company tax registration',
    action: 'Completed',
    feedback: '',
    reviewState: undefined
  },
  {
    id: '2024_TAL_002',
    company: 'TAL',
    type: 'BGMEA Membership',
    name: 'BGMEA Member Certificate',
    year: '2024',
    number: 'BGMEA-2024-4567',
    from: '2024-07-01',
    till: '2026-06-30',
    status: 'Valid',
    category: 'Renewal',
    comments: 'Annual membership renewal fee pending invoice',
    action: 'In Progress',
    feedback: 'Contact BGMEA accounts desk for draft invoice',
    reviewState: 'Awaiting Reviewer',
    thread: [
      {
        id: 'msg_006_1',
        at: Date.now() - 86400000 * 4,
        by: 'Nadia (BGL)',
        from: 'Reviewer',
        text: 'Contact BGMEA accounts desk for draft invoice and deposit slip.'
      },
      {
        id: 'msg_006_2',
        at: Date.now() - 86400000 * 1,
        by: 'Kabir Ahmed (TAL)',
        from: 'Dept',
        text: 'Draft invoice received and submitted to accounts for payment voucher. Expected clearance within 3 business days.'
      }
    ]
  },
  {
    id: '2025_BGL_002',
    company: 'BGL',
    type: 'VAT Registration',
    name: 'BIN Certificate',
    year: '2025',
    number: 'BIN-003456781',
    from: '2025-01-01',
    till: '2028-01-01',
    status: 'Valid',
    category: 'Renewal',
    comments: 'Active 13-digit BIN Certificate issued by NBR',
    action: 'Completed',
    feedback: '',
    reviewState: undefined
  }
];

export const INITIAL_LICENSES: LicenseEntry[] = [
  ...INITIAL_GENERAL_LICENSES,
  ...VEHICLE_SEED_DATA
];

export const INITIAL_PAYMENT_LINKS: PaymentLink[] = [
  {
    id: 'p_rjsc',
    name: 'RJSC — Registrar of Joint Stock Companies',
    url: 'https://www.roc.gov.bd',
    desc: 'Company registration, annual return and RJSC fees',
    types: ['Business License']
  },
  {
    id: 'p_city',
    name: 'City Corporation — Trade License',
    url: 'https://dncc.gov.bd',
    desc: 'Trade license, signboard and professional tax (DNCC/DSCC/Gazipur)',
    types: ['Trade License']
  },
  {
    id: 'p_dife',
    name: 'DIFE — Dept. of Inspection for Factories & Establishments',
    url: 'https://dife.gov.bd',
    desc: 'Factory and labour/establishment license fees',
    types: ['Factory License', 'Labour License', 'Boiler & Pressure Vessel']
  },
  {
    id: 'p_fire',
    name: 'Fire Service & Civil Defence',
    url: 'https://fireservice.gov.bd',
    desc: 'Fire license and NOC renewal fees',
    types: ['Fire License']
  },
  {
    id: 'p_doe',
    name: 'DoE — Department of Environment',
    url: 'https://doe.gov.bd',
    desc: 'Environmental clearance certificate (ECC) fees & ETP permits',
    types: ['Environmental Clearance']
  },
  {
    id: 'p_ccie',
    name: 'CCI&E — Chief Controller of Imports & Exports',
    url: 'https://ccie.gov.bd',
    desc: 'Import/export registration (IRC / ERC) fees',
    types: ['Import/Export License']
  },
  {
    id: 'p_nbr',
    name: 'NBR — National Board of Revenue',
    url: 'https://nbr.gov.bd',
    desc: 'Income tax, TIN, VAT / BIN and customs payments',
    types: ['Tax Certificate', 'VAT Registration']
  },
  {
    id: 'p_brta',
    name: 'BRTA — Road Transport Authority',
    url: 'https://www.brta.gov.bd',
    desc: 'Vehicle fitness, route permit and tax token fees',
    types: ['Transport & Vehicle (BRTA)']
  }
];

export const DEFAULT_MENU_PERMS: Record<string, string[]> = {
  'Administrator': [
    'dashboard', 'entry', 'import', 'report', 'master_data', 'feedback', 
    'renewal_pay', 'kpi', 'notilog', 'payment', 'review', 'mr', 'notify', 'audit', 'user_governance'
  ],
  'Operator / Contributor': [
    'dashboard', 'entry', 'import', 'report', 'master_data', 'feedback', 
    'renewal_pay', 'kpi', 'notilog', 'payment'
  ],
  'Verifier': [
    'dashboard', 'review', 'report', 'master_data', 'feedback', 
    'renewal_pay', 'kpi', 'notilog', 'notify'
  ],
  'Viewer': [
    'dashboard', 'report', 'master_data', 'kpi'
  ]
};

export const INITIAL_NOTIFICATION_CONFIG: NotificationConfig = {
  email: true,
  whatsapp: true,
  autoEmail: true,
  dailyRunFrequency: '2x',
  runTimes: ['09:00', '15:00'],
  moreRunsIfNotices: true,
  autoExtraIntervalHours: 3,
  lastAutoRunAt: Date.now() - 7200000,
  autoRunCountToday: 2,
  lastAutoRunDate: new Date().toISOString().split('T')[0],
  stages: [60, 30, 15, 7],
  notifyExpired: true,
  repeatDays: 7,
  sendTime: '09:00',
  recipients: {
    ALL: {
      emails: ['kaudore@bitopibd.com', 'compliance@bitopibd.com'],
      phones: ['8801713000001']
    },
    TAL: {
      emails: ['tal.compliance@bitopibd.com'],
      phones: ['8801713000002']
    },
    BGL: {
      emails: ['bgl.admin@bitopibd.com'],
      phones: ['8801713000003']
    },
    RHL: {
      emails: ['rhl.hr@bitopibd.com'],
      phones: ['8801713000004']
    },
    MISAMI: {
      emails: ['misami.compliance@bitopibd.com'],
      phones: ['8801713000005']
    },
    CORP: {
      emails: ['corp.legal@bitopibd.com'],
      phones: ['8801713000006']
    }
  },
  emailSubject: '[BLMS] {unit}: {license} — {statusText}',
  emailBody: `Dear Team,

This is an automated reminder from the Bitopi Group Business Licenses Monitoring System (BLMS).

Unit: {unit}
License: {license} ({type})
License No.: {number}
Valid till: {till}
Status: {statusText}
Action required: {action}

Please take the necessary action and update the record in BLMS.

Regards,
BLMS — Bitopi Group`,
  waBody: `*BLMS alert — {unit}*
{license} ({number})
Valid till {till} — {statusText}.
Action: {action}`
};
