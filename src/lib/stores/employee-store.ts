'use client';

/**
 * Employees module store — a client-side cache of the database.
 *
 * Data flows:
 *  - EmployeeDataProvider calls fetchEmployeeData() once per session and
 *    hydrates this store.
 *  - Every mutation applies optimistically to the local state, then calls the
 *    matching server action; on failure it re-syncs from the DB and toasts.
 *
 * The public API is unchanged from the localStorage era so the ~35 consumer
 * components keep working untouched.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/employee-actions';
import type { EntityKind } from '@/lib/actions/employee-actions';
import type {
  Department,
  PositionRank,
  PositionTitle,
  Employee,
  CareerHistory,
  EducationHistory,
  Certification,
  FamilyMember,
  EmployeeStatus,
  JobCategory,
  SalaryGrade,
} from '@/types';

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface EmployeeState {
  hydrated: boolean;
  departments: Department[];
  positionRanks: PositionRank[];
  positionTitles: PositionTitle[];
  employees: Employee[];
  careerHistories: CareerHistory[];
  educationHistories: EducationHistory[];
  certifications: Certification[];
  familyMembers: FamilyMember[];
  jobCategories: JobCategory[];
  salaryGrades: SalaryGrade[];
}

interface EmployeeActions {
  hydrate: (data: api.EmployeeModuleData) => void;
  reload: () => Promise<void>;

  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addDepartment: (department: Department) => void;
  updateDepartment: (id: string, data: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  addPositionRank: (rank: PositionRank) => void;
  updatePositionRank: (id: string, data: Partial<PositionRank>) => void;
  deletePositionRank: (id: string) => void;

  addPositionTitle: (title: PositionTitle) => void;
  updatePositionTitle: (id: string, data: Partial<PositionTitle>) => void;
  deletePositionTitle: (id: string) => void;

  addJobCategory: (category: JobCategory) => void;
  updateJobCategory: (id: string, data: Partial<JobCategory>) => void;
  deleteJobCategory: (id: string) => void;

  addSalaryGrade: (grade: SalaryGrade) => void;
  updateSalaryGrade: (id: string, data: Partial<SalaryGrade>) => void;
  deleteSalaryGrade: (id: string) => void;

  addCareerHistory: (item: CareerHistory) => void;
  updateCareerHistory: (id: string, data: Partial<CareerHistory>) => void;
  deleteCareerHistory: (id: string) => void;

  addEducationHistory: (item: EducationHistory) => void;
  updateEducationHistory: (id: string, data: Partial<EducationHistory>) => void;
  deleteEducationHistory: (id: string) => void;

  addCertification: (item: Certification) => void;
  updateCertification: (id: string, data: Partial<Certification>) => void;
  deleteCertification: (id: string) => void;

  addFamilyMember: (item: FamilyMember) => void;
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => void;
  deleteFamilyMember: (id: string) => void;
}

interface EmployeeGetters {
  getEmployeeById: (id: string) => Employee | undefined;
  getActiveEmployees: () => Employee[];
  getEmployeesByDepartment: (deptId: string) => Employee[];
  getDepartmentById: (id: string) => Department | undefined;
  getPositionRankById: (id: string) => PositionRank | undefined;
  getPositionTitleById: (id: string) => PositionTitle | undefined;
  getCareerByEmployee: (empId: string) => CareerHistory[];
  getEducationByEmployee: (empId: string) => EducationHistory[];
  getCertsByEmployee: (empId: string) => Certification[];
  getFamilyByEmployee: (empId: string) => FamilyMember[];
}

export type EmployeeStore = EmployeeState & EmployeeActions & EmployeeGetters;

type EntityListKey =
  | 'departments'
  | 'positionRanks'
  | 'positionTitles'
  | 'jobCategories'
  | 'salaryGrades'
  | 'careerHistories'
  | 'educationHistories'
  | 'certifications'
  | 'familyMembers';

const LIST_KEY: Record<EntityKind, EntityListKey> = {
  department: 'departments',
  positionRank: 'positionRanks',
  positionTitle: 'positionTitles',
  jobCategory: 'jobCategories',
  salaryGrade: 'salaryGrades',
  careerHistory: 'careerHistories',
  educationHistory: 'educationHistories',
  certification: 'certifications',
  familyMember: 'familyMembers',
};

interface HasId {
  id: string;
}

// ---------------------------------------------------------------------------
// Hydration helper — resolves FK IDs to nested objects
// ---------------------------------------------------------------------------

function hydrateEmployee(
  e: Employee,
  departments: Department[],
  ranks: PositionRank[],
  titles: PositionTitle[],
): Employee {
  return {
    ...e,
    department: departments.find((d) => d.id === e.department_id),
    position_rank: ranks.find((r) => r.id === e.position_rank_id),
    position_title: titles.find((t) => t.id === e.position_title_id),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEmployeeStore = create<EmployeeStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchEmployeeData();
    if (data) set({ ...data, hydrated: true });
  };

  const failSync = (what: string) => {
    toast.error(`${what} 저장에 실패했습니다. 데이터를 다시 불러옵니다.`);
    void reload();
  };

  const listOf = (key: EntityListKey): HasId[] => get()[key] as unknown as HasId[];

  const setList = (key: EntityListKey, items: HasId[]) =>
    set({ [key]: items } as unknown as Partial<EmployeeState>);

  const syncCreate = (kind: EntityKind, item: HasId) => {
    const key = LIST_KEY[kind];
    setList(key, [...listOf(key), item]);
    void api.createEntity(kind, item as unknown as Record<string, unknown>).then((saved) => {
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

  const syncUpdate = (kind: EntityKind, id: string, patch: Record<string, unknown>) => {
    const key = LIST_KEY[kind];
    setList(key, listOf(key).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    void api.updateEntity(kind, id, patch).then((saved) => {
      if (saved) {
        setList(key, listOf(key).map((x) => (x.id === id ? (saved as unknown as HasId) : x)));
      } else {
        failSync(kind);
      }
    });
  };

  const syncDelete = (kind: EntityKind, id: string) => {
    const key = LIST_KEY[kind];
    setList(key, listOf(key).filter((x) => x.id !== id));
    void api.deleteEntity(kind, id).then((ok) => {
      if (!ok) failSync(kind);
    });
  };

  /** Org entities are never hard-deleted — they are deactivated. */
  const syncDeactivate = (kind: EntityKind, id: string) => {
    syncUpdate(kind, id, {
      is_active: false,
      effective_to: new Date().toISOString().split('T')[0],
    });
  };

  return {
    // --- Initial state (empty until hydrated from the DB) ---
    hydrated: false,
    departments: [],
    positionRanks: [],
    positionTitles: [],
    employees: [],
    careerHistories: [],
    educationHistories: [],
    certifications: [],
    familyMembers: [],
    jobCategories: [],
    salaryGrades: [],

    hydrate: (data) => set({ ...data, hydrated: true }),
    reload,

    // --- Employees ---
    addEmployee: (employee) => {
      set((s) => ({ employees: [...s.employees, employee] }));
      void api.createEmployee(employee).then((saved) => {
        if (saved) {
          set((s) => ({
            employees: s.employees.map((e) => (e.id === employee.id ? saved : e)),
          }));
        } else {
          failSync('employee');
        }
      });
    },

    updateEmployee: (id, data) => {
      set((s) => ({
        employees: s.employees.map((e) =>
          e.id === id ? { ...e, ...data, updated_at: new Date().toISOString() } : e,
        ),
      }));
      void api.updateEmployee(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ employees: s.employees.map((e) => (e.id === id ? saved : e)) }));
        } else {
          failSync('employee');
        }
      });
    },

    deleteEmployee: (id) => {
      const patch = {
        status: 'resigned' as EmployeeStatus,
        resignation_date: new Date().toISOString().split('T')[0],
      };
      set((s) => ({
        employees: s.employees.map((e) =>
          e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e,
        ),
      }));
      void api.updateEmployee(id, patch).then((saved) => {
        if (!saved) failSync('employee');
      });
    },

    // --- Org structure ---
    addDepartment: (d) => syncCreate('department', d),
    updateDepartment: (id, data) => syncUpdate('department', id, data as Record<string, unknown>),
    deleteDepartment: (id) => syncDeactivate('department', id),

    addPositionRank: (r) => syncCreate('positionRank', r),
    updatePositionRank: (id, data) => syncUpdate('positionRank', id, data as Record<string, unknown>),
    deletePositionRank: (id) => syncDeactivate('positionRank', id),

    addPositionTitle: (t) => syncCreate('positionTitle', t),
    updatePositionTitle: (id, data) => syncUpdate('positionTitle', id, data as Record<string, unknown>),
    deletePositionTitle: (id) => syncDeactivate('positionTitle', id),

    addJobCategory: (c) => syncCreate('jobCategory', c),
    updateJobCategory: (id, data) => syncUpdate('jobCategory', id, data as Record<string, unknown>),
    deleteJobCategory: (id) => syncDeactivate('jobCategory', id),

    addSalaryGrade: (g) => syncCreate('salaryGrade', g),
    updateSalaryGrade: (id, data) => syncUpdate('salaryGrade', id, data as Record<string, unknown>),
    deleteSalaryGrade: (id) => syncDeactivate('salaryGrade', id),

    // --- Employee sub-records ---
    addCareerHistory: (item) => syncCreate('careerHistory', item),
    updateCareerHistory: (id, data) => syncUpdate('careerHistory', id, data as Record<string, unknown>),
    deleteCareerHistory: (id) => syncDelete('careerHistory', id),

    addEducationHistory: (item) => syncCreate('educationHistory', item),
    updateEducationHistory: (id, data) => syncUpdate('educationHistory', id, data as Record<string, unknown>),
    deleteEducationHistory: (id) => syncDelete('educationHistory', id),

    addCertification: (item) => syncCreate('certification', item),
    updateCertification: (id, data) => syncUpdate('certification', id, data as Record<string, unknown>),
    deleteCertification: (id) => syncDelete('certification', id),

    addFamilyMember: (item) => syncCreate('familyMember', item),
    updateFamilyMember: (id, data) => syncUpdate('familyMember', id, data as Record<string, unknown>),
    deleteFamilyMember: (id) => syncDelete('familyMember', id),

    // --- Getters ---
    getEmployeeById: (id) => {
      const s = get();
      const e = s.employees.find((emp) => emp.id === id);
      if (!e) return undefined;
      return hydrateEmployee(e, s.departments, s.positionRanks, s.positionTitles);
    },

    getActiveEmployees: () => {
      const s = get();
      return s.employees
        .filter((e) => e.status === 'active')
        .map((e) => hydrateEmployee(e, s.departments, s.positionRanks, s.positionTitles));
    },

    getEmployeesByDepartment: (deptId) => {
      const s = get();
      return s.employees
        .filter((e) => e.department_id === deptId && e.status === 'active')
        .map((e) => hydrateEmployee(e, s.departments, s.positionRanks, s.positionTitles));
    },

    getDepartmentById: (id) => get().departments.find((d) => d.id === id),
    getPositionRankById: (id) => get().positionRanks.find((r) => r.id === id),
    getPositionTitleById: (id) => get().positionTitles.find((t) => t.id === id),

    getCareerByEmployee: (empId) => get().careerHistories.filter((c) => c.employee_id === empId),
    getEducationByEmployee: (empId) => get().educationHistories.filter((e) => e.employee_id === empId),
    getCertsByEmployee: (empId) => get().certifications.filter((c) => c.employee_id === empId),
    getFamilyByEmployee: (empId) => get().familyMembers.filter((f) => f.employee_id === empId),
  };
});
