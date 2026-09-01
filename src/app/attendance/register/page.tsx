'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { AttendanceRegister } from '@/components/attendance/attendance-register';

export default function AttendanceRegisterPage() {
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="근태대장"
        hint="한 칸에 근태코드 한 글자를 적거나 실근로시간을 숫자로 적습니다. 엑셀에서 복사한 표는 Ctrl+V로 붙여넣습니다."
        actions={
          <Link href="/attendance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              근태관리
            </Button>
          </Link>
        }
      />
      <AttendanceRegister
        year={period.year}
        month={period.month}
        onPeriodChange={(year, month) => setPeriod({ year, month })}
      />
    </div>
  );
}
