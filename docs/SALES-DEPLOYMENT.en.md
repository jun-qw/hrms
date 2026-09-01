# Sales and Delivery Guide

*[한국어](SALES-DEPLOYMENT.md) · English*

For sales staff and delivery engineers. Installation steps are in
[INSTALL.en.md](../INSTALL.en.md); running the system at the customer site is in
the [Administrator Manual](ADMIN-MANUAL.en.md).

---

## 1. What this product is, in one line

**A self-hosted HR system for small and mid-sized companies.** Installed on the
customer's own server (or a cloud account they own), it handles employee
records, attendance, leave, payroll and approvals in one place.
**HR data never leaves the customer's infrastructure** — that is the core sales
argument.

## 2. Who it fits

| Good fit | Poor fit |
|----------|----------|
| 20–500 employees | Fewer than 5 (a spreadsheet is enough) |
| Reluctant to send HR data to a cloud service | Group companies needing separate legal entities in one system |
| Calculates payroll in-house | Fully outsources payroll and needs no system |
| Currently manages attendance and leave in spreadsheets | Already runs a large ERP |
| Has a server or a cloud account | No IT staff and unwilling to buy support |

### Strengths against alternatives

- **Self-hosted** — the data stays on the customer's server. Decisive for buyers
  who reject cloud SaaS.
- **Full white-labelling** — logo, product name and brand colour are changed in
  the settings screen. No supplier branding remains in the product.
- **Bulk migration from Excel** — an existing HR spreadsheet, mapped to the
  template, loads the organisation and staff list in one pass.
- **Korean labour-law rules built in** — statutory annual leave, social insurance
  and income tax deductions, severance calculation.
- **Adjustable rates** — insurance rates and tax-free limits are editable in
  settings, so the system follows legal changes and can be used at overseas
  sites (Vietnam, for example).

### Limits to state honestly

Know these so nothing is over-promised during the sale.

- **Recruitment, training, evaluation, contracts, year-end tax settlement and the
  social-insurance screen are unfinished and hidden by default.** Tell the
  customer they are out of scope, and quote them separately if wanted. They can
  be switched on in Settings › Menu permissions, but the screens only display
  sample content.
- **Payroll tax is an approximation**, not the National Tax Service simplified
  tax table. Position it as producing the payroll register, and leave the actual
  filing on the customer's existing process.
- **Retirement income tax is a simplified calculation** and differs from the
  filed amount.
- **Single legal entity.** Fully separating multiple entities means separate
  installations.
- **HTTPS is the customer's responsibility** (reverse proxy).

## 3. Delivery models

### A. On-premises (default)

One server inside the customer's network. Works without internet access, so an
air-gapped network is fine.

### B. Customer's cloud

The same installation on an AWS or other cloud account in the customer's name.
Data ownership is unchanged.

> Both are installed with a single `docker compose up`. Budget about 30 minutes.

## 4. Server sizing

| Employees | CPU | Memory | Disk |
|-----------|-----|--------|------|
| up to 100 | 2 cores | 4 GB | 20 GB |
| up to 300 | 2 cores | 8 GB | 50 GB |
| up to 500 | 4 cores | 8 GB | 100 GB |

- OS: any Linux running Docker (Ubuntu 22.04 LTS recommended).
- Disk is driven by attached documents (contract PDFs and the like). Budgeting
  10 MB per employee per year is generous.
- No separate file server or object storage is needed — photos and documents are
  stored in the database.

## 5. Running the sale

### 5-1. Pre-sales checklist

Confirm these before contracting.

- [ ] Headcount and number of sites (and whether working hours differ per site)
- [ ] Where the server will live (on-premises / cloud / undecided)
- [ ] Whether they have IT staff; if not, a support contract is needed
- [ ] What their HR data looks like today (spreadsheets? which fields?)
- [ ] Whether payroll is calculated in-house or outsourced
- [ ] How attendance is collected (fingerprint reader, spreadsheet, paper)
- [ ] Which certificates they issue beyond employment, career and retirement
- [ ] Whether a domain and TLS certificate can be provided

### 5-2. Demonstration

A single laptop is enough. Demo data with 110 fictional employees is included.

```bash
npm install
npm run setup:demo     # loads the sample organisation as well
npm run build
npm run start:prod
```

Open `http://localhost:3000` and sign in as `admin@example.com` /
`ChangeMe123!`.

> Always demo with `start:prod`. The development server (`npm run dev`) uses
> roughly twenty times the memory and is slow to show the first screen.

**Suggested 15-minute flow**

1. **Branding** — upload the customer's logo and change the colour in
   Settings › Branding. "This looks like your system, not ours" sets the tone.
2. **Data migration** — show the Excel template under Employees › Data import.
   "Map the spreadsheet you already use, and it loads in a day."
3. **Personnel record card** — the print preview from an employee's detail page,
   with a photo and attached documents.
4. **Leave** — automatic statutory entitlement from the hire date, and balances.
5. **Payroll** — the calculation screen with insurance and tax deductions shown
   alongside the formula used.
6. **Permissions** — Settings › Menu permissions, changing what each role sees.

### 5-3. Put in the contract

- Licence scope (number of installations, headcount ceiling)
- Data ownership remains with the customer
- Warranty period and support terms
- That the unfinished modules (recruitment, training, evaluation, contracts,
  year-end tax, social insurance) are out of scope
- That payroll tax figures are for reference

## 6. Delivery plan

| Step | Work | Owner | Estimate |
|------|------|-------|----------|
| 1 | Prepare the server, install Docker | Customer IT / us | 0.5 day |
| 2 | Install and start ([INSTALL.en.md](../INSTALL.en.md)) | us | 0.5 day |
| 3 | Branding and company details | us + customer | 0.5 day |
| 4 | Customer prepares the HR spreadsheet | customer | 2–5 days |
| 5 | Upload and verify the data | us + customer | 0.5 day |
| 6 | Payroll rates and working-time rules | us + customer HR | 0.5 day |
| 7 | Issue accounts, set permissions | customer HR | 0.5 day |
| 8 | Administrator training ([manual](ADMIN-MANUAL.en.md)) | us | 0.5 day |
| 9 | Parallel run alongside the old spreadsheets | customer | 1 month |

Step 4 dominates the schedule. Send the template as soon as the contract is
signed.

## 7. Handover package

- [ ] URL and the initial administrator account
- [ ] Where the `.env` file is, and that it must be backed up (it holds the
      session secret)
- [ ] Backup and restore procedure ([INSTALL.en.md](../INSTALL.en.md) section 5)
- [ ] The [Administrator Manual](ADMIN-MANUAL.en.md)
- [ ] Support contact and response times

## 8. Support contract content

- **Tracking legal changes** — social-insurance rates change every year. The
  customer can edit them, but notifying and verifying the change is a service
  worth renewing for.
- **Public holidays** — registered per year; next year's need adding each January.
- Version upgrades, incident response, usage questions.

## 9. Common questions

**Does any data leave our network?**
No. It runs entirely on your server and works with the internet disconnected.

**Do employees log in themselves?**
Yes, and each role sees a different set of menus. An ordinary employee sees
their own record, attendance, leave requests and approvals.

**How do we move our existing data in?**
You get an Excel template. Fill in departments, ranks, titles and employees, and
upload it once.

**How do backups work?**
One command writes the whole database to a file, including photos and attached
documents.

**What if the server fails?**
With the backup file and this software, it restores onto another server as it was.

**Is there a user limit?**
Not in the software. It depends on the server.
