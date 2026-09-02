# Administrator Manual

*[한국어](ADMIN-MANUAL.md) · English*

For the **HR staff and system administrators** who run the system at the
customer site. For installation see [INSTALL.en.md](../INSTALL.en.md).

> The interface ships in English and Korean; switch with the language control in
> the header. Some settings screens are still Korean-only, so this manual gives
> the Korean label in parentheses where that is what you will see.

---

## 1. Roles and permissions

| Role | Can do |
|------|--------|
| **System administrator** (admin) | Everything: branding, menu permissions, code management, data reset |
| **HR manager** (hr_manager) | Employees, attendance, leave, payroll, appointments. Limited system settings |
| **Department manager** (dept_manager) | Org chart, own department's staff, attendance and leave approval |
| **Employee** | Own record, attendance, leave requests, approvals |

Which menus each role sees is set in **Settings › Menu permissions (메뉴권한)**.
Keep Settings itself and the Audit log restricted to system administrators.

> Menus badged **준비중 (preview)** — recruitment, training, evaluation,
> contracts — are unfinished and hidden by default. Turning one on opens the
> screen, but it does not save anything. Do not use them for real work.

> Hiding a menu is not the security boundary. The server checks again on every
> request: payroll data, for example, returns only the caller's own records
> unless they are an HR role.

---

## 2. First week

### 2-1. Register the basics, in this order

1. **Settings › Branding (브랜딩)** — logo, product name, brand colour, favicon.
2. **Settings › Company info (회사정보)** — company name, business registration
   number, representative, address.
   → These print on certificates and payslips. Check for typos now.
3. **Settings › Workplaces (사업장)** — register each site if there is more than
   one. Working hours can differ per site.
4. **Settings › Work (근무설정)** — start and end times, weekly hours, overtime,
   night and holiday premiums, the late-arrival grace period.
5. **Settings › Leave (휴가설정)** — accrual basis (hire date or fiscal year),
   whether half and quarter days are allowed, carry-over policy.
6. **Settings › Payroll (급여설정)** — pay day.
7. **Settings › Payroll rates (급여 기준값)** — kept per year: social-insurance
   rates, tax-free allowance limits, the minimum wage, premium multipliers, and
   the **weekly holiday allowance (주휴수당) method**.
   → Practice differs from company to company. Check your own rules before
   choosing; the wrong choice means either paying twice or not paying at all.
   See under 3-2.
8. **Settings › Holidays (공휴일설정)** — confirm this year's public holidays.
   These need renewing each year.
   → Public holidays are paid days off, so they feed the weekly-holiday test and
   the holiday-work premium directly. Miss one and work on that day is costed as
   an ordinary weekday.

> **Always fill in the mobile number.** Attendance records carry no employee
> number — the mobile number is a required field there, and it is the only key
> that ties attendance to a person. Two people cannot share a number: the save
> is rejected, because there would be no way to tell whose attendance it is.

### 2-2. Load the staff data

**Employees › Data import (데이터 가져오기)** — system administrator only.

1. **Download the Excel template** — five sheets: company info, departments,
   ranks, titles, employees.
2. Fill them in.
   - **Departments**: keep the department code short and alphanumeric. Filling in
     a parent code builds the organisation hierarchy.
   - **Ranks / titles**: a lower level number is more junior (staff 1 → CEO 7).
   - **Employees**: employee number, name, email and hire date are required.
     Reference the department by its **code** and the rank and title by **name**.
   - Emails must be unique. They are what links an employee to a login account.
3. **Upload** — the file is validated and previewed before anything is saved.
   Fix the spreadsheet and re-upload if there are warnings.
4. **Run the import**.

> Re-uploading the same employee number updates that record. Corrected files can
> be uploaded again without creating duplicates.

### 2-3. Issue accounts

Employee accounts are created by the system administrator. When an employee's
email matches their login email, the two are linked automatically and the person
can see their own attendance and payslips.

### 2-4. Grant annual leave

**Leave › Balances › Bulk grant (일괄 부여)** calculates the statutory entitlement
from each hire date and grants it in one action.

