'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { Employee } from '@/types';

export interface CardSection {
  id: string;
  label: string;
  /** Shown next to the label, e.g. how many rows the section holds. */
  count?: number;
}

/**
 * 사원카드 좌측 요약 패널.
 *
 * 탭 일곱 개를 오가는 대신, 사람을 식별하는 정보는 항상 화면에 남겨 두고 내용은
 * 오른쪽에서 이어서 읽습니다. 좌측 목차는 스크롤 위치를 따라가므로 지금 어느
 * 항목을 보고 있는지가 늘 드러납니다.
 */
export function EmployeeSummaryPanel({
  employee,
  photoUrl,
  sections,
}: {
  employee: Employee;
  photoUrl?: string | null;
  sections: CardSection[];
}) {
  const EMPLOYEE_STATUS = useCodeMap(CODE.EMPLOYEE_STATUS);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  // 스크롤에 따라 목차의 현재 항목을 갱신합니다.
  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      // 헤더 아래에서 화면 절반까지를 "지금 보는 구간"으로 봅니다.
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'on_leave':
        return 'secondary';
      case 'resigned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="lg:sticky lg:top-4 lg:h-fit lg:w-64 lg:shrink-0">
      <div className="rounded-md border bg-card p-4">
        <div className="flex items-start gap-3 lg:flex-col lg:items-center lg:text-center">
          <Avatar className="h-16 w-16 lg:h-24 lg:w-24">
            {photoUrl && <AvatarImage src={photoUrl} alt={`${employee.name} 사진`} />}
            <AvatarFallback className="text-xl">{employee.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 lg:flex-none">
            <div className="flex flex-wrap items-center gap-2 lg:justify-center">
              <h2 className="text-lg font-bold">{employee.name}</h2>
              <Badge variant={statusVariant(employee.status)}>
                {EMPLOYEE_STATUS[employee.status as keyof typeof EMPLOYEE_STATUS] ?? employee.status}
              </Badge>
            </div>
            {employee.name_en && (
              <p className="text-xs text-muted-foreground">{employee.name_en}</p>
            )}
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {employee.employee_number}
            </p>
            <p className="mt-1 text-sm">
              {[employee.position_rank?.name, employee.position_title?.name]
                .filter(Boolean)
                .join(' · ') || '직급·직책 미지정'}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 border-t pt-3 text-xs">
          <Row icon={Building2} value={employee.department?.name ?? '미배정'} />
          <Row icon={Calendar} value={`입사 ${employee.hire_date}`} />
          {employee.email && <Row icon={Mail} value={employee.email} />}
          {employee.phone && <Row icon={Phone} value={employee.phone} />}
        </dl>
      </div>

      <nav className="mt-3 hidden rounded-md border bg-card p-2 lg:block">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jump(section.id)}
            className={cn(
              'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors',
              activeId === section.id
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{section.label}</span>
            {section.count !== undefined && (
              <span className="text-xs tabular-nums opacity-70">{section.count}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Row({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
