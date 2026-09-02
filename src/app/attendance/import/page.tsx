'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { AttendanceImport } from '@/components/attendance/attendance-import';

export default function AttendanceImportPage() {
  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="근태 일괄 등록"
        hint="근태기기나 엑셀에서 뽑은 표를 붙여넣어 한 번에 등록합니다. 직원은 휴대폰 번호로 찾습니다."
        actions={
          <>
            <Link href="/attendance/register">
              <Button variant="outline" size="sm">근태대장</Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                근태관리
              </Button>
            </Link>
          </>
        }
      />
      <AttendanceImport year={new Date().getFullYear()} />
    </div>
  );
}
