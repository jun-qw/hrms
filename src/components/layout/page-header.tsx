import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 화면 머리말.
 *
 * 디자인 시안의 page header — 세리프 제목, 그 아래 한 줄 설명, 오른쪽에
 * 버튼 묶음이나 지표 묶음. 제목의 강조 낱말(`accent`)은 잉크블루 이탤릭로
 * 찍습니다. 인사 업무를 처음 맡은 사람이 메뉴 이름만 보고 화면의 용도를
 * 짐작해야 하는 상황을 없애기 위해 설명 한 줄은 그대로 둡니다.
 */
export function PageHeader({
  title,
  accent,
  hint,
  actions,
  aside,
  actionsPlacement = 'right',
  children,
  className,
}: {
  title: string;
  /** 제목 끝에 붙는 강조 낱말 — 이탤릭 잉크블루. */
  accent?: string;
  hint?: string;
  /** 오른쪽 버튼 묶음 */
  actions?: ReactNode;
  /** 오른쪽 큰 요소 — 지표 묶음(<KpiGrid>) 등. 버튼과 같이 쓰면 버튼이 위에 옵니다. */
  aside?: ReactNode;
  /**
   * 버튼 자리. 기본은 오른쪽. 오른쪽에 지표 묶음이 크게 들어가는 화면은
   * 버튼을 제목 아래로 내려 머리말 높이를 줄입니다.
   */
  actionsPlacement?: 'right' | 'under-title';
  /** 제목 아래 줄 — 기간 이동, 탭 등 */
  children?: ReactNode;
  className?: string;
}) {
  const actionsUnder = actionsPlacement === 'under-title';
  return (
    <div className={cn('mb-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-[560px]">
          <h1 className="font-serif text-[30px] font-medium leading-[1.05] tracking-[-0.025em] text-ink-900 text-balance">
            {title}
            {accent && (
              <>
                {' '}
                <em className="italic font-medium text-brand">{accent}</em>
              </>
            )}
          </h1>
          {hint && <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{hint}</p>}
          {actions && actionsUnder && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">{actions}</div>
          )}
        </div>
        {((actions && !actionsUnder) || aside) && (
          <div className="flex min-w-0 flex-col items-end gap-3">
            {actions && !actionsUnder && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">{actions}</div>
            )}
            {aside}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export interface Kpi {
  label: string;
  value: string | number;
  unit?: string;
  /** 작은 보조 줄 — 전월 대비, 기준 시점 등. */
  delta?: string;
  tone?: 'up' | 'down' | 'neutral';
}

/**
 * 지표 묶음 — 1px 선으로 붙어 있는 흰 칸들.
 *
 * 라벨은 작은 대문자, 숫자는 세리프. 값은 이미 형식을 갖춘 문자열이거나
 * 숫자이며, 숫자는 여기서 천 단위 쉼표를 찍습니다.
 */
export function KpiGrid({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-[10px] border border-ink-150 bg-ink-150',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(110px, 1fr))` }}
      aria-label="주요 지표"
    >
      {items.map((k) => (
        <div key={k.label} className="min-w-[112px] bg-card px-3.5 py-3">
          <div className="text-[11px] uppercase tracking-[0.06em] text-ink-500">{k.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5 font-serif text-[24px] font-medium tracking-[-0.02em] text-ink-900">
            {typeof k.value === 'number' ? k.value.toLocaleString('ko-KR') : k.value}
            {k.unit && <span className="font-sans text-[12px] font-medium text-ink-500">{k.unit}</span>}
          </div>
          {k.delta && (
            <div
              className={cn(
                'mt-0.5 font-mono text-[10.5px]',
                k.tone === 'up' ? 'text-success' : k.tone === 'down' ? 'text-danger' : 'text-ink-500',
              )}
            >
              {k.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
