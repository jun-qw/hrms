'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogIn, LogOut, Plus } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineBoard } from '@/components/employee/pipeline-board';
import { BulkHireDialog } from '@/components/employee/bulk-hire-dialog';

export default function PipelinePage() {
  const [hireOpen, setHireOpen] = useState(false);

  return (
    <div>
      <Breadcrumb />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">입퇴사 진행</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            사원을 등록하면 입사 프로세스가, 퇴사 처리를 하면 퇴사 프로세스가 자동으로 열립니다.
            남은 항목은 이 화면에서 바로 완료 처리할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employees">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              인력대장
            </Button>
          </Link>
          <Button onClick={() => setHireOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            일괄 입사등록
          </Button>
        </div>
      </div>

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
