'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { LeaveRegister } from '@/components/leave/leave-register';

export default function LeaveRegisterPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="연차대장"
        hint="입사일 기준 법정 일수와 실제 부여 일수를 나란히 놓고, 어긋난 사람과 소진이 늦은 사람을 짚어 줍니다."
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setYear((y) => y - 1)}
                aria-label="이전 연도"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-sm font-semibold tabular-nums">
                {year}년
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setYear((y) => y + 1)}
                aria-label="다음 연도"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Link href="/leave">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                휴가관리
              </Button>
            </Link>
          </>
        }
      />
      <LeaveRegister year={year} />
    </div>
  );
}
