'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIssueStore } from '@/lib/stores/issue-store';
import { findSimilarTexts } from '@/lib/utils/text-similarity';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { HrIssue, IssueStatus } from '@/types';

interface SimilarIssuesPanelProps {
  title: string;
  description: string;
  excludeId?: string;
}

export function SimilarIssuesPanel({ title, description, excludeId }: SimilarIssuesPanelProps) {
  const ISSUE_STATUS = useCodeMap(CODE.ISSUE_STATUS);
  const issues = useIssueStore((s) => s.issues);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const queryText = `${title} ${description}`.trim();

  // 500ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryText), 500);
    return () => clearTimeout(timer);
  }, [queryText]);

  const candidates = useMemo(
    () => issues.filter((issue) => issue.id !== excludeId),
    [issues, excludeId],
  );

  const similarIssues = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return findSimilarTexts(
      debouncedQuery,
      candidates,
      (issue: HrIssue) => `${issue.title} ${issue.description}`,
      0.25,
      5,
    );
  }, [debouncedQuery, candidates]);

  if (similarIssues.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          유사한 이슈가 있습니다 ({similarIssues.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {similarIssues.map(({ item, score }) => (
          <Link key={item.id} href={`/issues/${item.id}`} target="_blank">
            <div className="p-3 border border-amber-200 rounded-lg hover:bg-amber-100/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate flex-1">{item.title}</span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {ISSUE_STATUS[item.status as IssueStatus]}
                  </Badge>
                  <span className="text-xs text-amber-600 font-medium">
                    {Math.round(score * 100)}% 유사
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
