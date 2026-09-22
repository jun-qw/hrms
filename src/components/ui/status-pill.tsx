import { cn } from '@/lib/utils';

export type PillTone = 'success' | 'warn' | 'brand' | 'gold' | 'muted' | 'danger';

const TONE: Record<PillTone, string> = {
  success: 'bg-success-tint text-success',
  warn: 'bg-warn-tint text-warn',
  brand: 'bg-brand-tint text-brand',
  gold: 'bg-gold-tint text-gold',
  muted: 'bg-ink-100 text-ink-500',
  danger: 'bg-danger-tint text-danger',
};

/**
 * 상태 알약.
 *
 * 점 하나와 짧은 낱말. 재직·휴직·퇴직처럼 한눈에 갈라 봐야 하는 상태에
 * 씁니다. 색은 채도를 낮춘 상태색이라 화면의 액션색(먹색·잉크블루)과
 * 다투지 않습니다.
 */
export function StatusPill({
  tone = 'muted',
  children,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.01em]',
        TONE[tone],
        className,
      )}
    >
      <span className="h-[5px] w-[5px] rounded-full bg-current" />
      {children}
    </span>
  );
}

/** 사원 재직 상태 → 알약 색. */
export function employeeStatusTone(status: string): PillTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'on_leave':
      return 'warn';
    case 'resigned':
    case 'retired':
      return 'muted';
    default:
      return 'brand';
  }
}
