'use server';

/**
 * Server actions for the approval / appointment / workflow modules.
 *
 * Three client stores hydrate from fetchApprovalData() and mirror every
 * mutation through the actions below:
 *   - approval-store    -> approvals + approval_lines
 *   - appointment-store -> appointments
 *   - workflow-store    -> workflow_templates + workflows
 *
 * App types use snake_case fields with string dates; Drizzle rows use camelCase
 * with Date objects. The shared mappers convert between the two, except for the
 * workflow tables whose JSONB trees (steps / tasks / step_names) are stored and
 * read verbatim — see the explicit converters near the bottom.
 */
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { toApp, toDb } from './mappers';
import { createAssignment, deleteAssignment } from './assignment-actions';
import type { Approval, ApprovalLine, Appointment } from '@/types';
import type { WorkflowTemplate, WorkflowInstance } from '@/lib/stores/workflow-store';

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

const HR_ROLES = ['admin', 'hr_manager'];

/** Demo mode (AUTH_MODE !== 'db') bypasses every guard. */
function guardsDisabled(): boolean {
  return process.env.AUTH_MODE !== 'db';
}

async function assertRead(): Promise<void> {
  if (guardsDisabled()) return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
}

/** Any signed-in user (submitting/cancelling own documents, running workflows). */
async function assertAuthed(): Promise<void> {
  await assertRead();
}

async function assertHrWrite(): Promise<void> {
  if (guardsDisabled()) return;
  const session = await getSession();
  if (!session || !HR_ROLES.includes(session.role)) throw new Error('forbidden');
}

/** Approving/rejecting a line requires being that approver, or an HR role. */
async function assertLineAction(approverId: string): Promise<void> {
  if (guardsDisabled()) return;
  const session = await getSession();
  if (!session) throw new Error('unauthorized');
  if (HR_ROLES.includes(session.role)) return;
  if (session.employeeId && session.employeeId === approverId) return;
  throw new Error('forbidden');
}

// ---------------------------------------------------------------------------
// Read: full module dataset
// ---------------------------------------------------------------------------

export interface ApprovalModuleData {
  approvals: Approval[];
  approvalLines: ApprovalLine[];
  appointments: Appointment[];
  workflowTemplates: WorkflowTemplate[];
  workflows: WorkflowInstance[];
}

