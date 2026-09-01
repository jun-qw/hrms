import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

/**
 * 화면 머리말.
 *
 * 제목 옆에 그 화면이 무엇을 하는 곳인지 한 줄을 붙입니다. 인사 업무를 처음
 * 맡은 사람이 메뉴 이름만 보고 화면의 용도를 짐작해야 하는 상황을 없애기
 * 위한 것으로, 국내 인사 제품에서 흔히 쓰는 배치를 따랐습니다.
 */
export function PageHeader({
  title,
  hint,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  /** 오른쪽 버튼 묶음 */
  actions?: ReactNode;
  /** 제목 아래 줄 — 기간 이동, 탭 등 */
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {hint && (
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <Info className="mt-[1px] h-3 w-3 shrink-0" />
              <span>{hint}</span>
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
