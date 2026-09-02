'use client';

/**
 * System settings store — DB-backed client cache.
 *
 * Scalar sections and list collections are read from / written to the database
 * through settings-actions. The only piece that stays in the browser is
 * `display` (theme, font size, locale): those are per-user, per-device
 * preferences rather than company configuration.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import * as api from '@/lib/actions/settings-actions';
import type { SettingsEntityKind, SettingsSection } from '@/lib/actions/settings-actions';
import type {
  WorkSchedule,
  Holiday,
  ApprovalTemplate,
  CondolenceLeaveRule,
  Workplace,
  AttendanceTypeConfig,
  UserRole,
} from '@/types';
import type { Locale } from '@/lib/i18n/types';
import { defaultScreensForRole } from '@/lib/constants/menu-items';

// ---- Display & Print Template types ----

export interface DisplayState {
  font_size: 'small' | 'medium' | 'large';
  content_density: 'compact' | 'comfortable' | 'spacious';
  sidebar_compact: boolean;
  rows_per_page: number;
  date_format: 'yyyy-MM-dd' | 'yyyy.MM.dd' | 'yyyy년 MM월 dd일';
  number_format: 'comma' | 'plain';
  locale: Locale;
}

/** White-labelling: what the customer sees instead of the default HRMS look. */
export interface BrandingState {
  /** Product name shown in the sidebar, on the login screen and in the tab title. */
  app_name: string;
  /** Brand colour as hex; drives the primary/accent theme tokens. */
  primary_color: string;
  /** Sub-heading under the name on the login screen. */
  login_tagline: string;
  /** Bumped on every asset upload so cached images refresh. */
  logo_version: string;
  favicon_version: string;
  /** Print the uploaded logo on payslips and certificates. */
  use_logo_in_print: boolean;
}

export interface PrintTemplateState {
  header_title: string;
  company_name_visible: boolean;
  company_logo_text: string;
  show_department: boolean;
  show_position: boolean;
  show_dependents: boolean;
  show_formula: boolean;
  show_tax_badge: boolean;
  header_note: string;
  footer_note: string;
  page_size: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: 'normal' | 'narrow' | 'wide';
}

// ---- State shape ----

interface SettingsState {
  hydrated: boolean;

  company: {
    name: string;
    business_number: string;
    ceo_name: string;
    address: string;
    industry: string;
    phone: string;
    fax: string;
    website: string;
  };

  work: {
    default_start_time: string;
    default_end_time: string;
    lunch_break_minutes: number;
    weekly_hours: number;
    enforce_52h_rule: boolean;
    max_weekly_hours: number;
    overtime_limit_weekly: number;
    overtime_warning_hours: number;
    overtime_rate: number;
    night_rate: number;
    holiday_rate: number;
    holiday_overtime_rate: number;
    late_grace_minutes: number;
    flex_work_enabled: boolean;
    flex_start_min: string;
    flex_start_max: string;
    flex_end_min: string;
    flex_end_max: string;
    require_attachment_for_trip: boolean;
    allow_companion_request: boolean;
    birthday_early_per_child_hours: number;
    block_near_area_business_trip: boolean;
    overtime_requires_approval: boolean;
    enable_late_grace_by_request_type: boolean;
    allow_attendance_modification: boolean;
    modification_locked_after_close: boolean;
    enable_delegation_rules: boolean;
    overtime_self_approval_limit: number;
    business_trip_self_approval_limit: number;
    block_duplicate_attendance_request: boolean;
    weekly_52h_warning: boolean;
    weekly_max_hours: number;
    enable_workplace_specific_hours: boolean;
  };
  workSchedules: WorkSchedule[];

  leave: {
    auto_grant_annual: boolean;
    allow_half_day: boolean;
    allow_quarter_day: boolean;
    unused_leave_policy: 'carryover' | 'payout';
    carryover_limit: number;
    accrual_basis: 'hire_date' | 'fiscal_year';
    fiscal_year_start_month: number;
    allow_hourly_leave: boolean;
    hourly_leave_unit_minutes: number;
    enable_usage_plan: boolean;
    plan_submission_deadline_month: number;
    enable_unused_alert: boolean;
    first_alert_month: number;
    second_alert_month: number;
    first_alert_threshold: number;
    second_alert_threshold: number;
  };
  condolenceLeaveRules: CondolenceLeaveRule[];

