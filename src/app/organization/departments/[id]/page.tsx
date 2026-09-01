'use client';

import { use } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const departments = useEmployeeStore((s) => s.departments);
  const employees = useEmployeeStore((s) => s.employees);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  const dept = departments.find((d) => d.id === id);
  const parentDept = dept?.parent_id ? departments.find((d) => d.id === dept.parent_id) : null;
  const deptEmployees = employees
    .filter((e) => e.department_id === id && e.status === 'active')
    .map((e) => ({
      ...e,
      rankName: positionRanks.find((r) => r.id === e.position_rank_id)?.name ?? '',
      titleName: positionTitles.find((t) => t.id === e.position_title_id)?.name ?? '',
    }))
    .sort((a, b) => {
      const ra = positionRanks.find((r) => r.id === a.position_rank_id)?.level ?? 0;
      const rb = positionRanks.find((r) => r.id === b.position_rank_id)?.level ?? 0;
      return rb - ra;
    });

  if (!dept) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-center py-12 text-muted-foreground">부서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{dept.name}</h1>
        <Badge variant="outline">{dept.code}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">부서 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">부서명</p>
              <p className="font-medium">{dept.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">부서코드</p>
              <p className="font-medium">{dept.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상위부서</p>
              <p className="font-medium">{parentDept?.name ?? '없음 (최상위)'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">인원</p>
              <p className="font-medium flex items-center gap-1">
                <Users className="h-4 w-4" />
                {deptEmployees.length}명
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">소속 직원 ({deptEmployees.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            {deptEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">소속 직원이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {deptEmployees.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(emp.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                        alt={emp.name}
                      />
                      <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{emp.name}</span>
                        <Badge variant="secondary" className="text-xs">{emp.rankName}</Badge>
                        {emp.titleName && emp.titleName !== '팀원' && (
                          <Badge variant="outline" className="text-xs">{emp.titleName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {emp.email}
                        </span>
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {emp.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
