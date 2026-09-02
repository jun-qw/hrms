'use server';

/**
 * 입퇴사 파이프라인.
 *
 * 입퇴사가 잦은 회사에서 비용이 큰 쪽은 계산이 아니라 **누락**입니다. 취득신고를
 * 빠뜨리고, 연차 정산을 놓치고, 계정을 살려 둡니다. 그래서 사원을 만들거나 퇴사
 * 처리를 하면 담당자가 따로 기억하지 않아도 해당 프로세스가 저절로 열립니다.
 *
 * 프로세스 정의는 이미 있는 워크플로우 템플릿(설정 > 프로세스설정)을 그대로 씁니다.
 * 여기서 새 체크리스트 개념을 만들지 않는 이유는, 항목을 두 군데서 관리하게 되면
 * 곧 서로 어긋나기 때문입니다.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { createAssignment } from './assignment-actions';
import type { Employee } from '@/types';
import { toApp } from './mappers';

const HR_ROLES = ['admin', 'hr_manager'];

async function assertHrWrite(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/**
 * 읽기도 HR로 막습니다.
 *
 * 퇴사 미리보기는 사람마다 퇴직금과 연차 정산액을 계산해 돌려줍니다. 남의
 * 급여를 보는 것과 같아서, 조회라는 이유로 열어 둘 수 없습니다. 입퇴사 현황도
 * 누가 나가는지가 그대로 드러납니다.
 */
async function assertHrRead(): Promise<void> {
  if (process.env.AUTH_MODE !== 'db') return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// 프로세스 착수
// ---------------------------------------------------------------------------

interface TemplateTask {
  id: string;
  title: string;
  assignee_role: string;
  is_required: boolean;
  sort_order: number;
  documents?: {
    id: string;
    title: string;
    is_required: boolean;
    responsible_role: string;
  }[];
}

interface TemplateStep {
  id: string;
  title: string;
  sort_order: number;
  tasks: TemplateTask[];
}

/**
 * 해당 직원의 입사/퇴사 프로세스를 엽니다. 이미 진행 중인 같은 유형이 있으면
 * 아무것도 하지 않습니다 — 사원 정보를 두 번 저장했다고 체크리스트가 둘이 되면
 * 곤란하기 때문입니다.
 */
export async function startEmployeeProcess(
  employeeId: string,
  type: 'onboarding' | 'offboarding',
): Promise<{ ok: boolean; workflowId?: string; skipped?: boolean; error?: string }> {
  try {
    await assertHrWrite();
    const [existing] = await db
      .select()
      .from(schema.workflows)
      .where(and(eq(schema.workflows.employeeId, employeeId), eq(schema.workflows.type, type)));
    if (existing) return { ok: true, workflowId: existing.id, skipped: true };

    const [template] = await db
      .select()
      .from(schema.workflowTemplates)
      .where(
        and(eq(schema.workflowTemplates.type, type), eq(schema.workflowTemplates.isActive, true)),
      );
    if (!template) {
      return { ok: false, error: `${type === 'onboarding' ? '입사' : '퇴사'} 프로세스 템플릿이 없습니다.` };
    }

    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, employeeId));
    if (!employee) return { ok: false, error: '사원을 찾을 수 없습니다.' };

    const [department] = employee.departmentId
      ? await db
          .select()
          .from(schema.departments)
          .where(eq(schema.departments.id, employee.departmentId))
      : [];

    const steps = (template.steps ?? []) as TemplateStep[];
    const stamp = Date.now();
    const tasks = steps.flatMap((step, stepIndex) =>
      (step.tasks ?? []).map((task) => ({
        id: `${stamp}-${task.id}`,
        template_task_id: task.id,
        step_index: stepIndex,
        title: task.title,
        assignee_role: task.assignee_role,
        is_required: task.is_required,
        sort_order: task.sort_order,
        status: 'pending' as const,
        completed_by: null,
        completed_at: null,
        note: null,
        documents: (task.documents ?? []).map((doc) => ({
          id: `${stamp}-d-${doc.id}`,
          requirement_id: doc.id,
          task_instance_id: `${stamp}-${task.id}`,
          title: doc.title,
          is_required: doc.is_required,
          responsible_role: doc.responsible_role,
          status: 'pending' as const,
          submitted_by: null,
          submitted_at: null,
          rejected_reason: null,
          note: null,
        })),
      })),
    );

    const [row] = await db
      .insert(schema.workflows)
      .values({
        templateId: template.id,
        templateName: template.name,
        employeeId,
        employeeName: employee.name,
        department: department?.name ?? '',
        type,
        status: 'in_progress',
        currentStep: 0,
        totalSteps: steps.length,
        stepNames: steps.map((s) => s.title),
        tasks,
        startedAt: new Date(),
      })
      .returning();

    return { ok: true, workflowId: row?.id };
  } catch (err) {
    console.error('startEmployeeProcess failed:', err);
    return { ok: false, error: '프로세스를 시작하지 못했습니다.' };
  }
}

