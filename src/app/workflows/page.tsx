'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ListChecks, Clock, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import WorkflowProgressCard from '@/components/workflow/workflow-progress-card';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const WORKFLOW_TYPE = useCodeMap(CODE.WORKFLOW_TYPE);
  const instances = useWorkflowStore((s) => s.instances);
  const templates = useWorkflowStore((s) => s.templates);
  const createInstance = useWorkflowStore((s) => s.createInstance);
  const realEmployees = useEmployeeStore((s) => s.employees);
  const realDepartments = useEmployeeStore((s) => s.departments);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDepartment, setEmployeeDepartment] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // SLA / 지연 체크
  const stats = useMemo(() => {
    const total = instances.length;
    const inProgress = instances.filter((i) => i.status === 'in_progress' || i.status === 'pending').length;
    const completed = instances.filter((i) => i.status === 'completed').length;
    // 7일 이상 진행중인 것은 지연으로 간주
    const now = new Date();
    const overdue = instances.filter((i) => {
      if (i.status === 'completed' || i.status === 'cancelled') return false;
      const started = new Date(i.started_at);
      const days = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }).length;
    // 평균 완료 일수
    const completedInstances = instances.filter((i) => i.status === 'completed' && i.completed_at);
    const avgDays = completedInstances.length > 0
      ? Math.round(completedInstances.reduce((sum, i) => {
          const s = new Date(i.started_at);
          const e = new Date(i.completed_at!);
          return sum + (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedInstances.length * 10) / 10
      : 0;
    return { total, inProgress, completed, overdue, avgDays };
  }, [instances]);

  const activeTemplates = templates.filter((t) => t.is_active);

  const filteredByType = (items: typeof instances) =>
    typeFilter === 'all' ? items : items.filter((i) => i.type === typeFilter);

  const inProgress = filteredByType(
    instances.filter((i) => i.status === 'in_progress' || i.status === 'pending')
  );
  const completed = filteredByType(
    instances.filter((i) => i.status === 'completed')
  );
  const all = filteredByType(instances);

  const handleCreate = () => {
    if (!selectedTemplate) {
      toast.error('템플릿을 선택해주세요.');
      return;
    }
    let empId = '';
    let empName = '';
    let empDept = '';
    if (selectedEmployeeId) {
      const emp = realEmployees.find((e) => e.id === selectedEmployeeId);
      if (emp) {
        empId = emp.id;
        empName = emp.name;
        const d = realDepartments.find((dep) => dep.id === emp.department_id);
        empDept = d?.name ?? '-';
      }
    } else if (employeeName.trim()) {
      empId = `e-${Date.now()}`;
      empName = employeeName.trim();
      empDept = employeeDepartment.trim() || '-';
    } else {
      toast.error('직원을 선택하거나 이름을 입력해주세요.');
      return;
    }
    const id = createInstance(selectedTemplate, empId, empName, empDept);
    if (id) {
      toast.success('프로세스가 시작되었습니다.');
      setDialogOpen(false);
      setSelectedTemplate('');
      setSelectedEmployeeId('');
      setEmployeeName('');
      setEmployeeDepartment('');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">업무프로세스</h1>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ListChecks className="h-4 w-4 mr-1" />
              템플릿 관리
            </Button>
          </Link>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            새 프로세스 시작
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">전체</p>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">진행중</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className={stats.overdue > 0 ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">지연 (7일+)</p>
              <AlertTriangle className={`h-4 w-4 ${stats.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">완료</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">평균 완료</p>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{stats.avgDays}일</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Label className="text-sm text-muted-foreground">유형:</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(WORKFLOW_TYPE).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="in_progress" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="in_progress">
            진행중 ({inProgress.length})
          </TabsTrigger>
          {stats.overdue > 0 && (
            <TabsTrigger value="overdue" className="gap-1 text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              지연 ({stats.overdue})
            </TabsTrigger>
          )}
          <TabsTrigger value="completed">
            완료 ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            전체 ({all.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress">
          <InstanceGrid instances={inProgress} />
        </TabsContent>
        {stats.overdue > 0 && (
          <TabsContent value="overdue">
            <InstanceGrid instances={inProgress.filter((i) => {
              const days = (Date.now() - new Date(i.started_at).getTime()) / (1000 * 60 * 60 * 24);
              return days >= 7;
            })} showOverdueDays />
          </TabsContent>
        )}
        <TabsContent value="completed">
          <InstanceGrid instances={completed} />
        </TabsContent>
        <TabsContent value="all">
          <InstanceGrid instances={all} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 프로세스 시작</DialogTitle>
            <DialogDescription>
              템플릿을 선택하고 대상 직원 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>프로세스 템플릿 *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({WORKFLOW_TYPE[t.type as keyof typeof WORKFLOW_TYPE]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>대상자 (재직 직원에서 선택)</Label>
              <Select value={selectedEmployeeId} onValueChange={(v) => {
                setSelectedEmployeeId(v);
                if (v) {
                  setEmployeeName('');
                  setEmployeeDepartment('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="직원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {realEmployees.filter((e) => e.status === 'active').map((e) => {
                    const dept = realDepartments.find((d) => d.id === e.department_id);
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.employee_number}) - {dept?.name ?? '-'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">또는 신입사원/외부인 등 직접 입력 ↓</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>직원명 (직접 입력)</Label>
                <Input
                  value={employeeName}
                  onChange={(e) => {
                    setEmployeeName(e.target.value);
                    if (e.target.value) setSelectedEmployeeId('');
                  }}
                  placeholder="이름"
                  disabled={!!selectedEmployeeId}
                />
              </div>
              <div className="space-y-2">
                <Label>부서</Label>
                <Input
                  value={employeeDepartment}
                  onChange={(e) => setEmployeeDepartment(e.target.value)}
                  placeholder="부서"
                  disabled={!!selectedEmployeeId}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>시작</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstanceGrid({
  instances,
  showOverdueDays,
}: {
  instances: ReturnType<typeof useWorkflowStore.getState>['instances'];
  showOverdueDays?: boolean;
}) {
  if (instances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        해당하는 프로세스가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {instances.map((inst) => {
        const days = Math.floor((Date.now() - new Date(inst.started_at).getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div key={inst.id} className="relative">
            {showOverdueDays && (
              <Badge variant="destructive" className="absolute top-2 right-2 z-10 text-xs">
                {days}일 지연
              </Badge>
            )}
            <WorkflowProgressCard instance={inst} />
          </div>
        );
      })}
    </div>
  );
}
