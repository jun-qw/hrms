'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HeadcountChartProps {
  data: { department: string; count: number }[];
}

export function HeadcountChart({ data }: HeadcountChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">부서별 인원 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="department" className="text-xs" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
              />
              <Bar dataKey="count" fill="var(--color-accent-blue)" radius={[6, 6, 0, 0]} name="인원" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
