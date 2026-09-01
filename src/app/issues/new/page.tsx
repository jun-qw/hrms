'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useIssueStore } from '@/lib/stores/issue-store';
import { SimilarIssuesPanel } from '@/components/issues/similar-issues-panel';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { IssueType, IssuePriority } from '@/types';

export default function NewIssuePage() {
  const ISSUE_TYPES = useCodeMap(CODE.ISSUE_TYPES);
  const ISSUE_PRIORITY = useCodeMap(CODE.ISSUE_PRIORITY);
  const router = useRouter();
  const addIssue = useIssueStore((s) => s.addIssue);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('grievance');
  const [priority, setPriority] = useState<IssuePriority>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    const now = new Date().toISOString().split('T')[0];
    addIssue({
      id: `issue-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      status: 'open',
      reporter_id: null,
      assignee_id: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });

    toast.success('이슈가 등록되었습니다.');
    router.push('/issues');
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">이슈 등록</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">이슈 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  placeholder="이슈 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>유형</Label>
                  <Select value={type} onValueChange={(v) => setType(v as IssueType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ISSUE_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>우선순위</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ISSUE_PRIORITY).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  placeholder="이슈 내용을 상세히 기술하세요"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
            <Button type="submit">등록</Button>
          </div>
        </form>

        <div className="lg:col-span-1">
          <SimilarIssuesPanel title={title} description={description} />
        </div>
      </div>
    </div>
  );
}
