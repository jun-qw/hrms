'use client';

import { use } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { usePayrollStore, MONTHLY_WORK_HOURS } from '@/lib/stores/payroll-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const fmtDate = (s: string | null) => {
  if (!s) return '-';
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

function calcServicePeriod(hireDate: string): string {
  const hire = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

const genderLabel = (g: string | null) => {
  if (g === 'M') return '남';
  if (g === 'F') return '여';
  return '-';
};

const empTypeLabel = (t: string) => {
  switch (t) {
    case 'regular': return '정규직';
    case 'contract': return '계약직';
    case 'parttime': return '파트타임';
    case 'intern': return '인턴';
    default: return t;
  }
};

export default function RecordCardPage({ params }: { params: Promise<{ id: string }> }) {
  const DEGREE_LABELS = useCodeMap(CODE.DEGREE_LABELS);
  const { id } = use(params);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const careerHistories = useEmployeeStore((s) => s.careerHistories);
  const educationHistories = useEmployeeStore((s) => s.educationHistories);
  const certifications = useEmployeeStore((s) => s.certifications);
  const familyMembers = useEmployeeStore((s) => s.familyMembers);
  const company = useSettingsStore((s) => s.company);
  const employeePayrollSettings = usePayrollStore((s) => s.employeePayrollSettings);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const appointments = useAppointmentStore((s) => s.appointments);

  const rawEmp = employees.find((e) => e.id === id);
  const employee = rawEmp ? {
    ...rawEmp,
    department: departments.find((d) => d.id === rawEmp.department_id),
    position_rank: positionRanks.find((r) => r.id === rawEmp.position_rank_id),
    position_title: positionTitles.find((t) => t.id === rawEmp.position_title_id),
  } : undefined;

  const career = careerHistories.filter((c) => c.employee_id === id);
  const education = educationHistories.filter((e) => e.employee_id === id);
  const certs = certifications.filter((c) => c.employee_id === id);
  const family = familyMembers.filter((f) => f.employee_id === id);
  const payrollSettings = employeePayrollSettings.filter((s) => s.employee_id === id && s.is_active);
  const empAppointments = appointments.filter((a) => a.employee_id === id).sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  const annualBalance = leaveBalances.find((b) => b.employee_id === id && b.year === new Date().getFullYear() && b.leave_type_id === leaveTypes.find((lt) => lt.code === 'annual')?.id);

  if (!employee) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">사원 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const today = fmtDate(new Date().toISOString().split('T')[0]);
  const hourlyWage = Math.round(employee.base_salary / MONTHLY_WORK_HOURS);
  const totalAllowance = payrollSettings.filter((s) => s.category === 'earning').reduce((sum, s) => sum + s.amount, 0);

  // Section render helper
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-gray-100 px-3 py-1.5 font-bold text-sm border-b border-t">{children}</div>
  );

  const InfoRow = ({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: number }) => (
    <div className={`px-3 py-1.5 border-b flex ${span === 2 ? 'col-span-2' : ''}`}>
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <Breadcrumb />
      </div>
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold">인사기록카드</h1>
        <div className="flex gap-2">
          <Link href={`/employees/${id}`}>
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />사원 상세</Button>
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />인쇄
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto print-area">
        <CardContent className="p-6 space-y-0">
          {/* Header */}
          <div className="relative border-b-2 border-black pb-4 mb-0">
            <div className="text-center">
                        <p className="text-xs text-muted-foreground">{company.name}</p>
                        <h2 className="text-2xl font-bold tracking-widest mt-1">인 사 기 록 카 드</h2>
                        <p className="text-xs text-muted-foreground mt-1">작성일: {today}</p>
            </div>
            {/* 증명사진 — 인사기록카드 규격 */}
            <div className="absolute right-0 top-0 flex h-[120px] w-[90px] items-center justify-center overflow-hidden border bg-muted/20">
              {employee.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from a DB route
                <img
                  src={employee.profile_image_url}
                  alt={`${employee.name} 증명사진`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">사진</span>
              )}
            </div>
          </div>

          {/* 1. 인적사항 */}
          <SectionTitle>인적사항</SectionTitle>
          <div className="grid grid-cols-2 border-l border-r">
            <InfoRow label="사원번호" value={employee.employee_number} />
            <InfoRow label="성명" value={employee.name} />
            <InfoRow label="영문명" value={employee.name_en ?? '-'} />
            <InfoRow label="성별" value={genderLabel(employee.gender)} />
            <InfoRow label="생년월일" value={fmtDate(employee.birth_date)} />
            <InfoRow label="연락처" value={employee.phone ?? '-'} />
            <InfoRow label="이메일" value={employee.email} span={2} />
            <InfoRow label="주소" value={`${employee.address ?? '-'} ${employee.address_detail ?? ''}`} span={2} />
            <InfoRow label="우편번호" value={employee.zip_code ?? '-'} />
            <InfoRow label="상태" value={
              <Badge variant={employee.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                {employee.status === 'active' ? '재직' : employee.status === 'resigned' ? '퇴직' : employee.status}
              </Badge>
            } />
          </div>

          {/* 2. 재직사항 */}
          <SectionTitle>재직사항</SectionTitle>
          <div className="grid grid-cols-2 border-l border-r">
            <InfoRow label="부서" value={employee.department?.name ?? '-'} />
            <InfoRow label="직급" value={employee.position_rank?.name ?? '-'} />
            <InfoRow label="직책" value={employee.position_title?.name ?? '-'} />
            <InfoRow label="고용형태" value={empTypeLabel(employee.employment_type)} />
            <InfoRow label="입사일" value={fmtDate(employee.hire_date)} />
            <InfoRow label="근속기간" value={calcServicePeriod(employee.hire_date)} />
            {employee.resignation_date && (
              <InfoRow label="퇴사일" value={fmtDate(employee.resignation_date)} span={2} />
            )}
          </div>

          {/* 3. 급여사항 */}
          <SectionTitle>급여사항</SectionTitle>
          <div className="grid grid-cols-2 border-l border-r">
            <InfoRow label="기본급" value={fmtWon(employee.base_salary)} />
            <InfoRow label="통상시급" value={fmtWon(hourlyWage)} />
            <InfoRow label="은행" value={employee.bank_name ?? '-'} />
            <InfoRow label="계좌번호" value={employee.bank_account ?? '-'} />
          </div>
          {payrollSettings.length > 0 && (
            <div className="border-l border-r border-b">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">수당항목</th>
                    <th className="text-right px-3 py-1 text-xs font-medium text-muted-foreground">금액</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">적용기간</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollSettings.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-1">{s.item_name}</td>
                      <td className="px-3 py-1 text-right font-mono">{fmtWon(s.amount)}</td>
                      <td className="px-3 py-1 text-xs">{s.effective_from} ~ {s.effective_to ?? '계속'}</td>
                      <td className="px-3 py-1 text-xs text-muted-foreground">{s.note ?? ''}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-bold">
                    <td className="px-3 py-1">수당 합계</td>
                    <td className="px-3 py-1 text-right font-mono">{fmtWon(totalAllowance)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 4. 연차 현황 */}
          {annualBalance && (
            <>
              <SectionTitle>연차 현황 ({new Date().getFullYear()}년)</SectionTitle>
              <div className="grid grid-cols-3 border-l border-r">
                <InfoRow label="총 연차" value={`${annualBalance.total_days}일`} />
                <InfoRow label="사용" value={`${annualBalance.used_days}일`} />
                <InfoRow label="잔여" value={`${annualBalance.remaining_days}일`} />
              </div>
            </>
          )}

          {/* 5. 학력사항 */}
          <SectionTitle>학력사항</SectionTitle>
          {education.length === 0 ? (
            <div className="border-l border-r border-b px-3 py-3 text-sm text-muted-foreground text-center">학력사항 없음</div>
          ) : (
            <div className="border-l border-r border-b">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">학교명</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">전공</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">학위</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">기간</th>
                    <th className="text-center px-3 py-1 text-xs font-medium text-muted-foreground">졸업</th>
                  </tr>
                </thead>
                <tbody>
                  {education.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-1 font-medium">{e.school_name}</td>
                      <td className="px-3 py-1">{e.major ?? '-'}</td>
                      <td className="px-3 py-1">{e.degree ? (DEGREE_LABELS as Record<string, string>)[e.degree] ?? e.degree : '-'}</td>
                      <td className="px-3 py-1 text-xs">{e.start_date ?? ''} ~ {e.end_date ?? '현재'}</td>
                      <td className="px-3 py-1 text-center">{e.is_graduated ? '졸업' : '재학'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. 경력사항 */}
          <SectionTitle>경력사항</SectionTitle>
          {career.length === 0 ? (
            <div className="border-l border-r border-b px-3 py-3 text-sm text-muted-foreground text-center">경력사항 없음</div>
          ) : (
            <div className="border-l border-r border-b">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">회사명</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">부서</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">직위</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">기간</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">내용</th>
                  </tr>
                </thead>
                <tbody>
                  {career.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-1 font-medium">{c.company_name}</td>
                      <td className="px-3 py-1">{c.department ?? '-'}</td>
                      <td className="px-3 py-1">{c.position ?? '-'}</td>
                      <td className="px-3 py-1 text-xs">{c.start_date} ~ {c.end_date ?? '현재'}</td>
                      <td className="px-3 py-1 text-xs text-muted-foreground">{c.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. 자격증 */}
          <SectionTitle>자격/면허</SectionTitle>
          {certs.length === 0 ? (
            <div className="border-l border-r border-b px-3 py-3 text-sm text-muted-foreground text-center">자격증 없음</div>
          ) : (
            <div className="border-l border-r border-b">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">자격증명</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">발급기관</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">취득일</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">만료일</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">번호</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-1 font-medium">{c.name}</td>
                      <td className="px-3 py-1">{c.issuer ?? '-'}</td>
                      <td className="px-3 py-1 text-xs">{c.issue_date ?? '-'}</td>
                      <td className="px-3 py-1 text-xs">{c.expiry_date ?? '없음'}</td>
                      <td className="px-3 py-1 text-xs font-mono">{c.certificate_number ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. 가족사항 */}
          <SectionTitle>가족사항</SectionTitle>
          {family.length === 0 ? (
            <div className="border-l border-r border-b px-3 py-3 text-sm text-muted-foreground text-center">가족사항 없음</div>
          ) : (
            <div className="border-l border-r border-b">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">성명</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">관계</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">생년월일</th>
                    <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">연락처</th>
                    <th className="text-center px-3 py-1 text-xs font-medium text-muted-foreground">부양가족</th>
                  </tr>
                </thead>
                <tbody>
                  {family.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="px-3 py-1 font-medium">{f.name}</td>
                      <td className="px-3 py-1">{f.relation}</td>
                      <td className="px-3 py-1 text-xs">{f.birth_date ?? '-'}</td>
                      <td className="px-3 py-1 text-xs">{f.phone ?? '-'}</td>
                      <td className="px-3 py-1 text-center">{f.is_dependent ? 'O' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 9. 비상연락처 */}
          <SectionTitle>비상연락처</SectionTitle>
          <div className="grid grid-cols-3 border-l border-r border-b">
            <InfoRow label="성명" value={employee.emergency_contact_name ?? '-'} />
            <InfoRow label="관계" value={employee.emergency_contact_relation ?? '-'} />
            <InfoRow label="연락처" value={employee.emergency_contact_phone ?? '-'} />
          </div>

          {/* 10. 인사발령 이력 */}
          {empAppointments.length > 0 && (
            <>
              <SectionTitle>인사발령 이력</SectionTitle>
              <div className="border-l border-r border-b">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">발령일</th>
                      <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">유형</th>
                      <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">변경 전</th>
                      <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">변경 후</th>
                      <th className="text-left px-3 py-1 text-xs font-medium text-muted-foreground">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empAppointments.map((a) => {
                      const prevDept = a.prev_department_id ? departments.find((d) => d.id === a.prev_department_id)?.name : null;
                      const prevRank = a.prev_position_rank_id ? positionRanks.find((r) => r.id === a.prev_position_rank_id)?.name : null;
                      const newDept = a.new_department_id ? departments.find((d) => d.id === a.new_department_id)?.name : null;
                      const newRank = a.new_position_rank_id ? positionRanks.find((r) => r.id === a.new_position_rank_id)?.name : null;
                      const typeMap: Record<string, string> = { promotion: '승진', transfer: '전보', title_change: '직책변경', hire: '입사', resignation: '퇴사', other: '기타' };
                      return (
                        <tr key={a.id} className="border-t">
                          <td className="px-3 py-1 text-xs">{a.effective_date}</td>
                          <td className="px-3 py-1">{typeMap[a.type] ?? a.type}</td>
                          <td className="px-3 py-1 text-xs">{prevDept && prevRank ? `${prevDept}/${prevRank}` : '-'}</td>
                          <td className="px-3 py-1 text-xs">{newDept && newRank ? `${newDept}/${newRank}` : '-'}</td>
                          <td className="px-3 py-1 text-xs text-muted-foreground">{a.reason ?? ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-8 text-center border-t-2 border-black mt-4">
            <p className="text-sm">위 사항은 사실과 틀림없음을 확인합니다.</p>
            <p className="text-sm mt-6">{today}</p>
            <p className="text-lg font-bold mt-4">{company.name}</p>
            <p className="text-sm text-muted-foreground mt-1">대표이사 {company.ceo_name}</p>
            <div className="mt-4 inline-block border-2 border-red-400 rounded-full px-6 py-2 text-red-400 text-sm font-bold opacity-50">
              직 인
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
