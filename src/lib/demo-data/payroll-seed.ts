/**
 * Seed data for the payroll module.
 *
 * These used to live inside the Zustand stores as hard-coded defaults. The
 * stores are now DB-backed caches, so the values live here instead and are
 * consumed by the seeding scripts (and by the legacy-id map below, which lets
 * the server actions round-trip `PayrollLineItem.item_id` slugs through the
 * `payroll_item_configs.code` column).
 */
import type { PayrollItemConfig } from '@/types';

// ---------------------------------------------------------------------------
// Payroll item master (급여 항목 기본 16종)
// ---------------------------------------------------------------------------

export const defaultPayrollItems: PayrollItemConfig[] = [
  // === Earnings ===
  { id: 'pi-base', name: '기본급', code: 'base_salary', category: 'earning', calc_type: 'fixed', is_taxable: true, is_active: true, rate_multiplier: null, formula_description: '근로계약 기본급', default_amount: 0, sort_order: 1 },
  { id: 'pi-meal', name: '식대', code: 'meal_allowance', category: 'earning', calc_type: 'fixed', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '비과세 식대 (월 20만원 한도)', default_amount: 200000, sort_order: 2 },
  { id: 'pi-transport', name: '교통비', code: 'transport_allowance', category: 'earning', calc_type: 'fixed', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '비과세 교통비 (월 20만원 한도)', default_amount: 200000, sort_order: 3 },
  { id: 'pi-position', name: '직책수당', code: 'position_allowance', category: 'earning', calc_type: 'fixed', is_taxable: true, is_active: true, rate_multiplier: null, formula_description: '직책에 따른 고정 수당', default_amount: 0, sort_order: 4 },
  { id: 'pi-overtime', name: '연장근로수당', code: 'overtime_pay', category: 'earning', calc_type: 'hours_rate', is_taxable: true, is_active: true, rate_multiplier: 1.5, formula_description: '통상시급 × 1.5 × 연장근로시간', default_amount: 0, sort_order: 5 },
  { id: 'pi-night', name: '야간근로수당', code: 'night_pay', category: 'earning', calc_type: 'hours_rate', is_taxable: true, is_active: true, rate_multiplier: 0.5, formula_description: '통상시급 × 0.5 × 야간근로시간', default_amount: 0, sort_order: 6 },
  { id: 'pi-holiday', name: '휴일근로수당', code: 'holiday_pay', category: 'earning', calc_type: 'hours_rate', is_taxable: true, is_active: true, rate_multiplier: 1.5, formula_description: '통상시급 × 1.5 × 휴일근로시간', default_amount: 0, sort_order: 7 },
  { id: 'pi-qualification', name: '자격수당', code: 'qualification_allowance', category: 'earning', calc_type: 'fixed', is_taxable: true, is_active: false, rate_multiplier: null, formula_description: '자격증 보유에 따른 수당', default_amount: 0, sort_order: 8 },
  { id: 'pi-family', name: '가족수당', code: 'family_allowance', category: 'earning', calc_type: 'fixed', is_taxable: true, is_active: false, rate_multiplier: null, formula_description: '부양가족에 따른 수당', default_amount: 0, sort_order: 9 },
  { id: 'pi-bonus', name: '상여금', code: 'bonus', category: 'earning', calc_type: 'fixed', is_taxable: true, is_active: false, rate_multiplier: null, formula_description: '성과 또는 정기 상여금', default_amount: 0, sort_order: 10 },

  // === Deductions (auto-calculated) ===
  { id: 'pi-pension', name: '국민연금', code: 'national_pension', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: 'min(과세소득, 상한액) × 요율', default_amount: 0, sort_order: 1 },
  { id: 'pi-health', name: '건강보험', code: 'health_insurance', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '과세소득 × 요율', default_amount: 0, sort_order: 2 },
  { id: 'pi-longterm', name: '장기요양보험', code: 'long_term_care', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '건강보험료 × 요율', default_amount: 0, sort_order: 3 },
  { id: 'pi-employment', name: '고용보험', code: 'employment_insurance', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '과세소득 × 요율', default_amount: 0, sort_order: 4 },
  { id: 'pi-incometax', name: '소득세', code: 'income_tax', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '간이세액표 기반 (연환산 → 세율적용 → 월할)', default_amount: 0, sort_order: 5 },
  { id: 'pi-localtax', name: '지방소득세', code: 'local_tax', category: 'deduction', calc_type: 'auto', is_taxable: false, is_active: true, rate_multiplier: null, formula_description: '소득세 × 10%', default_amount: 0, sort_order: 6 },
];