// ---------------------------------------------------------------------------
// 일괄 입사등록
// ---------------------------------------------------------------------------

export interface BulkHireRow {
  name: string;
  email: string;
  hireDate: string;
  departmentId?: string | null;
  positionRankId?: string | null;
  positionTitleId?: string | null;
  employmentType?: Employee['employment_type'];
  phone?: string | null;
}

export interface BulkHireResult {
  ok: boolean;
  created: { employeeNumber: string; name: string }[];
  failed: { name: string; reason: string }[];
}

/**
 * 명단을 한 번에 입사 처리합니다.
 *
 * 사번은 기존 최대값 다음으로 자동 채번합니다. 담당자가 채번 규칙을 손으로
 * 지키게 하면 반드시 중복이 납니다.
 */
export async function bulkHire(rows: BulkHireRow[]): Promise<BulkHireResult> {
  const created: BulkHireResult['created'] = [];
  const failed: BulkHireResult['failed'] = [];

  try {
    await assertHrWrite();

    const existing = await db.select().from(schema.employees);
    const takenEmails = new Set(
      existing.map((e) => e.email?.toLowerCase()).filter((v): v is string => Boolean(v)),
    );
    // 숫자로만 된 사번을 기준으로 다음 번호를 정합니다. 회사 채번 규칙이
    // 따로 있으면 인력대장에서 바꾸면 됩니다.
    let next =
      existing.reduce((max, e) => {
        const n = Number(e.employeeNumber);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;
    const width = Math.max(
      4,
      ...existing.map((e) => (/^\d+$/.test(e.employeeNumber) ? e.employeeNumber.length : 0)),
    );

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();
      if (!row.name.trim()) {
        failed.push({ name: row.name || '(이름 없음)', reason: '성명이 비어 있습니다.' });
        continue;
      }
      if (takenEmails.has(email)) {
        failed.push({ name: row.name, reason: `이미 등록된 이메일입니다 (${email}).` });
        continue;
      }

      const employeeNumber = String(next).padStart(width, '0');
      next += 1;

      try {
        const [inserted] = await db
          .insert(schema.employees)
          .values({
            employeeNumber,
            name: row.name.trim(),
            email,
            phone: row.phone ?? null,
            hireDate: row.hireDate,
            departmentId: row.departmentId ?? null,
            positionRankId: row.positionRankId ?? null,
            positionTitleId: row.positionTitleId ?? null,
            employmentType: row.employmentType ?? 'regular',
            status: 'active',
            baseSalary: '0',
          })
          .returning();

        takenEmails.add(email);

        await createAssignment({
          employeeId: inserted.id,
          effectiveFrom: row.hireDate,
          departmentId: inserted.departmentId,
          positionRankId: inserted.positionRankId,
          positionTitleId: inserted.positionTitleId,
          reason: '입사',
        });
        await startEmployeeProcess(inserted.id, 'onboarding');

        created.push({ employeeNumber, name: inserted.name });
      } catch (err) {
        console.error('bulkHire row failed:', err);
        failed.push({ name: row.name, reason: '저장 중 오류가 발생했습니다.' });
      }
    }

    return { ok: true, created, failed };
  } catch (err) {
    console.error('bulkHire failed:', err);
    return { ok: false, created, failed };
  }
}

// ---------------------------------------------------------------------------
// 일괄 퇴사처리
// ---------------------------------------------------------------------------

export interface BulkResignInput {
  employeeIds: string[];
  resignationDate: string;
  reason?: string | null;
}

export interface ResignPreviewRow {
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  hireDate: string;
  /** 근속일수 — 퇴직금 지급 대상(1년 이상) 판단의 근거 */
  serviceDays: number;
  severanceEligible: boolean;
  /** 부여된 연차 중 아직 쓰지 않은 일수 — 정산 대상 */
  remainingLeaveDays: number;
}

/** 확정 전에 무엇이 걸리는지 먼저 보여 줍니다. 되돌리기 어려운 처리이기 때문입니다. */
export async function previewBulkResign(
  employeeIds: string[],
  resignationDate: string,
): Promise<ResignPreviewRow[]> {
  try {
    await assertHrRead();
    const rows: ResignPreviewRow[] = [];
    const departments = await db.select().from(schema.departments);
    const balances = await db.select().from(schema.leaveBalances);

    for (const id of employeeIds) {
      const [e] = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
      if (!e) continue;
      const serviceDays = Math.max(
        0,
        Math.floor(
          (new Date(resignationDate).getTime() - new Date(e.hireDate).getTime()) / 86_400_000,
        ),
      );
      const remaining = balances
        .filter((b) => b.employeeId === id)
        .reduce((sum, b) => sum + Number(b.remainingDays ?? 0), 0);

      rows.push({
        employeeId: id,
        employeeNumber: e.employeeNumber,
        name: e.name,
        department: departments.find((d) => d.id === e.departmentId)?.name ?? '미배정',
        hireDate: e.hireDate,
        serviceDays,
        severanceEligible: serviceDays >= 365,
        remainingLeaveDays: remaining,
      });
    }
    return rows;
  } catch (err) {
    console.error('previewBulkResign failed:', err);
    return [];
  }
}

export async function bulkResign(
  input: BulkResignInput,
): Promise<{ ok: boolean; processed: number; error?: string }> {
  try {
    await assertHrWrite();
    let processed = 0;

    for (const id of input.employeeIds) {
      await db
        .update(schema.employees)
        .set({
          status: 'resigned',
          resignationDate: input.resignationDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.employees.id, id));

      // 소속 이력도 퇴사일에서 닫습니다. 열어 두면 퇴사자가 계속 그 부서
      // 소속으로 시점 조회에 잡힙니다.
      const open = await db
        .select()
        .from(schema.employeeAssignments)
        .where(eq(schema.employeeAssignments.employeeId, id))
        .orderBy(asc(schema.employeeAssignments.effectiveFrom));
      const current = open.find((a) => a.effectiveTo === null);
      if (current) {
        await db
          .update(schema.employeeAssignments)
          .set({ effectiveTo: input.resignationDate })
          .where(eq(schema.employeeAssignments.id, current.id));
      }

      // 아직 끝나지 않은 입사 프로세스는 접습니다. 남겨 두면 퇴사한 사람의
      // 입사 항목이 "이번 주 할 일"에 영원히 남습니다.
      await db
        .update(schema.workflows)
        .set({ status: 'cancelled', completedAt: new Date() })
        .where(
          and(
            eq(schema.workflows.employeeId, id),
            eq(schema.workflows.type, 'onboarding'),
            eq(schema.workflows.status, 'in_progress'),
          ),
        );

      await startEmployeeProcess(id, 'offboarding');
      processed += 1;
    }

    return { ok: true, processed };
  } catch (err) {
    console.error('bulkResign failed:', err);
    return { ok: false, processed: 0, error: '퇴사 처리 중 오류가 발생했습니다.' };
  }
}

// ---------------------------------------------------------------------------
// 홈 화면 · 이번 주 할 일
// ---------------------------------------------------------------------------

export interface PipelineSummary {
  onboardingOpen: number;
  onboardingOverdue: number;
  offboardingOpen: number;
  offboardingOverdue: number;
  /** 30일 내 계약 만료 예정 */
  contractsExpiring: number;
  /** 발령일이 아직 오지 않은 소속 이력 */
  upcomingAssignments: number;
}

export async function fetchPipelineSummary(): Promise<PipelineSummary> {
  const empty: PipelineSummary = {
    onboardingOpen: 0,
    onboardingOverdue: 0,
    offboardingOpen: 0,
    offboardingOverdue: 0,
    contractsExpiring: 0,
    upcomingAssignments: 0,
  };
  try {
    await assertHrRead();
    const now = today();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const horizon = in30.toISOString().slice(0, 10);

    const [flows, employees, assignments] = await Promise.all([
      db.select().from(schema.workflows),
      db.select().from(schema.employees),
      db.select().from(schema.employeeAssignments),
    ]);

    // 착수 후 14일이 지나도 끝나지 않은 프로세스를 지연으로 봅니다.
    const overdueBefore = new Date();
    overdueBefore.setDate(overdueBefore.getDate() - 14);

    const open = flows.filter((f) => f.status === 'pending' || f.status === 'in_progress');
    const isOverdue = (startedAt: Date | null) =>
      startedAt !== null && startedAt < overdueBefore;

    return {
      onboardingOpen: open.filter((f) => f.type === 'onboarding').length,
      onboardingOverdue: open.filter((f) => f.type === 'onboarding' && isOverdue(f.startedAt)).length,
      offboardingOpen: open.filter((f) => f.type === 'offboarding').length,
      offboardingOverdue: open.filter((f) => f.type === 'offboarding' && isOverdue(f.startedAt)).length,
      contractsExpiring: employees.filter(
        (e) =>
          e.status === 'active' &&
          e.arrangementEndDate !== null &&
          e.arrangementEndDate >= now &&
          e.arrangementEndDate <= horizon,
      ).length,
      upcomingAssignments: assignments.filter((a) => a.effectiveFrom > now).length,
    };
  } catch (err) {
    console.error('fetchPipelineSummary failed:', err);
    return empty;
  }
}

/** 인력대장 등에서 쓰는, 현재 열려 있는 프로세스의 직원 id 집합. */
export async function fetchOpenProcessEmployees(): Promise<Employee[]> {
  try {
    await assertHrRead();
    const flows = await db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.status, 'in_progress'));
    const ids = new Set(flows.map((f) => f.employeeId));
    if (ids.size === 0) return [];
    const rows = await db.select().from(schema.employees);
    return rows.filter((r) => ids.has(r.id)).map((r) => toApp<Employee>(r));
  } catch (err) {
    console.error('fetchOpenProcessEmployees failed:', err);
    return [];
  }
}