If employees carry a balance over from a previous system, record it per person
under **manual adjustment (수동 조정)** with a reason. Adjustments are kept as a
history.

---

## 3. Every month

### 3-1. Record and close attendance

**Attendance › Bulk import (일괄 등록)** takes a whole table pasted from a
time clock or a spreadsheet; CSV and TSV files work too.

1. Paste the table. Columns are matched from the header row; correct them on
   screen if needed. Mobile number and date are required.
2. **확인하기 (Check)** classifies every line as new, updated, unchanged, or
   an error.
3. Save. Error lines are skipped, not the whole file.

> **People are matched by mobile number**, because attendance records carry no
> employee number. Anyone missing a number, or sharing one, is listed at the top
> of the screen. Fix those under **Employees** first — otherwise their
> attendance never lands, and for hourly staff that means zero base pay.

If there is no hours column, hours are derived from clock in/out, less the
statutory break (근로기준법 제54조: one hour over 8, thirty minutes over 4).
Switch that off if your device already deducts the break.

To fix a single person, use **Attendance › Register (근태대장)** and edit the
cell directly.

### 3-1. Close attendance

1. Open **Attendance › Month-end close (근태 마감)** for the month.
2. Resolve anything outstanding — missing clock-outs, absences.
3. **Close** locks that month against further edits.
4. If a correction is needed afterwards, **reopen**, edit, and close again. Both
   actions are recorded.

### 3-2. Run payroll

1. **Payroll › Calculate (급여 계산)**.
2. Choose the year and month, then **load the employees**.
3. Check base pay and allowances. Fixed per-person allowances registered under
   **Employees › employee detail › Payroll** are applied automatically.
4. Review the deductions — social insurance and income tax are shown with the
   formula used.
5. Save, then print payslips or let employees view their own.

> **Important**: income tax here is an approximation, not the National Tax
> Service simplified tax table. Verify the withholding figures you file through
> your existing process.

> **Fill in attendance first if you have hourly staff.** For them the hours
> worked *are* the base pay, so empty attendance pays zero. Step 2 warns about
> anyone with no records for the month.

#### Choosing the weekly holiday method (Settings › Payroll rates)

Korean law (근로기준법 제55조) requires at least one paid day off per week, but
leaves the payment mechanics to the employer.

| Method | Suits |
|--------|-------|
| **Included in monthly pay** | Salary-only companies. The 209-hour month already contains the weekly-holiday hours, so nothing extra is paid. |
| **Calculated** | Companies with hourly or daily staff. Attendance is read week by week; every week with full attendance on the scheduled days pays hourly rate × one day's hours. |
| **Fixed monthly amount** | Companies whose rules set a flat figure regardless of attendance. |

Supporting options — **which pay methods it applies to** (turning on monthly
salary risks paying twice), **minimum weekly scheduled hours** (the 15 hours of
제18조 제3항), **full attendance required** (시행령 제30조), and **pro-rate for
part-time staff**.

The payslip detail prints the formula alongside the amount, so you can show an
employee exactly where the figure came from.

The method lives inside the per-year rate set, so re-running an earlier month
recalculates it under the method that applied then.

### 3-3. Approve leave

**Leave › Pending approvals (승인 대기)**. Approving deducts the balance
automatically.

---

## 4. As needed

### Appointments (promotion, transfer)

**Appointments › New (발령 등록)**. Set the effective date; the change is kept as
history and reflected on the employee record.

### Certificates

**Employees › employee detail › Issue certificate (증명서 발급)** — employment,
career and retirement certificates. Company details and the logo are filled in
automatically. Print from the browser or save as PDF.

### Photos and documents

**Employee detail › Photos & documents (사진·서류)**

- **ID photo**: appears on the personnel record card and in employee lists
  (max 2 MB).
- **Attached documents**: employment contracts, ID copies, certificates and other
  originals as PDF (max 10 MB).

> Attached documents are readable only by HR and by the employee they belong to.
> No other employee can reach them.