/**
 * Legacy client-side item ids keyed by item code.
 *
 * `PayrollLineItem.item_id` carries slugs such as `pi-pension` that several
 * screens still match on, while `payroll_details.payroll_item_id` is a UUID FK.
 * The server actions use this map to translate in both directions.
 */
export const PAYROLL_ITEM_LEGACY_IDS: Record<string, string> = Object.fromEntries(
  defaultPayrollItems.map((item) => [item.code, item.id]),
);


// ---------------------------------------------------------------------------
// Demo base salaries, keyed by the demo employee ids used by the seed script.
// ---------------------------------------------------------------------------

export const demoEmployeeSalaries: Record<string, number> = {
  // 대표이사실
  e001: 15000000, e002: 12000000, e003: 12000000,
  // 경영지원본부
  e004: 9000000,
  // 인사팀
  e010: 5000000, e011: 3800000, e012: 3200000, e032: 3700000, e033: 3000000,
  // 재무회계팀
  e013: 5000000, e014: 3800000, e034: 3600000, e035: 3000000,
  // 총무팀
  e015: 5000000, e036: 3500000, e037: 2900000,
  // 영업본부
  e016: 9000000,
  // 국내영업팀
  e017: 6000000, e018: 3800000, e038: 3700000, e039: 3100000, e040: 3000000,
  // 해외영업팀
  e019: 5000000, e020: 3200000, e041: 4800000, e042: 3700000, e043: 3800000, e044: 3100000,
  // 기술연구소
  e021: 9000000,
  // 연구개발팀
  e022: 6000000, e023: 3800000, e045: 4600000, e046: 3700000, e047: 3600000, e048: 3100000, e049: 2900000, e050: 2800000,
  // 스크러버사업부
  e024: 7000000, e051: 5500000, e052: 4500000, e053: 3700000, e054: 3600000, e055: 3100000, e056: 2900000,
  // BWTS사업부
  e025: 7000000, e057: 4800000, e058: 4400000, e059: 3700000, e060: 3500000, e061: 3100000, e062: 2900000,
  // 연료공급사업부
  e063: 5500000, e064: 4500000, e065: 3600000, e066: 3100000, e067: 2900000,
  // 계측제어사업부
  e068: 5500000, e069: 4400000, e070: 3600000, e071: 3100000, e072: 2900000,
  // 생산본부
  e026: 9000000,
  // 생산1팀
  e027: 5000000, e073: 4600000, e074: 3700000, e075: 3600000, e076: 3500000, e077: 3100000, e078: 3000000, e079: 2900000, e080: 2400000,
  // 생산2팀
  e028: 5000000, e081: 4500000, e082: 3700000, e083: 3600000, e084: 3100000, e085: 3000000, e086: 2900000, e087: 2400000,
  // 품질관리팀
  e029: 6000000, e088: 4500000, e089: 3700000, e090: 3100000, e091: 2900000,
  // 조달구매본부
  e092: 7000000, e093: 4800000, e094: 3600000, e095: 3000000,
  // 스마트서비스본부
  e096: 7000000, e097: 4800000, e098: 3700000, e099: 3100000, e100: 2800000,
  // HSE실
  e030: 7000000,
  // 안전팀
  e031: 5000000, e101: 3700000, e102: 3000000,
  // 공무팀
  e103: 5000000, e104: 3600000, e105: 2900000,
};
