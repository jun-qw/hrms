'use client';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PreviewNotice } from '@/components/shared/preview-notice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

type Status = '미제출' | '검토중' | '완료';

const statusVariant = (s: Status): 'default' | 'secondary' | 'outline' => {
  switch (s) {
    case '완료': return 'default';
    case '검토중': return 'secondary';
    case '미제출': return 'outline';
  }
};

interface TaxEmployee {
  name: string;
  department: string;
  totalSalary: number;
  determinedTax: number;
  prepaidTax: number;
  status: Status;
}

const employees: TaxEmployee[] = [
  { name: '허승현', department: '개발팀', totalSalary: 54000000, determinedTax: 3240000, prepaidTax: 3600000, status: '완료' },
  { name: '이서연', department: '인사팀', totalSalary: 45600000, determinedTax: 2180000, prepaidTax: 2040000, status: '완료' },
  { name: '박준호', department: '영업팀', totalSalary: 50400000, determinedTax: 2870000, prepaidTax: 3150000, status: '검토중' },
  { name: '정유진', department: '마케팅팀', totalSalary: 43200000, determinedTax: 1950000, prepaidTax: 1800000, status: '완료' },
  { name: '최동현', department: '개발팀', totalSalary: 62400000, determinedTax: 4520000, prepaidTax: 4200000, status: '검토중' },
  { name: '한소희', department: '경영지원팀', totalSalary: 40800000, determinedTax: 1680000, prepaidTax: 1920000, status: '미제출' },
  { name: '송세아', department: '개발팀', totalSalary: 57600000, determinedTax: 3780000, prepaidTax: 3600000, status: '완료' },
  { name: '강미래', department: '디자인팀', totalSalary: 46800000, determinedTax: 2250000, prepaidTax: 2400000, status: '미제출' },
];

const data = employees.map((emp) => ({
  ...emp,
  difference: emp.determinedTax - emp.prepaidTax,
}));

const summaryStats = {
  totalEmployees: data.length,
  additionalPayment: data.filter((d) => d.difference > 0).length,
  refund: data.filter((d) => d.difference < 0).length,
  completed: data.filter((d) => d.status === '완료').length,
};

export default function YearEndTaxPage() {
  return (
    <div>
      <Breadcrumb />
      <PreviewNotice />
      <h1 className="text-2xl font-bold mb-6">연말정산</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">대상 인원</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.totalEmployees}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">추가납부</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{summaryStats.additionalPayment}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">환급</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{summaryStats.refund}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">처리완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summaryStats.completed}명</p>
          </CardContent>
        </Card>
      </div>

      {/* Year-End Tax Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">연말정산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사원명</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead className="text-right">총급여</TableHead>
                  <TableHead className="text-right">결정세액</TableHead>
                  <TableHead className="text-right">기납부세액</TableHead>
                  <TableHead className="text-right">차감징수세액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtWon(row.totalSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtWon(row.determinedTax)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtWon(row.prepaidTax)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${row.difference > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {row.difference > 0 ? '+' : ''}{fmtWon(row.difference)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {row.difference > 0 ? '(추가납부)' : '(환급)'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)} className="text-xs">
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">연말정산 처리 일정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">1월 중순</Badge>
              <p>간소화 서비스 개통 - 국세청 홈택스에서 소득/세액공제 증명자료 조회 및 다운로드</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">1월 말</Badge>
              <p>근로자 서류 제출 기한 - 소득/세액공제 신고서 및 증빙서류 회사 제출</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">2월</Badge>
              <p>원천징수영수증 발급 - 회사에서 연말정산 결과 반영 후 2월 급여에서 정산</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">3월 10일</Badge>
              <p>지급명세서 제출 - 회사에서 관할 세무서에 근로소득 지급명세서 제출</p>
            </div>
          </div>
          <p className="pt-2 border-t">
            차감징수세액이 <span className="text-destructive font-medium">양수(+)</span>이면 추가납부, <span className="text-primary font-medium">음수(-)</span>이면 환급됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