### Retirement

**Employees › Retirement (퇴직 관리)** — enter the leaving date and reason and the
severance pay is calculated.

> Retirement income tax is a simplified calculation. Confirm it before filing.

### Reorganisation

Add and edit departments under **Settings › Departments (부서관리)**.
Deactivate departments that disappear rather than deleting them — historical
records still reference them.

---

## 5. Every year

| When | Task | Where |
|------|------|-------|
| Dec–Jan | Register next year's public holidays | Settings › Holidays |
| January | Check and update social-insurance rates and the minimum wage | Settings › Payroll rates |
| January | Create next year's rate set (starts as a copy of this year's) | Settings › Payroll rates › Create YYYY |
| January | Re-confirm the weekly holiday method still matches your rules | Settings › Payroll rates |
| January | Bulk-grant annual leave | Leave › Bulk grant |
| Through the year | Unused-leave reminders | Leave › Promotion alerts |

---

## 6. Backup

**This is the most important administrative task.** Employee records,
attendance, payroll, attached documents and the logo are all in the one
database, so a single command captures everything.

```bash
docker compose exec -T db pg_dump -U hrms hrms | gzip > hrms-$(date +%F).sql.gz
```

- Run it **at least weekly** and keep the file **somewhere other than the server**.
- Restore steps are in [INSTALL.en.md](../INSTALL.en.md) section 5.
- Always take a backup immediately before running payroll or a large import.

---

### Resident registration numbers

They are **stored encrypted** and shown masked (`900101-1******`), as the
Personal Information Protection Act (제24조의2) requires.

To see one in full, open **Employees › employee card** and use **전체 보기**
next to the number, giving a reason. The access is recorded in the audit log —
who, when, whose, and why — and the value re-hides after 30 seconds. Only the
system administrator and HR managers can do this; department managers cannot.

> **Back up the encryption key.** It is `RESIDENT_NUMBER_KEY` in
> `.env.local`. Lose it and the stored numbers cannot be recovered — a
> database backup alone is not enough.

### What each role can read

Roles change **the data itself**, not just which menus appear.

| Role | Sees |
|------|------|
| Admin · HR manager | Everything, for everyone |
| Dept. manager · Employee | Names, departments, ranks. Attendance, leave and pay for **themselves only** |

Pay, bank accounts, resident numbers, home addresses and personal contacts go
only to HR and the person themselves. The register screens are HR-only.

## 7. Security

- **Change the initial administrator password.** It is written in plain text in
  the `.env` file used at installation.
- Deactivate accounts as soon as someone leaves.
- Review **Settings › Menu permissions** periodically — confirm the payroll menu
  is not open to roles that do not need it.
- The **Audit log** records who viewed and changed what. Its retention period is
  set under Settings › Audit log.
- If the system is reachable from outside, **serve it over HTTPS** behind a
  reverse proxy.

---

## 8. When something goes wrong

| Symptom | What to check |
|---------|---------------|
| Cannot sign in | Whether the account is deactivated, or a mistyped password |
| Screens load but are empty | `curl http://<address>/api/health` → the `database` field, then the app log |
| A menu is missing | Whether that path is granted to the role in Settings › Menu permissions |
| An employee cannot see their payslip | Whether their employee email matches their login email |
| Excel import fails | The validation warnings — department codes and rank names must exist in the sheets |
| Leave days look wrong | The accrual basis (hire date / fiscal year) in Settings › Leave |
| The service is down | `docker compose ps`, `docker compose logs -f app` |

If that does not resolve it, collect the following and send it to your supplier.

```bash
docker compose logs --tail 200 app > app.log
docker compose ps > status.txt
curl -s http://localhost:3000/api/health > health.json
```

---

## 9. Resetting all data

**Employees › Data import › Reset all data (전체 데이터 초기화)** — system
administrator only.

Employees, organisation, attendance, leave, payroll and approvals are **all
deleted**. Accounts and system settings are kept. This cannot be undone: take a
backup first, and use it only to clear trial data during onboarding.