export async function fetchApprovalData(): Promise<ApprovalModuleData | null> {
  try {
    await assertRead();
    const [approvals, approvalLines, appointments, workflowTemplates, workflows] =
      await Promise.all([
        db.select().from(schema.approvals),
        db.select().from(schema.approvalLines),
        db.select().from(schema.appointments),
        db.select().from(schema.workflowTemplates),
        db.select().from(schema.workflows),
      ]);
    return {
      approvals: approvals.map((r) => toApp<Approval>(r)),
      approvalLines: approvalLines.map((r) => toApp<ApprovalLine>(r)),
      appointments: appointments.map((r) => toApp<Appointment>(r)),
      workflowTemplates: workflowTemplates.map(templateToApp),
      workflows: workflows.map(workflowToApp),
    };
  } catch (err) {
    console.error('fetchApprovalData failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Approvals + approval lines
// ---------------------------------------------------------------------------

/** Nested convenience fields that must never reach the DB layer. */
function stripNested<T extends Record<string, unknown>>(value: T, keys: string[]): T {
  const out = { ...value };
  for (const k of keys) delete out[k];
  return out;
}

async function linesFor(approvalId: string): Promise<ApprovalLine[]> {
  const rows = await db
    .select()
    .from(schema.approvalLines)
    .where(eq(schema.approvalLines.approvalId, approvalId));
  return rows.map((r) => toApp<ApprovalLine>(r)).sort((a, b) => a.step - b.step);
}

/**
 * Inserts a document together with its approval line. The client-side ids are
 * discarded — lines are re-pointed at the id the DB assigns to the approval.
 */
export async function createApproval(
  approval: Approval,
  lines: ApprovalLine[],
): Promise<{ approval: Approval; lines: ApprovalLine[] } | null> {
  let insertedId: string | null = null;
  try {
    await assertAuthed();
    const values = toDb(
      stripNested(approval as unknown as Record<string, unknown>, ['requester', 'lines']),
      { dropId: true },
    );
    const [row] = await db
      .insert(schema.approvals)
      .values(values as typeof schema.approvals.$inferInsert)
      .returning();
    insertedId = row.id;

    if (lines.length > 0) {
      const lineValues = lines.map(
        (l) =>
          ({
            ...toDb(stripNested(l as unknown as Record<string, unknown>, ['approver']), {
              dropId: true,
            }),
            approvalId: row.id,
          }) as typeof schema.approvalLines.$inferInsert,
      );
      await db.insert(schema.approvalLines).values(lineValues);
    }

    return { approval: toApp<Approval>(row), lines: await linesFor(row.id) };
  } catch (err) {
    console.error('createApproval failed:', err);
    // Best-effort rollback so a half-written document does not linger.
    if (insertedId) {
      try {
        await db.delete(schema.approvals).where(eq(schema.approvals.id, insertedId));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

/**
 * Applies one approver's decision and recomputes the document status.
 *
 * Completion rule: every 합의(agreement) and 결재(approval) line must be
 * approved; 참조(cc) lines are excluded from the decision and are flipped to
 * 'approved' (read-granted) once the document completes.
 */
export async function progressApproval(
  approvalId: string,
  approverId: string,
  decision: 'approved' | 'rejected',
  comment?: string,
): Promise<{ approval: Approval; lines: ApprovalLine[] } | null> {
  try {
    await assertAuthed();
    const current = await db
      .select()
      .from(schema.approvalLines)
      .where(eq(schema.approvalLines.approvalId, approvalId));

    const target = current
      .filter((l) => l.approverId === approverId && l.status === 'pending' && l.lineType !== 'cc')
      .sort((a, b) => a.step - b.step)[0];
    if (!target) return null;

    await assertLineAction(target.approverId);

    const now = new Date();
    await db
      .update(schema.approvalLines)
      .set({ status: decision, comment: comment ?? null, actedAt: now })
      .where(eq(schema.approvalLines.id, target.id));

    if (decision === 'rejected') {
      await db
        .update(schema.approvals)
        .set({ status: 'rejected', completedAt: now })
        .where(eq(schema.approvals.id, approvalId));
    } else {
      const after = current.map((l) => (l.id === target.id ? { ...l, status: decision } : l));
      const decisive = after.filter((l) => l.lineType === 'agreement' || l.lineType === 'approval');
      const allDone = decisive.every((l) => l.status === 'approved');

      if (allDone) {
        const ccPending = after
          .filter((l) => l.lineType === 'cc' && l.status === 'pending')
          .map((l) => l.id);
        if (ccPending.length > 0) {
          await db
            .update(schema.approvalLines)
            .set({ status: 'approved', actedAt: now, comment: '참조 열람' })
            .where(inArray(schema.approvalLines.id, ccPending));
        }
      }

      await db
        .update(schema.approvals)
        .set(
          allDone
            ? { status: 'approved', completedAt: now }
            : { status: 'in_progress' },
        )
        .where(eq(schema.approvals.id, approvalId));
    }

    const [row] = await db.select().from(schema.approvals).where(eq(schema.approvals.id, approvalId));
    if (!row) return null;
    return { approval: toApp<Approval>(row), lines: await linesFor(approvalId) };
  } catch (err) {
    console.error('progressApproval failed:', err);
    return null;
  }
}

export async function updateApproval(
  id: string,
  patch: Partial<Approval>,
): Promise<Approval | null> {
  try {
    await assertAuthed();
    const values = toDb(stripNested(patch as Record<string, unknown>, ['requester', 'lines']), {
      dropId: true,
    });
    const [row] = await db
      .update(schema.approvals)
      .set(values)
      .where(eq(schema.approvals.id, id))
      .returning();
    return row ? toApp<Approval>(row) : null;
  } catch (err) {
    console.error('updateApproval failed:', err);
    return null;
  }
}

export async function cancelApproval(id: string): Promise<Approval | null> {
  try {
    await assertAuthed();
    const [row] = await db
      .update(schema.approvals)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(eq(schema.approvals.id, id))
      .returning();
    return row ? toApp<Approval>(row) : null;
  } catch (err) {
    console.error('cancelApproval failed:', err);
    return null;
  }
}

export async function deleteApproval(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.approvals).where(eq(schema.approvals.id, id));
    return true;
  } catch (err) {
    console.error('deleteApproval failed:', err);
    return false;
  }
}

export async function updateApprovalLine(
  id: string,
  patch: Partial<ApprovalLine>,
): Promise<ApprovalLine | null> {
  try {
    const [existing] = await db
      .select()
      .from(schema.approvalLines)
      .where(eq(schema.approvalLines.id, id));
    if (!existing) return null;
    await assertLineAction(existing.approverId);
    const values = toDb(stripNested(patch as Record<string, unknown>, ['approver']), {
      dropId: true,
    });
    const [row] = await db
      .update(schema.approvalLines)
      .set(values)
      .where(eq(schema.approvalLines.id, id))
      .returning();
    return row ? toApp<ApprovalLine>(row) : null;
  } catch (err) {
    console.error('updateApprovalLine failed:', err);
    return null;
  }
}

export async function deleteApprovalLine(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.approvalLines).where(eq(schema.approvalLines.id, id));
    return true;
  } catch (err) {
    console.error('deleteApprovalLine failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Appointments (인사발령) — HR only
// ---------------------------------------------------------------------------

const APPOINTMENT_NESTED = [
  'employee',
  'prev_department',
  'prev_position_rank',
  'prev_position_title',
  'new_department',
  'new_position_rank',
  'new_position_title',
];

export async function createAppointment(
  appointment: Appointment,
): Promise<Appointment | null> {
  try {
    await assertHrWrite();
    const values = toDb(
      stripNested(appointment as unknown as Record<string, unknown>, APPOINTMENT_NESTED),
      { dropId: true },
    );
    const [row] = await db
      .insert(schema.appointments)
      .values(values as typeof schema.appointments.$inferInsert)
      .returning();

    // 발령은 소속 이력을 남기는 것이 본체입니다. 여기서 구간을 열어 두면
    // 발령일이 되는 순간 인사정보에 자동으로 반영되고, 지난 시점 조회도
    // 같은 자료에서 나옵니다. 퇴사 발령은 소속을 바꾸는 것이 아니므로 제외.
    if (row && row.type !== 'resignation') {
      const [current] = await db
        .select()
        .from(schema.employees)
        .where(eq(schema.employees.id, row.employeeId));
      await createAssignment({
        employeeId: row.employeeId,
        effectiveFrom: row.effectiveDate,
        // 발령서에 적히지 않은 항목은 직전 값을 그대로 이어받습니다.
        departmentId: row.newDepartmentId ?? current?.departmentId ?? null,
        positionRankId: row.newPositionRankId ?? current?.positionRankId ?? null,
        positionTitleId: row.newPositionTitleId ?? current?.positionTitleId ?? null,
        workplaceId: current?.workplaceId ?? null,
        appointmentId: row.id,
        reason: row.reason,
      });
    }
    return toApp<Appointment>(row);
  } catch (err) {
    console.error('createAppointment failed:', err);
    return null;
  }
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Promise<Appointment | null> {
  try {
    await assertHrWrite();
    const values = toDb(stripNested(patch as Record<string, unknown>, APPOINTMENT_NESTED), {
      dropId: true,
    });
    const [row] = await db
      .update(schema.appointments)
      .set(values)
      .where(eq(schema.appointments.id, id))
      .returning();
    return row ? toApp<Appointment>(row) : null;
  } catch (err) {
    console.error('updateAppointment failed:', err);
    return null;
  }
}

export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    await assertHrWrite();

    // 발령을 지우면 그 발령이 만든 소속 구간도 함께 걷어내고 직전 구간을
    // 다시 엽니다. 발령만 지우면 이력에 근거 없는 구간이 남습니다.
    const orphans = await db
      .select()
      .from(schema.employeeAssignments)
      .where(eq(schema.employeeAssignments.appointmentId, id));
    for (const assignment of orphans) {
      await deleteAssignment(assignment.id);
    }

    await db.delete(schema.appointments).where(eq(schema.appointments.id, id));
    return true;
  } catch (err) {
    console.error('deleteAppointment failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Workflow templates — explicit converters (JSONB trees pass through verbatim)
// ---------------------------------------------------------------------------

type TemplateRow = typeof schema.workflowTemplates.$inferSelect;
type WorkflowRow = typeof schema.workflows.$inferSelect;

function templateToApp(row: TemplateRow): WorkflowTemplate {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? '',
    // `steps` holds the whole step -> task -> document tree as stored.
    steps: (row.steps ?? []) as WorkflowTemplate['steps'],
    is_active: row.isActive ?? true,
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
  };
}

function templateToDb(
  patch: Partial<WorkflowTemplate>,
): Partial<typeof schema.workflowTemplates.$inferInsert> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.type !== undefined) out.type = patch.type;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.steps !== undefined) out.steps = patch.steps;
  if (patch.is_active !== undefined) out.isActive = patch.is_active;
  return out as Partial<typeof schema.workflowTemplates.$inferInsert>;
}

export async function createWorkflowTemplate(
  template: Omit<WorkflowTemplate, 'id' | 'created_at' | 'updated_at'>,
): Promise<WorkflowTemplate | null> {
  try {
    await assertHrWrite();
    const [row] = await db
      .insert(schema.workflowTemplates)
      .values({
        name: template.name,
        type: template.type,
        description: template.description,
        steps: template.steps,
        isActive: template.is_active,
      } as typeof schema.workflowTemplates.$inferInsert)
      .returning();
    return templateToApp(row);
  } catch (err) {
    console.error('createWorkflowTemplate failed:', err);
    return null;
  }
}

export async function updateWorkflowTemplate(
  id: string,
  patch: Partial<WorkflowTemplate>,
): Promise<WorkflowTemplate | null> {
  try {
    await assertHrWrite();
    const [row] = await db
      .update(schema.workflowTemplates)
      .set({ ...templateToDb(patch), updatedAt: new Date() })
      .where(eq(schema.workflowTemplates.id, id))
      .returning();
    return row ? templateToApp(row) : null;
  } catch (err) {
    console.error('updateWorkflowTemplate failed:', err);
    return null;
  }
}

export async function deleteWorkflowTemplate(id: string): Promise<boolean> {
  try {
    await assertHrWrite();
    await db.delete(schema.workflowTemplates).where(eq(schema.workflowTemplates.id, id));
    return true;
  } catch (err) {
    console.error('deleteWorkflowTemplate failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Workflow instances
// ---------------------------------------------------------------------------

function workflowToApp(row: WorkflowRow): WorkflowInstance {
  return {
    id: row.id,
    template_id: row.templateId ?? '',
    template_name: row.templateName ?? '',
    type: row.type,
    employee_id: row.employeeId,
    employee_name: row.employeeName ?? '',
    department: row.department ?? '',
    status: row.status,
    current_step: row.currentStep ?? 0,
    total_steps: row.totalSteps ?? 0,
    step_names: (row.stepNames ?? []) as string[],
    // `tasks` holds the whole task -> document tree as stored.
    tasks: (row.tasks ?? []) as WorkflowInstance['tasks'],
    started_at: row.startedAt ? row.startedAt.toISOString() : '',
    completed_at: row.completedAt ? row.completedAt.toISOString() : null,
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
  };
}

function workflowToDb(
  patch: Partial<WorkflowInstance>,
): Partial<typeof schema.workflows.$inferInsert> {
  const out: Record<string, unknown> = {};
  if (patch.template_id !== undefined) out.templateId = patch.template_id || null;
  if (patch.template_name !== undefined) out.templateName = patch.template_name;
  if (patch.type !== undefined) out.type = patch.type;
  if (patch.employee_id !== undefined) out.employeeId = patch.employee_id;
  if (patch.employee_name !== undefined) out.employeeName = patch.employee_name;
  if (patch.department !== undefined) out.department = patch.department;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.current_step !== undefined) out.currentStep = patch.current_step;
  if (patch.total_steps !== undefined) out.totalSteps = patch.total_steps;
  if (patch.step_names !== undefined) out.stepNames = patch.step_names;
  if (patch.tasks !== undefined) out.tasks = patch.tasks;
  if (patch.started_at !== undefined) {
    out.startedAt = patch.started_at ? new Date(patch.started_at) : null;
  }
  if (patch.completed_at !== undefined) {
    out.completedAt = patch.completed_at ? new Date(patch.completed_at) : null;
  }
  return out as Partial<typeof schema.workflows.$inferInsert>;
}

export async function createWorkflow(
  instance: Omit<WorkflowInstance, 'id' | 'created_at'>,
): Promise<WorkflowInstance | null> {
  try {
    await assertAuthed();
    const [row] = await db
      .insert(schema.workflows)
      .values(workflowToDb(instance) as typeof schema.workflows.$inferInsert)
      .returning();
    return workflowToApp(row);
  } catch (err) {
    console.error('createWorkflow failed:', err);
    return null;
  }
}

export async function updateWorkflow(
  id: string,
  patch: Partial<WorkflowInstance>,
): Promise<WorkflowInstance | null> {
  try {
    await assertAuthed();
    const [row] = await db
      .update(schema.workflows)
      .set(workflowToDb(patch))
      .where(eq(schema.workflows.id, id))
      .returning();
    return row ? workflowToApp(row) : null;
  } catch (err) {
    console.error('updateWorkflow failed:', err);
    return null;
  }
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  try {
    await assertAuthed();
    await db.delete(schema.workflows).where(eq(schema.workflows.id, id));
    return true;
  } catch (err) {
    console.error('deleteWorkflow failed:', err);
    return false;
  }
}
