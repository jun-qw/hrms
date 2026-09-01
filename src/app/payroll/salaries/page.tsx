'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { SalaryRegister } from '@/components/payroll/salary-register';

export default function SalariesPage() {
  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="급여 기준액"
        hint="월급제는 월 기본급을, 시급제는 시급을 입력합니다. 셀을 두 번 눌러 고치거나 엑셀에서 금액 열을 복사해 Ctrl+V로 붙여넣습니다."
        actions={
          <Link href="/payroll">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              급여관리
            </Button>
          </Link>
        }
      />
      <SalaryRegister />
    </div>
  );
}
