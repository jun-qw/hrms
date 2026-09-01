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
 * 라벨은 위에 작게, 숫자는 크게, 단위는 숫자에 붙여 작게. 국내 인사 화면에서
 * 익숙한 배치이고, 숫자를 훑을 때 단위가 시선을 뺏지 않습니다. 카드는 그림자
 * 대신 헤어라인 한 줄로 구분하고, 선택 상태는 색을 채우는 대신 테두리를
 * 진하게 해서 옆 카드와 대비가 과해지지 않게 합니다.
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
        'rounded-lg border bg-card px-4 py-3.5 text-left transition-colors',
        selected ? 'border-foreground/70' : 'border-border',
        onClick && 'hover:border-foreground/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className={cn('rounded-md p-1.5', iconStyles[color])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-[26px] font-bold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {description && <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>}
      {trend && (
        <p
          className={cn(
            'mt-1.5 text-xs tabular-nums',
            trend.value >= 0 ? 'text-accent-green' : 'text-destructive',
          )}
        >
          {trend.value >= 0 ? '+' : ''}
          {trend.value}% {trend.label}
        </p>
      )}
    </Tag>
  );
}
