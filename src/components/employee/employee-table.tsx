'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Employee } from '@/types';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';

interface EmployeeTableProps {
  employees: Employee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const EMPLOYEE_STATUS = useCodeMap(CODE.EMPLOYEE_STATUS);
  const EMPLOYMENT_TYPES = useCodeMap(CODE.EMPLOYMENT_TYPES);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = employees.filter(
    (e) =>
      e.name.includes(search) ||
      e.employee_number.includes(search) ||
      e.email.includes(search) ||
      e.department?.name?.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'on_leave': return 'secondary';
      case 'resigned': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 사번, 이메일, 부서 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          총 {filtered.length}명
        </span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">사번</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>직급</TableHead>
              <TableHead>직책</TableHead>
              <TableHead>고용형태</TableHead>
              <TableHead>입사일</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                  <TableCell>
                    <Link href={`/employees/${emp.id}`} className="flex items-center gap-2 hover:underline">
                      <Avatar className="h-7 w-7">
                        {emp.profile_image_url && (
                          <AvatarImage src={emp.profile_image_url} alt={emp.name} />
                        )}
                        <AvatarFallback className="text-xs">{emp.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{emp.department?.name ?? '-'}</TableCell>
                  <TableCell>{emp.position_rank?.name ?? '-'}</TableCell>
                  <TableCell>{emp.position_title?.name ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {EMPLOYMENT_TYPES[emp.employment_type] ?? emp.employment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{emp.hire_date}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(emp.status)} className="text-xs">
                      {EMPLOYEE_STATUS[emp.status] ?? emp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