  workplaces: Workplace[];

  payroll: {
    pay_day: number;
    national_pension_rate: number;
    health_insurance_rate: number;
    long_term_care_rate: number;
    employment_insurance_rate: number;
    meal_allowance_limit: number;
    transport_allowance_limit: number;
  };

  approvalTemplates: ApprovalTemplate[];

  evaluation: {
    self_weight: number;
    manager_weight: number;
    peer_weight: number;
    grade_s_ratio: number;
    grade_a_ratio: number;
    grade_b_ratio: number;
    grade_c_ratio: number;
    grade_d_ratio: number;
  };

  notifications: {
    approval_alert: boolean;
    leave_alert: boolean;
    birthday_alert: boolean;
    attendance_alert: boolean;
    payroll_alert: boolean;
  };

  security: {
    session_timeout_minutes: number;
    min_password_length: number;
    require_special_char: boolean;
    require_number: boolean;
  };

  holidays: Holiday[];
  holiday_auto_substitute: boolean;

  attendanceTypes: AttendanceTypeConfig[];

  display: DisplayState;

  printTemplate: PrintTemplateState;

  branding: BrandingState;

  menuPermissions: Record<UserRole, string[]>;
}

interface SettingsActions {
  hydrate: (data: api.SettingsModuleData) => void;
  reload: () => Promise<void>;

  updateCompany: (data: Partial<SettingsState['company']>) => void;

  updateWork: (data: Partial<SettingsState['work']>) => void;
  addWorkSchedule: (schedule: WorkSchedule) => void;
  updateWorkSchedule: (id: string, schedule: Partial<WorkSchedule>) => void;
  deleteWorkSchedule: (id: string) => void;
  setDefaultWorkSchedule: (id: string) => void;

  updateLeave: (data: Partial<SettingsState['leave']>) => void;
  addCondolenceRule: (rule: CondolenceLeaveRule) => void;
  updateCondolenceRule: (id: string, rule: Partial<CondolenceLeaveRule>) => void;
  deleteCondolenceRule: (id: string) => void;

  addWorkplace: (wp: Workplace) => void;
  updateWorkplace: (id: string, data: Partial<Workplace>) => void;
  deleteWorkplace: (id: string) => void;

  updatePayroll: (data: Partial<SettingsState['payroll']>) => void;

  addApprovalTemplate: (template: ApprovalTemplate) => void;
  updateApprovalTemplate: (id: string, template: Partial<ApprovalTemplate>) => void;
  deleteApprovalTemplate: (id: string) => void;

  updateEvaluation: (data: Partial<SettingsState['evaluation']>) => void;

  updateNotifications: (data: Partial<SettingsState['notifications']>) => void;

  updateSecurity: (data: Partial<SettingsState['security']>) => void;

  setHolidayAutoSubstitute: (value: boolean) => void;
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: string) => void;

  addAttendanceType: (type: AttendanceTypeConfig) => void;
  updateAttendanceType: (id: string, data: Partial<AttendanceTypeConfig>) => void;
  deleteAttendanceType: (id: string) => void;
  toggleAttendanceTypeActive: (id: string) => void;

  updateDisplay: (data: Partial<DisplayState>) => void;

  updatePrintTemplate: (data: Partial<PrintTemplateState>) => void;

  updateBranding: (data: Partial<BrandingState>) => void;

  updateMenuPermissions: (role: UserRole, hrefs: string[]) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

type CollectionKey =
  | 'workSchedules'
  | 'workplaces'
  | 'holidays'
  | 'attendanceTypes'
  | 'condolenceLeaveRules'
  | 'approvalTemplates';

const COLLECTION_KEY: Record<SettingsEntityKind, CollectionKey> = {
  workSchedule: 'workSchedules',
  workplace: 'workplaces',
  holiday: 'holidays',
  attendanceType: 'attendanceTypes',
  condolenceRule: 'condolenceLeaveRules',
  approvalTemplate: 'approvalTemplates',
};

