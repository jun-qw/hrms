'use client';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PreviewNotice } from '@/components/shared/preview-notice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

interface SeveranceEmployee {
  name: string;
  department: string;
  hireDate: string;
  yearsOfService: number;
  avgSalary3Months: number;
  estimatedSeverance: number;
  fundingStatus: '적립완료' | '적립중' | '미적립';
}

const employees: SeveranceEmployee[] = [
  { name: '허승현', department: '개발팀', hireDate: '2019-03-15', yearsOfService: 7.1, avgSalary3Months: 4600000, estimatedSeverance: 32660000, fundingStatus: '적립완료' },
  { name: '이서연', department: '인사팀', hireDate: '2021-07-01', yearsOfService: 4.8, avgSalary3Months: 3900000, estimatedSeverance: 18720000, fundingStatus: '적립중' },
  { name: '박준호', department: '영업팀', hireDate: '2018-01-10', yearsOfService: 8.2, avgSalary3Months: 4300000, estimatedSeverance: 35260000, fundingStatus: '적립완료' },
  { name: '정유진', department: '마케팅팀', hireDate: '2022-04-20', yearsOfService: 3.9, avgSalary3Months: 3700000, estimatedSeverance: 14430000, fundingStatus: '적립중' },
  { name: '최동현', department: '개발팀', hireDate: '2017-09-05', yearsOfService: 8.6, avgSalary3Months: 5400000, estimatedSeverance: 46440000, fundingStatus: '적립완료' },
  { name: '한소희', department: '경영지원팀', hireDate: '2023-02-13', yearsOfService: 3.1, avgSalary3Months: 3500000, estimatedSeverance: 10850000, fundingStatus: '미적립' },
  { name: '송세아', department: '개발팀', hireDate: '2020-06-01', yearsOfService: 5.8, avgSalary3Months: 4900000, estimatedSeverance: 28420000, fundingStatus: '적립중' },
  { name: '강미래', department: '디자인팀', hireDate: '2022-11-14', yearsOfService: 3.4, avgSalary3Months: 4000000, estimatedSeverance: 13600000, fundingStatus: '미적립' },
];

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  switch (s) {
    case '적립완료': return 'default';
    case '적립중': return 'secondary';
    case '미적립': return 'outline';
    default: return 'outline';
  }
};

const totalEstimatedSeverance = employees.reduce((sum, e) => sum + e.estimatedSeverance, 0);
const avgSeverance = Math.round(totalEstimatedSeverance / employees.length);
const retireeThisYear = 1;

export default function SeverancePage() {
  return (
    <div>
      <Breadcrumb />
      <PreviewNotice />
      <h1 className="text-2xl font-bold mb-6">퇴직금 관리</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">퇴직금 적립 대상</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{employees.length}명</p>
            <p className="text-xs text-muted-foreground mt-1">1년 이상 근속자</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">금년 퇴직자</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{retireeThisYear}명</p>
            <p className="text-xs text-muted-foreground mt-1">2026년 기준</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">평균 퇴직금</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtWon(avgSeverance)}</p>
            <p className="text-xs text-muted-foreground mt-1">1인 평균 예상액</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 적립액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtWon(totalEstimatedSeverance)}</p>
            <p className="text-xs text-muted-foreground mt-1">전 직원 예상 퇴직금 합계</p>
          </CardContent>
        </Card>
      </div>

      {/* Severance Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">사원별 퇴직금 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사원명</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead className="text-right">근속연수</TableHead>
                  <TableHead className="text-right">평균임금(3개월)</TableHead>
                  <TableHead className="text-right">예상 퇴직금</TableHead>
                  <TableHead>적립현황</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.name}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="text-sm">{emp.hireDate}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{emp.yearsOfService}년</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtWon(emp.avgSalary3Months)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmtWon(emp.estimatedSeverance)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(emp.fundingStatus)} className="text-xs">
                        {emp.fundingStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Formula Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">퇴직금 산정 공식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-lg font-bold text-foreground">
              퇴직금 = 1일 평균임금 x 30일 x (총 근속일수 / 365)
            </p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p><span className="font-medium text-foreground">1일 평균임금</span> = 퇴직 전 3개월간 지급된 임금 총액 / 해당 기간의 총 일수</p>
            <p><span className="font-medium text-foreground">총 근속일수</span> = 입사일부터 퇴직일까지의 재직일수</p>
            <p><span className="font-medium text-foreground">적용 기준</span> = 근로기준법 제34조에 의거, 1년 이상 근속한 근로자에게 지급</p>
          </div>
          <p className="pt-2 border-t text-muted-foreground">
            퇴직금은 퇴직일로부터 14일 이내에 지급해야 하며, 퇴직연금제도(DB/DC형)를 통해 사전 적립할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
