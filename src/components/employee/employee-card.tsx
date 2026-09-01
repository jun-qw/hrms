'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Building2, Calendar } from 'lucide-react';
import type { Employee } from '@/types';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';

interface EmployeeCardProps {
  employee: Employee;
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const EMPLOYEE_STATUS = useCodeMap(CODE.EMPLOYEE_STATUS);
  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'on_leave': return 'secondary';
      case 'resigned': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{employee.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{employee.name}</h3>
              {employee.name_en && (
                <span className="text-sm text-muted-foreground">{employee.name_en}</span>
              )}
              <Badge variant={statusVariant(employee.status)}>
                {EMPLOYEE_STATUS[employee.status as keyof typeof EMPLOYEE_STATUS] ?? employee.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employee_number} · {employee.position_rank?.name ?? ''} · {employee.position_title?.name ?? ''}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
              {employee.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {employee.department.name}
                </span>
              )}
              {employee.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {employee.email}
                </span>
              )}
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {employee.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> 입사 {employee.hire_date}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
