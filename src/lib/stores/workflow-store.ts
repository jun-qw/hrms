'use client';

/**
 * Workflow module store — a DB-backed client cache: hydrated once per session,
 * mutations apply optimistically and sync through server actions.
 *
 * Templates keep their whole step -> task -> document tree in one JSONB column,
 * and running instances keep their task -> document tree the same way, so every
 * nested edit below persists as a patch on that tree.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/approval-actions';
import type { WorkflowType, WorkflowStatus, WorkflowTaskStatus, DocumentSubmissionStatus } from '@/types';

// ---- Interfaces ----

export interface DocumentRequirement {
  id: string;
  title: string;
  description: string;
  is_required: boolean;
  responsible_role: string;
  deadline_days: number | null;
  sort_order: number;
}

export interface DocumentInstance {
  id: string;
  requirement_id: string;
  task_instance_id: string;
  title: string;
  is_required: boolean;
  responsible_role: string;
  status: DocumentSubmissionStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  rejected_reason: string | null;
  note: string | null;
}

export interface WorkflowTemplateTask {
  id: string;
  title: string;
  assignee_role: string;
  is_required: boolean;
  sort_order: number;
  documents: DocumentRequirement[];
}

export interface WorkflowTemplateStep {
  id: string;
  title: string;
  sort_order: number;
  tasks: WorkflowTemplateTask[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  type: WorkflowType;
  description: string;
  steps: WorkflowTemplateStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTaskInstance {
  id: string;
  template_task_id: string;
  step_index: number;
  title: string;
  assignee_role: string;
  is_required: boolean;
  sort_order: number;
  status: WorkflowTaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  note: string | null;
  documents: DocumentInstance[];
}

export interface WorkflowInstance {
  id: string;
  template_id: string;
  template_name: string;
  type: WorkflowType;
  employee_id: string;
  employee_name: string;
  department: string;
  status: WorkflowStatus;
  current_step: number;
  total_steps: number;
  step_names: string[];
  tasks: WorkflowTaskInstance[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ---- Store ----

interface WorkflowState {
  hydrated: boolean;
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];

  // Hydration
  hydrate: (data: api.ApprovalModuleData) => void;
  reload: () => Promise<void>;

  // Template actions
  addTemplate: (template: Omit<WorkflowTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTemplate: (id: string, updates: Partial<WorkflowTemplate>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplateActive: (id: string) => void;

  // Template step/task/document editing actions
  addStep: (templateId: string, title: string) => void;
  updateStep: (templateId: string, stepId: string, title: string) => void;
  removeStep: (templateId: string, stepId: string) => void;
  addTask: (templateId: string, stepId: string, title: string, assigneeRole: string, isRequired: boolean) => void;
  updateTask: (templateId: string, stepId: string, taskId: string, updates: Partial<Pick<WorkflowTemplateTask, 'title' | 'assignee_role' | 'is_required'>>) => void;
  removeTask: (templateId: string, stepId: string, taskId: string) => void;
  addDocumentRequirement: (templateId: string, stepId: string, taskId: string, doc: Omit<DocumentRequirement, 'id' | 'sort_order'>) => void;
  updateDocumentRequirement: (templateId: string, stepId: string, taskId: string, docId: string, updates: Partial<DocumentRequirement>) => void;
  removeDocumentRequirement: (templateId: string, stepId: string, taskId: string, docId: string) => void;

  // Instance actions
  createInstance: (templateId: string, employeeId: string, employeeName: string, department: string) => string | null;
  completeTask: (instanceId: string, taskId: string, completedBy: string, note?: string) => void;
  skipTask: (instanceId: string, taskId: string) => void;
  cancelInstance: (instanceId: string) => void;

  // Document instance actions
  submitDocument: (instanceId: string, taskId: string, docId: string, submittedBy: string) => void;
  rejectDocument: (instanceId: string, taskId: string, docId: string, reason: string) => void;
  resetDocumentStatus: (instanceId: string, taskId: string, docId: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchApprovalData();
    if (data) {
      set({
        templates: data.workflowTemplates,
        instances: data.workflows,
        hydrated: true,
      });
    }
  };

  const failSync = () => {
    toast.error('업무프로세스 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  /**
   * Rewrites a template's step tree locally, then persists the new tree.
   * The mutator receives the current steps and returns the replacement.
   */
  const patchSteps = (
    templateId: string,
    mutate: (steps: WorkflowTemplateStep[]) => WorkflowTemplateStep[],
  ) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    const steps = mutate(template.steps);
    const updatedAt = new Date().toISOString();
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === templateId ? { ...t, steps, updated_at: updatedAt } : t,
      ),
    }));
    void api.updateWorkflowTemplate(templateId, { steps }).then((saved) => {
      if (saved) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === templateId ? saved : t)),
        }));
      } else {
        failSync();
      }
    });
  };

  /** Applies a patch to one running instance locally, then persists it. */
  const patchInstance = (
    instanceId: string,
    mutate: (instance: WorkflowInstance) => Partial<WorkflowInstance> | null,
  ) => {
    const instance = get().instances.find((i) => i.id === instanceId);
    if (!instance) return;
    const patch = mutate(instance);
    if (!patch) return;
    set((state) => ({
      instances: state.instances.map((i) => (i.id === instanceId ? { ...i, ...patch } : i)),
    }));
    void api.updateWorkflow(instanceId, patch).then((saved) => {
      if (saved) {
        set((state) => ({
          instances: state.instances.map((i) => (i.id === instanceId ? saved : i)),
        }));
      } else {
        failSync();
      }
    });
  };

  /** Rewrites one document inside one task of a running instance. */
  const patchDocument = (
    instanceId: string,
    taskId: string,
    docId: string,
    mutate: (doc: DocumentInstance) => DocumentInstance,
  ) =>
    patchInstance(instanceId, (inst) => ({
      tasks: inst.tasks.map((t) =>
        t.id === taskId
          ? { ...t, documents: t.documents.map((d) => (d.id === docId ? mutate(d) : d)) }
          : t,
      ),
    }));

  return {
    hydrated: false,
    templates: [],
    instances: [],

    hydrate: (data) =>
      set({
        templates: data.workflowTemplates,
        instances: data.workflows,
        hydrated: true,
      }),
    reload,

    addTemplate: (template) => {
      const now = new Date().toISOString();
      const localId = `tpl-${Date.now()}`;
      const newTemplate: WorkflowTemplate = {
        ...template,
        id: localId,
        created_at: now,
        updated_at: now,
      };
      set((state) => ({ templates: [...state.templates, newTemplate] }));
      void api.createWorkflowTemplate(template).then((saved) => {
        if (saved) {
          set((state) => ({
            templates: state.templates.map((t) => (t.id === localId ? saved : t)),
          }));
        } else {
          failSync();
        }
      });
    },

    updateTemplate: (id, updates) => {
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t,
        ),
      }));
      void api.updateWorkflowTemplate(id, updates).then((saved) => {
        if (saved) {
          set((state) => ({
            templates: state.templates.map((t) => (t.id === id ? saved : t)),
          }));
        } else {
          failSync();
        }
      });
    },

    deleteTemplate: (id) => {
      set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
      void api.deleteWorkflowTemplate(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    toggleTemplateActive: (id) => {
      const template = get().templates.find((t) => t.id === id);
      if (!template) return;
      const isActive = !template.is_active;
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, is_active: isActive, updated_at: new Date().toISOString() } : t,
        ),
      }));
      void api.updateWorkflowTemplate(id, { is_active: isActive }).then((saved) => {
        if (saved) {
          set((state) => ({
            templates: state.templates.map((t) => (t.id === id ? saved : t)),
          }));
        } else {
          failSync();
        }
      });
    },

    // ---- Step/Task/Document template editing ----

    addStep: (templateId, title) =>
      patchSteps(templateId, (steps) => [
        ...steps,
        { id: `step-${Date.now()}`, title, sort_order: steps.length, tasks: [] },
      ]),

    updateStep: (templateId, stepId, title) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) => (s.id === stepId ? { ...s, title } : s)),
      ),

    removeStep: (templateId, stepId) =>
      patchSteps(templateId, (steps) =>
        steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, sort_order: i })),
      ),

    addTask: (templateId, stepId, title, assigneeRole, isRequired) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) => {
          if (s.id !== stepId) return s;
          const newTask: WorkflowTemplateTask = {
            id: `task-${Date.now()}`,
            title,
            assignee_role: assigneeRole,
            is_required: isRequired,
            sort_order: s.tasks.length,
            documents: [],
          };
          return { ...s, tasks: [...s.tasks, newTask] };
        }),
      ),

    updateTask: (templateId, stepId, taskId, updates) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? { ...s, tasks: s.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)) }
            : s,
        ),
      ),

    removeTask: (templateId, stepId, taskId) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                tasks: s.tasks
                  .filter((task) => task.id !== taskId)
                  .map((task, i) => ({ ...task, sort_order: i })),
              }
            : s,
        ),
      ),

    addDocumentRequirement: (templateId, stepId, taskId, doc) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                tasks: s.tasks.map((task) => {
                  if (task.id !== taskId) return task;
                  const newDoc: DocumentRequirement = {
                    ...doc,
                    id: `doc-${Date.now()}`,
                    sort_order: task.documents.length,
                  };
                  return { ...task, documents: [...task.documents, newDoc] };
                }),
              }
            : s,
        ),
      ),

    updateDocumentRequirement: (templateId, stepId, taskId, docId, updates) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                tasks: s.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        documents: task.documents.map((d) =>
                          d.id === docId ? { ...d, ...updates } : d,
                        ),
                      }
                    : task,
                ),
              }
            : s,
        ),
      ),

    removeDocumentRequirement: (templateId, stepId, taskId, docId) =>
      patchSteps(templateId, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? {
                ...s,
                tasks: s.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        documents: task.documents
                          .filter((d) => d.id !== docId)
                          .map((d, i) => ({ ...d, sort_order: i })),
                      }
                    : task,
                ),
              }
            : s,
        ),
      ),

    // ---- Instance actions ----

    createInstance: (templateId, employeeId, employeeName, department) => {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) return null;

      const instanceId = `wf-inst-${Date.now()}`;
      const now = new Date().toISOString();

      const tasks: WorkflowTaskInstance[] = [];
      template.steps.forEach((step, stepIdx) => {
        step.tasks.forEach((task) => {
          const taskInstanceId = `${instanceId}-${task.id}`;
          const documents: DocumentInstance[] = (task.documents || []).map((doc) => ({
            id: `dinst-${Date.now()}-${doc.id}`,
            requirement_id: doc.id,
            task_instance_id: taskInstanceId,
            title: doc.title,
            is_required: doc.is_required,
            responsible_role: doc.responsible_role,
            status: 'pending' as DocumentSubmissionStatus,
            submitted_by: null,
            submitted_at: null,
            rejected_reason: null,
            note: null,
          }));

          tasks.push({
            id: taskInstanceId,
            template_task_id: task.id,
            step_index: stepIdx,
            title: task.title,
            assignee_role: task.assignee_role,
            is_required: task.is_required,
            sort_order: task.sort_order,
            status: 'pending',
            completed_by: null,
            completed_at: null,
            note: null,
            documents,
          });
        });
      });

      const draft: Omit<WorkflowInstance, 'id' | 'created_at'> = {
        template_id: template.id,
        template_name: template.name,
        type: template.type,
        employee_id: employeeId,
        employee_name: employeeName,
        department,
        status: 'in_progress',
        current_step: 0,
        total_steps: template.steps.length,
        step_names: template.steps.map((s) => s.title),
        tasks,
        started_at: now,
        completed_at: null,
      };

      set((state) => ({
        instances: [...state.instances, { ...draft, id: instanceId, created_at: now }],
      }));

      void api.createWorkflow(draft).then((saved) => {
        if (saved) {
          set((state) => ({
            instances: state.instances.map((i) => (i.id === instanceId ? saved : i)),
          }));
        } else {
          failSync();
        }
      });

      return instanceId;
    },

    completeTask: (instanceId, taskId, completedBy, note) =>
      patchInstance(instanceId, (inst) => {
        const updatedTasks = inst.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'completed' as WorkflowTaskStatus,
                completed_by: completedBy,
                completed_at: new Date().toISOString(),
                note: note || t.note,
              }
            : t,
        );

        // Check if current step required tasks are all completed
        const currentStepTasks = updatedTasks.filter((t) => t.step_index === inst.current_step);
        const requiredDone = currentStepTasks
          .filter((t) => t.is_required)
          .every((t) => t.status === 'completed' || t.status === 'skipped');

        let newStep = inst.current_step;
        let newStatus = inst.status;
        let completedAt = inst.completed_at;

        if (requiredDone && inst.current_step < inst.total_steps - 1) {
          newStep = inst.current_step + 1;
        } else if (requiredDone && inst.current_step === inst.total_steps - 1) {
          newStatus = 'completed';
          completedAt = new Date().toISOString();
        }

        return {
          tasks: updatedTasks,
          current_step: newStep,
          status: newStatus,
          completed_at: completedAt,
        };
      }),

    skipTask: (instanceId, taskId) =>
      patchInstance(instanceId, (inst) => ({
        tasks: inst.tasks.map((t) =>
          t.id === taskId && !t.is_required ? { ...t, status: 'skipped' as WorkflowTaskStatus } : t,
        ),
      })),

    cancelInstance: (instanceId) =>
      patchInstance(instanceId, () => ({
        status: 'cancelled' as WorkflowStatus,
        completed_at: new Date().toISOString(),
      })),

    // ---- Document instance actions ----

    submitDocument: (instanceId, taskId, docId, submittedBy) =>
      patchDocument(instanceId, taskId, docId, (d) => ({
        ...d,
        status: 'submitted' as DocumentSubmissionStatus,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString(),
        rejected_reason: null,
      })),

    rejectDocument: (instanceId, taskId, docId, reason) =>
      patchDocument(instanceId, taskId, docId, (d) => ({
        ...d,
        status: 'rejected' as DocumentSubmissionStatus,
        rejected_reason: reason,
      })),

    resetDocumentStatus: (instanceId, taskId, docId) =>
      patchDocument(instanceId, taskId, docId, (d) => ({
        ...d,
        status: 'pending' as DocumentSubmissionStatus,
        submitted_by: null,
        submitted_at: null,
        rejected_reason: null,
      })),
  };
});
