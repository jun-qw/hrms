/**
 * Client-side Excel helpers for the initial-onboarding template:
 * one workbook with 회사정보 / 부서 / 직급 / 직책 / 사원 sheets.
 */
import ExcelJS from 'exceljs';
import type {
  InitialImportPayload,
  ImportDepartmentRow,
  ImportLevelRow,
  ImportEmployeeRow,
} from '@/lib/actions/data-import-actions';

export const SHEETS = {
  company: '회사정보',
  departments: '부서',
  ranks: '직급',
  titles: '직책',
  employees: '사원',
} as const;

const COMPANY_FIELDS: Array<[key: string, label: string, example: string]> = [
  ['name', '회사명', '(주)에이컴퍼니'],
  ['business_number', '사업자등록번호', '123-45-67890'],
  ['ceo_name', '대표자', '홍길동'],
  ['address', '주소', '서울특별시 강남구 테헤란로 1'],
  ['industry', '업종', '소프트웨어 개발'],
  ['phone', '전화번호', '02-000-0000'],
  ['fax', '팩스', ''],
  ['website', '웹사이트', 'www.example.com'],
];

const EMPLOYMENT_TYPE_MAP: Record<string, ImportEmployeeRow['employment_type']> = {
  정규직: 'regular',
  regular: 'regular',
  계약직: 'contract',
  contract: 'contract',
  파트타임: 'parttime',
  시간제: 'parttime',
  parttime: 'parttime',
  인턴: 'intern',
  intern: 'intern',
};

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

