'use client';

import { use, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { PrintLogo } from '@/components/shared/print-logo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function generateCertNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `CERT-${dateStr}-${rand}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
}

function calcPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

export default function CareerCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const appointments = useAppointmentStore((s) => s.appointments);
  const company = useSettingsStore((s) => s.company);

  const rawEmp = employees.find((e) => e.id === id);
  const employee = rawEmp
    ? {
        ...rawEmp,
        department: departments.find((d) => d.id === rawEmp.department_id),
        position_rank: positionRanks.find((r) => r.id === rawEmp.position_rank_id),
        position_title: positionTitles.find((t) => t.id === rawEmp.position_title_id),
      }
    : undefined;

  // Build career history from appointments
  const careerHistory = useMemo(() => {
    if (!employee) return [];
    const empAppointments = appointments
      .filter((a) => a.employee_id === id)
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date));

    if (empAppointments.length === 0) {
      // No appointment history — show current position
      return [
        {
          startDate: employee.hire_date,
          endDate: employee.status === 'resigned' ? (employee as any).resignation_date ?? '현재' : '현재',
          department: employee.department?.name ?? '-',
          rank: employee.position_rank?.name ?? '-',
          title: employee.position_title?.name ?? '-',
        },
      ];
    }

    const history: Array<{
      startDate: string;
      endDate: string;
      department: string;
      rank: string;
      title: string;
    }> = [];

    for (let i = 0; i < empAppointments.length; i++) {
      const appt = empAppointments[i];
      const nextAppt = empAppointments[i + 1];
      const dept = appt.new_department_id
        ? departments.find((d) => d.id === appt.new_department_id)?.name ?? '-'
        : (appt.prev_department_id ? departments.find((d) => d.id === appt.prev_department_id)?.name ?? '-' : '-');
      const rank = appt.new_position_rank_id
        ? positionRanks.find((r) => r.id === appt.new_position_rank_id)?.name ?? '-'
        : (appt.prev_position_rank_id ? positionRanks.find((r) => r.id === appt.prev_position_rank_id)?.name ?? '-' : '-');
      const title = appt.new_position_title_id
        ? positionTitles.find((t) => t.id === appt.new_position_title_id)?.name ?? '-'
        : '-';

      history.push({
        startDate: appt.effective_date,
        endDate: nextAppt ? nextAppt.effective_date : (employee.status === 'resigned' ? ((employee as any).resignation_date ?? '현재') : '현재'),
        department: dept,
        rank: rank,
        title: title,
      });
    }

    return history;
  }, [employee, appointments, id, departments, positionRanks, positionTitles]);

  if (!employee) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">사원 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayFormatted = formatDate(today.toISOString());
  const certNumber = generateCertNumber();
  const totalPeriod = calcPeriod(employee.hire_date, employee.status === 'resigned' ? ((employee as any).resignation_date ?? today.toISOString()) : today.toISOString());

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-2">
          <Link href={`/employees/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">경력증명서</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          인쇄
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto print-area">
        <CardContent className="p-10">
          {/* Certificate Number */}
          <div className="text-right text-sm text-muted-foreground mb-8">
            증명서 번호: {certNumber}
          </div>

          {/* Title */}
          <PrintLogo height={44} className="mb-6" />
          <h1 className="text-3xl font-bold text-center mb-12 tracking-widest">
            경 력 증 명 서
          </h1>

          {/* Personal Info */}
          <div className="space-y-4 mb-10">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">인적사항</h2>
            <div className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
              <span className="text-muted-foreground">성 명</span>
              <span className="font-medium">{employee.name}</span>
              <span className="text-muted-foreground">생년월일</span>
              <span className="font-medium">{employee.birth_date ? formatDate(employee.birth_date) : '-'}</span>
            </div>
          </div>

          {/* Career History Table */}
          <div className="space-y-4 mb-10">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">경력사항</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left py-2 pr-2 font-semibold">기간</th>
                  <th className="text-left py-2 px-2 font-semibold">부서</th>
                  <th className="text-left py-2 px-2 font-semibold">직급</th>
                  <th className="text-left py-2 pl-2 font-semibold">직책</th>
                </tr>
              </thead>
              <tbody>
                {careerHistory.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 pr-2">
                      {formatDate(row.startDate)} ~ {row.endDate === '현재' ? '현재' : formatDate(row.endDate)}
                    </td>
                    <td className="py-2 px-2">{row.department}</td>
                    <td className="py-2 px-2">{row.rank}</td>
                    <td className="py-2 pl-2">{row.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm mt-4">
              <span className="text-muted-foreground">총 근무기간: </span>
              <span className="font-semibold">{totalPeriod}</span>
            </div>
          </div>

          {/* Purpose */}
          <div className="text-center my-12 text-base leading-relaxed">
            <p>위와 같이 경력사항을 증명합니다.</p>
          </div>

          {/* Issue Date */}
          <div className="text-center text-sm mb-12">
            <p>{todayFormatted}</p>
          </div>

          {/* Company & Seal */}
          <div className="text-center space-y-2 relative">
            <p className="text-lg font-semibold">{company.name}</p>
            <p className="text-sm">대표이사 {company.ceo_name}</p>
            {/* Placeholder seal */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-red-500 text-red-500 text-xs font-bold absolute right-8 -top-2">
              <div className="text-center leading-tight">
                <div>{company.name.slice(0, 4)}</div>
                <div className="text-[10px]">직인</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
