'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';

export default function NewAppointmentPage() {
  const APPOINTMENT_TYPES = useCodeMap(CODE.APPOINTMENT_TYPES);
  const router = useRouter();
  const employees = useEmployeeStore((s) => s.employees);
  const depts = useEmployeeStore((s) => s.departments);
  const ranks = useEmployeeStore((s) => s.positionRanks);
  const titles = useEmployeeStore((s) => s.positionTitles);
  const activeEmployees = useMemo(
    () => employees
      .filter((e) => e.status === 'active')
      .map((e) => ({
        ...e,
        department: depts.find((d) => d.id === e.department_id),
        position_rank: ranks.find((r) => r.id === e.position_rank_id),
        position_title: titles.find((t) => t.id === e.position_title_id),
      })),
    [employees, depts, ranks, titles],
  );
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const addAppointment = useAppointmentStore((s) => s.addAppointment);

  const [form, setForm] = useState({
    employee_id: '',
    type: '' as string,
    effective_date: '',
    prev_department_id: '',
    prev_position_rank_id: '',
    prev_position_title_id: '',
    new_department_id: '',
    new_position_rank_id: '',
    new_position_title_id: '',
    reason: '',
  });

  // When employee is selected, auto-fill "before" fields
  const handleEmployeeChange = (empId: string) => {
    const emp = activeEmployees.find((e) => e.id === empId);
    setForm((prev) => ({
      ...prev,
      employee_id: empId,
      prev_department_id: emp?.department_id ?? '',
      prev_position_rank_id: emp?.position_rank_id ?? '',
      prev_position_title_id: emp?.position_title_id ?? '',
      new_department_id: emp?.department_id ?? '',
      new_position_rank_id: emp?.position_rank_id ?? '',
      new_position_title_id: emp?.position_title_id ?? '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id || !form.type || !form.effective_date) {
      toast.error('필수 항목을 입력해주세요.');
      return;
    }

    addAppointment({
      id: `appt-${Date.now()}`,
      employee_id: form.employee_id,
      type: form.type as any,
      effective_date: form.effective_date,
      prev_department_id: form.prev_department_id || null,
      prev_position_rank_id: form.prev_position_rank_id || null,
      prev_position_title_id: form.prev_position_title_id || null,
      new_department_id: form.new_department_id || null,
      new_position_rank_id: form.new_position_rank_id || null,
      new_position_title_id: form.new_position_title_id || null,
      reason: form.reason || null,
      approval_id: null,
      created_at: new Date().toISOString(),
    });

    toast.success('발령이 등록되었습니다.');
    router.push('/appointments');
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">발령 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">발령 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>대상자</Label>
              <Select value={form.employee_id} onValueChange={handleEmployeeChange}>
                <SelectTrigger><SelectValue placeholder="사원 선택" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.employee_number}) - {e.department?.name} {e.position_rank?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>발령 유형</Label>
              <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue placeholder="유형 선택" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>발령일</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((prev) => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">변경 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">변경 전</h4>
                <div className="space-y-2">
                  <Label>부서</Label>
                  <Select value={form.prev_department_id} onValueChange={(v) => setForm((prev) => ({ ...prev, prev_department_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>직급</Label>
                  <Select value={form.prev_position_rank_id} onValueChange={(v) => setForm((prev) => ({ ...prev, prev_position_rank_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="직급 선택" /></SelectTrigger>
                    <SelectContent>
                      {positionRanks.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>직책</Label>
                  <Select value={form.prev_position_title_id} onValueChange={(v) => setForm((prev) => ({ ...prev, prev_position_title_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="직책 선택" /></SelectTrigger>
                    <SelectContent>
                      {positionTitles.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">변경 후</h4>
                <div className="space-y-2">
                  <Label>부서</Label>
                  <Select value={form.new_department_id} onValueChange={(v) => setForm((prev) => ({ ...prev, new_department_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>직급</Label>
                  <Select value={form.new_position_rank_id} onValueChange={(v) => setForm((prev) => ({ ...prev, new_position_rank_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="직급 선택" /></SelectTrigger>
                    <SelectContent>
                      {positionRanks.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>직책</Label>
                  <Select value={form.new_position_title_id} onValueChange={(v) => setForm((prev) => ({ ...prev, new_position_title_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="직책 선택" /></SelectTrigger>
                    <SelectContent>
                      {positionTitles.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>발령 사유</Label>
              <Textarea
                placeholder="발령 사유를 입력하세요"
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit">발령 등록</Button>
        </div>
      </form>
    </div>
  );
}
