# Bitopi Group — Business Licenses Monitoring System (BLMS)

An enterprise-grade compliance monitoring, regulatory audit readiness, license lifecycle tracking, and automated expiry notification platform built for **Bitopi Group** manufacturing units.

---

## 🏢 Overview

The **Bitopi Group Business Licenses Monitoring System (BLMS)** provides end-to-end visibility, workflow collaboration, and governance across all industrial units:
- **TAL** — Tarasima Apparels Limited
- **BGL** — Bitopi Group Logistics & Corporate Operations
- **RHL** — Rimex Holdings Limited
- **MISAMI** — Misami Garments Limited
- **CORP** — Corporate Head Office Compliance

BLMS tracks all statutory government permits, factory inspection certificates, environmental clearances, vehicle road transport fitness, and municipal licenses with a real-time **RAG (Red-Amber-Green)** risk monitoring engine.

---

## 🚀 Key Modules & Architecture

### 1. 📊 Management Dashboard
- **Consolidated & Unit-wise Compliance**: Real-time summary metrics across units (Total, Valid, Expiring Soon, Expired, Factory Units).
- **Unit-wise Types of License Breakdown**: Comprehensive matrix cross-referencing classifications across units with interactive column filters and stacked distribution charts.
- **Vehicle Compliance**: Monitoring for factory transport fleets (BRTA tax token, route permit, fitness, vehicle models).

### 2. ⚡ Operations
- **New License Entry**: Intuitive form with auto-generated serial tracking, validity calculation, attachment handling (PDF / PNG / JPG), and BRTA vehicle attributes.
- **Import Excel / CSV**: Bulk upload parser with data validation, field mapping, and preview table.
- **Report Print**: Customizable export reports with multi-field filtering, summary stats, print previews, and instant download to **PDF** and **Excel (.xlsx)**.
- **Master Data**: Complete searchable database of all group licenses with inline documentation viewer.
- **Feedback**: Two-way structured communication loop between **Reviewer** (CHO Compliance) and **Operator / Contributor** (Factory HR/Compliance) with audit logging.
- **Renewal Payment**: Integrated Bangladesh government portal directory (BRTA, DIFE, DoE, NBR, RJSC, FSCD Fire Service) with fee estimation and challan tracking.
- **KPI Dashboard**:
  - **Operator / Contributor KPI**: On-time renewal rates, query response turnaround, document completeness %, and unit performance league table with immediate action queue.
  - **Viewer / Executive KPI**: Group audit readiness index, statutory life-safety exposure breakdown, unit risk heatmap, and CHO technical review lock rates.
  - **Target SLA Matrix**: Realized performance vs organizational compliance SLA targets.
- **Notification Log**: Complete dispatch history of automated and manual compliance notices.

### 3. 🔍 Reviewer
- **Review Tab**: Verification cockpit for compliance verifiers to audit records, query operators regarding expiring/expired licenses, approve compliance criteria, and lock records from unauthorized modification.

### 4. ⚙️ System Admin & Governance
- **Government Payment Portals**: Configuration of payment links, instructions, and government agency portals.
- **Process & RACI Matrix (MR)**: Compliance matrix governing input, verification, and oversight responsibilities across factories.
- **Notification Center**: Automated background scanner running scheduled multi-stage notices (60, 30, 15, 7 days before expiry) and repeat notifications for expired licenses via Email and WhatsApp formats.
- **Audit Log**: Immutable ledger recording all creations, edits, reviews, approvals, exports, and administrative configuration updates.
- **User Access & Role Governance**: Granular role-based access control (RBAC) supporting *Administrator*, *Verifier*, *Operator / Contributor*, and *Viewer* with unit-specific permission overrides.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6 / 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Export Engines**: [jsPDF](https://github.com/parallax/jsPDF), [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), [XLSX (SheetJS)](https://sheetjs.com/)

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18.x or newer)
- npm or bun

### Installation
```bash
# Clone the repository
git clone <your-repository-url>
cd <repository-folder>

# Install dependencies
npm install
```

### Development
```bash
# Start local dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
# Build optimized production bundle
npm run build

# Preview build locally
npm run preview
```

### Type Checking & Lint
```bash
npm run lint
```

---

## 👥 Default Demo Roles & Accounts

| Name | Role | Scope | Default Login |
| :--- | :--- | :--- | :--- |
| **Kaudore Ali** | Administrator (Deputy GM) | All Units | `admin` |
| **Rahul** | Operator / Contributor (Compliance Executive) | TAL | `rahul.tal` |
| **Nadia** | Verifier (Senior Manager CHO) | All Units | `nadia.bgl` |
| **HR Head** | Viewer (Executive Oversight) | RHL | `hr.rhl` |
| **Management Viewer** | Viewer (Director of Operations) | TAL, BGL, RHL | `director` |
| **Farhana** | Operator / Contributor (Multi-Unit Admin) | TAL, BGL, RHL | `farhana` |

*Default password for demo accounts:* `blms123`

---

## 📄 License & Confidentiality

Internal compliance monitoring software designed and configured for **Bitopi Group**. All rights reserved.
