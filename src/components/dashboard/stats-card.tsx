import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccentColor = 'blue' | 'green' | 'amber' | 'purple';

const iconStyles: Record<AccentColor, string> = {
  blue: 'bg-accent-blue-subtle text-accent-blue',
  green: 'bg-accent-green-subtle text-accent-green',
  amber: 'bg-accent-amber-subtle text-accent-amber',
  purple: 'bg-accent-purple-subtle text-accent-purple',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  /** 숫자 뒤에 붙는 단위. 값보다 작고 흐리게 나옵니다 — 55'명', 14'건'. */
  unit?: string;
  description?: string;
  icon: LucideIcon;
  color?: AccentColor;
  trend?: { value: number; label: string };
  /** 고른 카드는 채우지 않고 테두리만 진하게 합니다. */
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 지표 카드.
 *
 * 디자인 시안의 KPI 칸 — 라벨은 작은 대문자로 위에, 숫자는 세리프로 크게,
 * 단위는 숫자에 붙여 작게. 흰 면에 헤어라인 한 줄이고, 선택 상태는 색을
 * 채우는 대신 테두리를 먹색으로 바꿉니다.
 */
export function StatsCard({
  title,
  value,
  unit,
  description,
  icon: Icon,
  color = 'blue',
  trend,
  selected,
  onClick,
}: StatsCardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'rounded-[10px] border bg-card px-4 py-3 text-left transition-colors',
        selected ? 'border-ink-900' : 'border-ink-150',
        onClick && 'hover:border-ink-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.06em] text-ink-500">{title}</p>
        <div className={cn('rounded-md p-1', iconStyles[color])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="font-serif text-[24px] font-medium leading-none tracking-[-0.02em] text-ink-900">
          {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
        </span>
        {unit && <span className="text-[12px] font-medium text-ink-500">{unit}</span>}
      </p>
      {description && <p className="mt-1.5 font-mono text-[10.5px] text-ink-500">{description}</p>}
      {trend && (
        <p
          className={cn(
            'mt-1.5 font-mono text-[10.5px]',
            trend.value >= 0 ? 'text-success' : 'text-danger',
          )}
        >
          {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </Tag>
  );
}