export async function buildTemplate(): Promise<Blob> {
  const wb = new ExcelJS.Workbook();

  const company = wb.addWorksheet(SHEETS.company);
  company.columns = [
    { header: '항목', key: 'label', width: 18 },
    { header: '값', key: 'value', width: 40 },
  ];
  for (const [, label, example] of COMPANY_FIELDS) {
    company.addRow({ label, value: example });
  }

  const dept = wb.addWorksheet(SHEETS.departments);
  dept.columns = [
    { header: '부서코드*', key: 'code', width: 14 },
    { header: '부서명*', key: 'name', width: 20 },
    { header: '상위부서코드', key: 'parent', width: 14 },
    { header: '정렬순서', key: 'sort', width: 10 },
  ];
  dept.addRow({ code: 'HQ', name: '경영지원본부', parent: '', sort: 1 });
  dept.addRow({ code: 'HR', name: '인사팀', parent: 'HQ', sort: 2 });
  dept.addRow({ code: 'DEV', name: '개발팀', parent: '', sort: 3 });

  const ranks = wb.addWorksheet(SHEETS.ranks);
  ranks.columns = [
    { header: '직급명*', key: 'name', width: 14 },
    { header: '레벨*', key: 'level', width: 8 },
  ];
  [['사원', 1], ['대리', 2], ['과장', 3], ['차장', 4], ['부장', 5], ['이사', 6], ['대표이사', 7]].forEach(
    ([name, level]) => ranks.addRow({ name, level }),
  );

  const titles = wb.addWorksheet(SHEETS.titles);
  titles.columns = [
    { header: '직책명*', key: 'name', width: 14 },
    { header: '레벨*', key: 'level', width: 8 },
  ];
  [['팀원', 1], ['파트장', 2], ['팀장', 3], ['본부장', 4], ['대표이사', 5]].forEach(([name, level]) =>
    titles.addRow({ name, level }),
  );

  const emp = wb.addWorksheet(SHEETS.employees);
  emp.columns = [
    { header: '사번*', key: 'number', width: 12 },
    { header: '이름*', key: 'name', width: 12 },
    { header: '이메일*', key: 'email', width: 26 },
    { header: '입사일*(YYYY-MM-DD)', key: 'hire', width: 20 },
    { header: '부서코드', key: 'dept', width: 10 },
    { header: '직급명', key: 'rank', width: 10 },
    { header: '직책명', key: 'title', width: 10 },
    { header: '고용형태(정규직/계약직/파트타임/인턴)', key: 'type', width: 30 },
    { header: '영문이름', key: 'nameEn', width: 14 },
    { header: '전화번호', key: 'phone', width: 15 },
    { header: '생년월일(YYYY-MM-DD)', key: 'birth', width: 20 },
    { header: '성별(남/여)', key: 'gender', width: 10 },
    { header: '기본급', key: 'salary', width: 12 },
    { header: '주소', key: 'address', width: 30 },
    { header: '우편번호', key: 'zip', width: 10 },
    { header: '은행명', key: 'bank', width: 10 },
    { header: '계좌번호', key: 'account', width: 18 },
  ];
  emp.addRow({
    number: 'EMP-001',
    name: '홍길동',
    email: 'hong@example.com',
    hire: '2024-01-02',
    dept: 'HR',
    rank: '과장',
    title: '팀장',
    type: '정규직',
    gender: '남',
    salary: 4000000,
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParsedWorkbook {
  payload: InitialImportPayload;
  errors: string[];
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join('').trim();
    }
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    return '';
  }
  return String(value).trim();
}

function rowValues(row: ExcelJS.Row, count: number): string[] {
  const out: string[] = [];
  for (let c = 1; c <= count; c++) out.push(cellText(row.getCell(c).value));
  return out;
}

export async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedWorkbook> {
  const errors: string[] = [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // --- 회사정보 ---
  const company: Record<string, string> = {};
  const companySheet = wb.getWorksheet(SHEETS.company);
  if (companySheet) {
    const labelToKey = new Map(COMPANY_FIELDS.map(([key, label]) => [label, key]));
    companySheet.eachRow((row, n) => {
      if (n === 1) return;
      const [label, value] = rowValues(row, 2);
      const key = labelToKey.get(label);
      if (key && value) company[key] = value;
    });
  }

  // --- 부서 ---
  const departments: ImportDepartmentRow[] = [];
  const deptSheet = wb.getWorksheet(SHEETS.departments);
  if (deptSheet) {
    deptSheet.eachRow((row, n) => {
      if (n === 1) return;
      const [code, name, parent, sort] = rowValues(row, 4);
      if (!code && !name) return;
      if (!code || !name) {
        errors.push(`[부서] ${n}행: 부서코드와 부서명은 필수입니다.`);
        return;
      }
      departments.push({
        code,
        name,
        parent_code: parent || null,
        sort_order: sort ? Number(sort) : null,
      });
    });
    const codes = new Set(departments.map((d) => d.code));
    for (const d of departments) {
      if (d.parent_code && !codes.has(d.parent_code)) {
        errors.push(`[부서] '${d.name}': 상위부서코드 '${d.parent_code}'가 부서 시트에 없습니다.`);
      }
    }
  }

  // --- 직급 / 직책 ---
  const parseLevels = (sheetName: string, label: string): ImportLevelRow[] => {
    const rows: ImportLevelRow[] = [];
    const sheet = wb.getWorksheet(sheetName);
    if (!sheet) return rows;
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      const [name, level] = rowValues(row, 2);
      if (!name) return;
      const lv = Number(level);
      if (!Number.isFinite(lv)) {
        errors.push(`[${label}] ${n}행 '${name}': 레벨은 숫자여야 합니다.`);
        return;
      }
      rows.push({ name, level: lv });
    });
    return rows;
  };
  const ranks = parseLevels(SHEETS.ranks, '직급');
  const titles = parseLevels(SHEETS.titles, '직책');

  // --- 사원 ---
  const employees: ImportEmployeeRow[] = [];
  const empSheet = wb.getWorksheet(SHEETS.employees);
  if (empSheet) {
    const seen = new Set<string>();
    empSheet.eachRow((row, n) => {
      if (n === 1) return;
      const v = rowValues(row, 17);
      const [number, name, email, hire, dept, rank, title, type, nameEn, phone, birth, gender, salary, address, zip, bank, account] = v;
      if (!number && !name && !email) return;
      if (!number || !name || !email || !hire) {
        errors.push(`[사원] ${n}행: 사번·이름·이메일·입사일은 필수입니다.`);
        return;
      }
      if (seen.has(number)) {
        errors.push(`[사원] ${n}행: 사번 '${number}' 중복`);
        return;
      }
      seen.add(number);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(hire)) {
        errors.push(`[사원] ${n}행 '${name}': 입사일 형식은 YYYY-MM-DD 입니다. (입력값: ${hire})`);
        return;
      }
      const empType = type ? EMPLOYMENT_TYPE_MAP[type.toLowerCase()] ?? EMPLOYMENT_TYPE_MAP[type] : 'regular';
      if (type && !empType) {
        errors.push(`[사원] ${n}행 '${name}': 고용형태 '${type}' 인식 불가`);
      }
      const g = gender === '남' || gender === '남자' || gender.toUpperCase() === 'M' ? 'M'
        : gender === '여' || gender === '여자' || gender.toUpperCase() === 'F' ? 'F'
        : null;
      employees.push({
        employee_number: number,
        name,
        email,
        hire_date: hire,
        department_code: dept || null,
        rank_name: rank || null,
        title_name: title || null,
        employment_type: empType ?? 'regular',
        name_en: nameEn || null,
        phone: phone || null,
        birth_date: birth || null,
        gender: g,
        base_salary: salary ? Number(String(salary).replace(/,/g, '')) : null,
        address: address || null,
        zip_code: zip || null,
        bank_name: bank || null,
        bank_account: account || null,
      });
    });
  }

  return {
    payload: { company, departments, ranks, titles, employees },
    errors,
  };
}