interface HasId {
  id: string;
}

// ---- Neutral defaults (used before hydration / on a fresh install) ----

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => {
      const reload = async () => {
        const data = await api.fetchSettingsData();
        if (data) applyServerData(data);
      };

      const applyServerData = (data: api.SettingsModuleData) => {
        const s = data.sections;
        set((prev) => ({
          hydrated: true,
          company: { ...prev.company, ...(s.company ?? {}) },
          work: { ...prev.work, ...(s.work ?? {}) },
          leave: { ...prev.leave, ...(s.leave ?? {}) },
          payroll: { ...prev.payroll, ...(s.payroll ?? {}) },
          evaluation: { ...prev.evaluation, ...(s.evaluation ?? {}) },
          notifications: { ...prev.notifications, ...(s.notifications ?? {}) },
          security: { ...prev.security, ...(s.security ?? {}) },
          printTemplate: { ...prev.printTemplate, ...(s.printTemplate ?? {}) },
          branding: { ...prev.branding, ...(s.branding ?? {}) },
          menuPermissions: {
            ...prev.menuPermissions,
            ...((s.menuPermissions ?? {}) as Record<UserRole, string[]>),
          },
          holiday_auto_substitute:
            (s.misc?.holiday_auto_substitute as boolean | undefined) ?? prev.holiday_auto_substitute,
          workSchedules: data.workSchedules,
          workplaces: data.workplaces,
          holidays: data.holidays,
          attendanceTypes: data.attendanceTypes,
          condolenceLeaveRules: data.condolenceLeaveRules,
          approvalTemplates: data.approvalTemplates,
        }));
      };

      const failSync = (what: string) => {
        toast.error(`${what} 저장에 실패했습니다. 설정을 다시 불러옵니다.`);
        void reload();
      };

      /** Merge a partial into a scalar section and persist the whole section. */
      const patchSection = <K extends SettingsSection & keyof SettingsState>(
        section: K,
        data: Partial<SettingsState[K]>,
      ) => {
        set((s) => ({ [section]: { ...(s[section] as object), ...data } }) as Partial<SettingsState>);
        const merged = get()[section] as Record<string, unknown>;
        void api.saveSettingsSection(section, merged).then((ok) => {
          if (!ok) failSync('설정');
        });
      };

      const listOf = (key: CollectionKey): HasId[] => get()[key] as unknown as HasId[];
      const setList = (key: CollectionKey, items: HasId[]) =>
        set({ [key]: items } as unknown as Partial<SettingsState>);

      const syncCreate = (kind: SettingsEntityKind, item: HasId) => {
        const key = COLLECTION_KEY[kind];
        setList(key, [...listOf(key), item]);
        void api
          .createSettingsEntity(kind, item as unknown as Record<string, unknown>)
          .then((saved) => {
            if (saved) {
              setList(
                key,
                listOf(key).map((x) => (x.id === item.id ? (saved as unknown as HasId) : x)),
              );
            } else {
              failSync(kind);
            }
          });
      };

      const syncUpdate = (kind: SettingsEntityKind, id: string, patch: Record<string, unknown>) => {
        const key = COLLECTION_KEY[kind];
        setList(key, listOf(key).map((x) => (x.id === id ? { ...x, ...patch } : x)));
        void api.updateSettingsEntity(kind, id, patch).then((saved) => {
          if (saved) {
            setList(key, listOf(key).map((x) => (x.id === id ? (saved as unknown as HasId) : x)));
          } else {
            failSync(kind);
          }
        });
      };

      const syncDelete = (kind: SettingsEntityKind, id: string) => {
        const key = COLLECTION_KEY[kind];
        setList(key, listOf(key).filter((x) => x.id !== id));
        void api.deleteSettingsEntity(kind, id).then((ok) => {
          if (!ok) failSync(kind);
        });
      };

      return {
        // --- Initial state: neutral defaults until hydrated from the DB ---
        hydrated: false,

        company: {
          name: '대한오토텍(주)',
          business_number: '621-81-98896',
          ceo_name: '',
          address: '',
          industry: '',
          phone: '',
          fax: '',
          website: '',
        },
        work: {
          default_start_time: '09:00',
          default_end_time: '18:00',
          lunch_break_minutes: 60,
          weekly_hours: 40,
          enforce_52h_rule: true,
          max_weekly_hours: 52,
          overtime_limit_weekly: 12,
          overtime_warning_hours: 48,
          overtime_rate: 1.5,
          night_rate: 0.5,
          holiday_rate: 1.5,
          holiday_overtime_rate: 2.0,
          late_grace_minutes: 5,
          flex_work_enabled: true,
          flex_start_min: '08:00',
          flex_start_max: '10:00',
          flex_end_min: '17:00',
          flex_end_max: '19:00',
          require_attachment_for_trip: false,
          allow_companion_request: true,
          birthday_early_per_child_hours: 4,
          block_near_area_business_trip: false,
          overtime_requires_approval: true,
          enable_late_grace_by_request_type: false,
          allow_attendance_modification: true,
          modification_locked_after_close: true,
          enable_delegation_rules: true,
          overtime_self_approval_limit: 4,
          business_trip_self_approval_limit: 1,
          block_duplicate_attendance_request: true,
          weekly_52h_warning: true,
          weekly_max_hours: 52,
          enable_workplace_specific_hours: false,
        },
        workSchedules: [],
        leave: {
          auto_grant_annual: true,
          allow_half_day: true,
          allow_quarter_day: true,
          unused_leave_policy: 'carryover',
          carryover_limit: 5,
          accrual_basis: 'fiscal_year',
          fiscal_year_start_month: 1,
          allow_hourly_leave: false,
          hourly_leave_unit_minutes: 60,
          enable_usage_plan: true,
          plan_submission_deadline_month: 3,
          enable_unused_alert: true,
          first_alert_month: 7,
          second_alert_month: 10,
          first_alert_threshold: 5,
          second_alert_threshold: 3,
        },
        condolenceLeaveRules: [],
        workplaces: [],
        payroll: {
          pay_day: 25,
          national_pension_rate: 4.5,
          health_insurance_rate: 3.545,
          long_term_care_rate: 12.95,
          employment_insurance_rate: 0.9,
          meal_allowance_limit: 200000,
          transport_allowance_limit: 200000,
        },
        approvalTemplates: [],
        evaluation: {
          self_weight: 20,
          manager_weight: 60,
          peer_weight: 20,
          grade_s_ratio: 5,
          grade_a_ratio: 20,
          grade_b_ratio: 50,
          grade_c_ratio: 20,
          grade_d_ratio: 5,
        },
        notifications: {
          approval_alert: true,
          leave_alert: true,
          birthday_alert: true,
          attendance_alert: true,
          payroll_alert: true,
        },
        security: {
          session_timeout_minutes: 480,
          min_password_length: 8,
          require_special_char: true,
          require_number: true,
        },
        attendanceTypes: [],
        holidays: [],
        holiday_auto_substitute: true,
        display: {
          font_size: 'medium',
          content_density: 'comfortable',
          sidebar_compact: false,
          rows_per_page: 10,
          date_format: 'yyyy-MM-dd',
          number_format: 'comma',
          locale: 'en',
        },
        // 화면 단위 권한. 시스템관리자·인사담당자는 전부, 그 외에는
        // 마이페이지만이 기본입니다 — 필요한 화면은 메뉴권한에서 열어 줍니다.
        menuPermissions: {
          admin: defaultScreensForRole('admin'),
          hr_manager: defaultScreensForRole('hr_manager'),
          dept_manager: defaultScreensForRole('dept_manager'),
          employee: defaultScreensForRole('employee'),
        },
        branding: {
          app_name: 'HRMS',
          primary_color: '#4f46e5',
          login_tagline: '',
          logo_version: '',
          favicon_version: '',
          use_logo_in_print: true,
        },

        printTemplate: {
          header_title: '급여명세서',
          company_name_visible: true,
          company_logo_text: '',
          show_department: true,
          show_position: true,
          show_dependents: true,
          show_formula: true,
          show_tax_badge: true,
          header_note: '',
          footer_note: '본 명세서는 급여 지급 내역을 안내하기 위한 문서입니다.',
          page_size: 'A4',
          orientation: 'portrait',
          margin: 'normal',
        },

        // --- Actions ---
        hydrate: applyServerData,
        reload,

        updateCompany: (data) => patchSection('company', data),
        updateWork: (data) => patchSection('work', data),
        updateLeave: (data) => patchSection('leave', data),
        updatePayroll: (data) => patchSection('payroll', data),
        updateEvaluation: (data) => patchSection('evaluation', data),
        updateNotifications: (data) => patchSection('notifications', data),
        updateSecurity: (data) => patchSection('security', data),
        updatePrintTemplate: (data) => patchSection('printTemplate', data),
        updateBranding: (data) => patchSection('branding', data),

        updateMenuPermissions: (role, hrefs) => {
          set((s) => ({ menuPermissions: { ...s.menuPermissions, [role]: hrefs } }));
          void api
            .saveSettingsSection('menuPermissions', get().menuPermissions)
            .then((ok) => {
              if (!ok) failSync('메뉴 권한');
            });
        },

        setHolidayAutoSubstitute: (value) => {
          set({ holiday_auto_substitute: value });
          void api
            .saveSettingsSection('misc', { holiday_auto_substitute: value })
            .then((ok) => {
              if (!ok) failSync('공휴일 설정');
            });
        },

        // Display stays local — it is a per-device user preference.
        updateDisplay: (data) => set((s) => ({ display: { ...s.display, ...data } })),

        // --- Collections ---
        addWorkSchedule: (schedule) => syncCreate('workSchedule', schedule),
        updateWorkSchedule: (id, schedule) =>
          syncUpdate('workSchedule', id, schedule as Record<string, unknown>),
        deleteWorkSchedule: (id) => syncDelete('workSchedule', id),
        setDefaultWorkSchedule: (id) => {
          set((s) => ({
            workSchedules: s.workSchedules.map((w) => ({ ...w, is_default: w.id === id })),
          }));
          void api.setDefaultWorkSchedule(id).then((ok) => {
            if (!ok) failSync('기본 근무유형');
          });
        },

        addCondolenceRule: (rule) => syncCreate('condolenceRule', rule),
        updateCondolenceRule: (id, rule) =>
          syncUpdate('condolenceRule', id, rule as Record<string, unknown>),
        deleteCondolenceRule: (id) => syncDelete('condolenceRule', id),

        addWorkplace: (wp) => syncCreate('workplace', wp),
        updateWorkplace: (id, data) => syncUpdate('workplace', id, data as Record<string, unknown>),
        deleteWorkplace: (id) => syncDelete('workplace', id),

        addApprovalTemplate: (template) => syncCreate('approvalTemplate', template),
        updateApprovalTemplate: (id, template) =>
          syncUpdate('approvalTemplate', id, template as Record<string, unknown>),
        deleteApprovalTemplate: (id) => syncDelete('approvalTemplate', id),


        addHoliday: (holiday) => syncCreate('holiday', holiday),
        deleteHoliday: (id) => syncDelete('holiday', id),

        addAttendanceType: (type) => syncCreate('attendanceType', type),
        updateAttendanceType: (id, data) =>
          syncUpdate('attendanceType', id, data as Record<string, unknown>),
        deleteAttendanceType: (id) => syncDelete('attendanceType', id),
        toggleAttendanceTypeActive: (id) => {
          const current = get().attendanceTypes.find((t) => t.id === id);
          if (!current) return;
          syncUpdate('attendanceType', id, { is_active: !current.is_active });
        },
      };
    },
    {
      name: 'hrms-settings',
      version: 9,
      // Only per-device display preferences survive in the browser; all
      // company configuration now lives in the database.
      partialize: (state) => ({ display: state.display }) as unknown as SettingsStore,
      migrate: () => ({}) as never,
    },
  ),
);
