'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogIn, LogOut, Plus } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineBoard } from '@/components/employee/pipeline-board';
import { BulkHireDialog } from '@/components/employee/bulk-hire-dialog';

export default function PipelinePage() {
  const [hireOpen, setHireOpen] = useState(false);

  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="입퇴사 진행"
        hint="사원을 등록하면 입사 프로세스가, 퇴사 처리를 하면 퇴사 프로세스가 자동으로 열립니다. 남은 항목은 이 화면에서 바로 완료 처리할 수 있습니다."
        actions={
          <>
            <Link href="/employees">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                인력대장
              </Button>
            </Link>
            <Button size="sm" onClick={() => setHireOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              일괄 입사등록
            </Button>
          </>
        }
      />

      <Tabs defaultValue="onboarding">
        <TabsList className="mb-4">
          <TabsTrigger value="onboarding" className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" />
            입사
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            퇴사
          </TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding">
          <PipelineBoard type="onboarding" />
        </TabsContent>
        <TabsContent value="offboarding">
          <PipelineBoard type="offboarding" />
        </TabsContent>
      </Tabs>

      <BulkHireDialog open={hireOpen} onOpenChange={setHireOpen} />
    </div>
  );
}
