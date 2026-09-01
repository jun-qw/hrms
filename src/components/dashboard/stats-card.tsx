import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  description?: string;
  icon: LucideIcon;
  color?: AccentColor;
  trend?: { value: number; label: string };
}

export function StatsCard({ title, value, description, icon: Icon, color = 'blue', trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconStyles[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
