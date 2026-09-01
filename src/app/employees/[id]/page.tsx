'use client';

import { use, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { EmployeeSummaryPanel } from '@/components/employee/employee-summary-panel';
import { EmployeeAssignmentHistory } from '@/components/employee/employee-assignment-history';
import { EmployeeFilesTab } from '@/components/employee/employee-files-tab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, FileText, ChevronDown, ClipboardList, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import EmployeePayrollTab from '@/components/employee/employee-payroll-tab';
import {
  CareerDialog,
  EducationDialog,
  CertificationDialog,
  FamilyDialog,
} from '@/components/employee/employee-sub-forms';
import type { CareerHistory, EducationHistory, Certification, FamilyMember } from '@/types';
import { toast } from 'sonner';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const assignments = useEmployeeStore((s) => s.assignments);

  // Store actions
  const addCareerHistory = useEmployeeStore((s) => s.addCareerHistory);
  const updateCareerHistory = useEmployeeStore((s) => s.updateCareerHistory);
  const deleteCareerHistory = useEmployeeStore((s) => s.deleteCareerHistory);
  const addEducationHistory = useEmployeeStore((s) => s.addEducationHistory);
  const updateEducationHistory = useEmployeeStore((s) => s.updateEducationHistory);
  const deleteEducationHistory = useEmployeeStore((s) => s.deleteEducationHistory);
  const addCertification = useEmployeeStore((s) => s.addCertification);
  const updateCertification = useEmployeeStore((s) => s.updateCertification);
  const deleteCertification = useEmployeeStore((s) => s.deleteCertification);
  const addFamilyMember = useEmployeeStore((s) => s.addFamilyMember);
  const updateFamilyMember = useEmployeeStore((s) => s.updateFamilyMember);
  const deleteFamilyMember = useEmployeeStore((s) => s.deleteFamilyMember);

  // Dialog state
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<CareerHistory | null>(null);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationHistory | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyMember | null>(null);

  const rawEmp = employees.find((e) => e.id === id);
  const employee = rawEmp
    ? {
        ...rawEmp,
        department: departments.find((d) => d.id === rawEmp.department_id),
        position_rank: positionRanks.find((r) => r.id === rawEmp.position_rank_id),
        position_title: positionTitles.find((t) => t.id === rawEmp.position_title_id),
      }
    : undefined;

  const career = careerHistories.filter((c) => c.employee_id === id).sort((a, b) => b.start_date.localeCompare(a.start_date));
  const education = educationHistories
    .filter((e) => e.employee_id === id)
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
  const certs = certifications
    .filter((c) => c.employee_id === id)
    .sort((a, b) => (b.issue_date ?? '').localeCompare(a.issue_date ?? ''));
  const family = familyMembers.filter((f) => f.employee_id === id);
  const assignmentCount = assignments.filter((a) => a.employee_id === id).length;

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

  // --- Handlers ---

  const handleCareerSubmit = (data: CareerHistory) => {
    if (editingCareer) {
      updateCareerHistory(data.id, data);
      toast.success('경력이 수정되었습니다.');
    } else {
      addCareerHistory(data);
      toast.success('경력이 등록되었습니다.');
    }
    setEditingCareer(null);
  };

  const handleCareerDelete = (cid: string) => {
    if (window.confirm('이 경력을 삭제하시겠습니까?')) {
      deleteCareerHistory(cid);
      toast.success('경력이 삭제되었습니다.');
    }
  };

  const handleEducationSubmit = (data: EducationHistory) => {
    if (editingEducation) {
      updateEducationHistory(data.id, data);
      toast.success('학력이 수정되었습니다.');
    } else {
      addEducationHistory(data);
      toast.success('학력이 등록되었습니다.');
    }
    setEditingEducation(null);
  };

  const handleEducationDelete = (eid: string) => {
    if (window.confirm('이 학력을 삭제하시겠습니까?')) {
      deleteEducationHistory(eid);
      toast.success('학력이 삭제되었습니다.');
    }
  };

  const handleCertSubmit = (data: Certification) => {
    if (editingCert) {
      updateCertification(data.id, data);
      toast.success('자격증이 수정되었습니다.');
    } else {
      addCertification(data);
      toast.success('자격증이 등록되었습니다.');
    }
    setEditingCert(null);
  };

  const handleCertDelete = (cid: string) => {
    if (window.confirm('이 자격증을 삭제하시겠습니까?')) {
      deleteCertification(cid);
      toast.success('자격증이 삭제되었습니다.');
    }
  };

  const handleFamilySubmit = (data: FamilyMember) => {
    if (editingFamily) {
      updateFamilyMember(data.id, data);
      toast.success('가족정보가 수정되었습니다.');
    } else {
      addFamilyMember(data);
      toast.success('가족정보가 등록되었습니다.');
    }
    setEditingFamily(null);
  };

  const handleFamilyDelete = (fid: string) => {
    if (window.confirm('이 가족정보를 삭제하시겠습니까?')) {
      deleteFamilyMember(fid);
      toast.success('가족정보가 삭제되었습니다.');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사원 상세</h1>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${id}/record-card`}>
            <Button variant="outline">
              <ClipboardList className="h-4 w-4 mr-2" />
              인사기록카드
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                증명서 발급
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employees/${id}/certificates/employment`}>재직증명서</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/employees/${id}/certificates/career`}>경력증명서</Link>
              </DropdownMenuItem>
              {employee.status === 'resigned' && (
                <DropdownMenuItem asChild>
                  <Link href={`/employees/${id}/certificates/retirement`}>퇴직증명서</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <EmployeeSummaryPanel
          employee={employee}
          sections={[
            { id: 'basic', label: '기본정보' },
            { id: 'assignments', label: '소속 이력', count: assignmentCount },
            { id: 'career', label: '경력사항', count: career.length },
            { id: 'education', label: '학력사항', count: education.length },
            { id: 'certification', label: '자격증', count: certs.length },
            { id: 'family', label: '가족사항', count: family.length },
            { id: 'files', label: '사진·서류' },
            { id: 'payroll', label: '급여' },
          ]}
        />

        <div className="min-w-0 flex-1 space-y-4">

        <section id="basic" className="scroll-mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-sm text-muted-foreground">사원번호</p><p className="font-medium">{employee.employee_number}</p></div>
              <div><p className="text-sm text-muted-foreground">이메일</p><p className="font-medium">{employee.email}</p></div>
              <div><p className="text-sm text-muted-foreground">전화번호</p><p className="font-medium">{employee.phone ?? '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">생년월일</p><p className="font-medium">{employee.birth_date ?? '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">주소</p><p className="font-medium">{employee.address ?? '-'} {employee.address_detail ?? ''}</p></div>
              <div><p className="text-sm text-muted-foreground">은행</p><p className="font-medium">{employee.bank_name ?? '-'} {employee.bank_account ?? ''}</p></div>
              <div><p className="text-sm text-muted-foreground">비상연락처</p><p className="font-medium">{employee.emergency_contact_name ? `${employee.emergency_contact_name} (${employee.emergency_contact_relation}) ${employee.emergency_contact_phone}` : '-'}</p></div>
            </CardContent>
          </Card>
        </section>

        <section id="assignments" className="scroll-mt-4">
          <EmployeeAssignmentHistory employeeId={id} />
        </section>

        <section id="career" className="scroll-mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">경력사항 ({career.length}건)</CardTitle>
              <Button size="sm" onClick={() => { setEditingCareer(null); setCareerDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                등록
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>회사명</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>직위</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {career.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          경력사항이 없습니다. 상단의 &quot;등록&quot; 버튼을 눌러 추가하세요.
                        </TableCell>
                      </TableRow>
                    ) : (
                      career.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.company_name}</TableCell>
                          <TableCell>{c.department ?? '-'}</TableCell>
                          <TableCell>{c.position ?? '-'}</TableCell>
                          <TableCell className="text-sm">{c.start_date} ~ {c.end_date ?? '현재'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description ?? '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingCareer(c); setCareerDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleCareerDelete(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="education" className="scroll-mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">학력사항 ({education.length}건)</CardTitle>
              <Button size="sm" onClick={() => { setEditingEducation(null); setEducationDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                등록
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학교명</TableHead>
                      <TableHead>전공</TableHead>
                      <TableHead>학위</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>졸업</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {education.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          학력사항이 없습니다. 상단의 &quot;등록&quot; 버튼을 눌러 추가하세요.
                        </TableCell>
                      </TableRow>
                    ) : (
                      education.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.school_name}</TableCell>
                          <TableCell>{e.major ?? '-'}</TableCell>
                          <TableCell>{e.degree ? DEGREE_LABELS[e.degree] ?? e.degree : '-'}</TableCell>
                          <TableCell className="text-sm">{e.start_date ?? '-'} ~ {e.end_date ?? '현재'}</TableCell>
                          <TableCell>
                            <Badge variant={e.is_graduated ? 'default' : 'secondary'}>
                              {e.is_graduated ? '졸업' : '재학'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingEducation(e); setEducationDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleEducationDelete(e.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="certification" className="scroll-mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">자격증 ({certs.length}건)</CardTitle>
              <Button size="sm" onClick={() => { setEditingCert(null); setCertDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                등록
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>자격증명</TableHead>
                      <TableHead>발급기관</TableHead>
                      <TableHead>취득일</TableHead>
                      <TableHead>만료일</TableHead>
                      <TableHead>번호</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          자격증이 없습니다. 상단의 &quot;등록&quot; 버튼을 눌러 추가하세요.
                        </TableCell>
                      </TableRow>
                    ) : (
                      certs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.issuer ?? '-'}</TableCell>
                          <TableCell>{c.issue_date ?? '-'}</TableCell>
                          <TableCell>{c.expiry_date ?? '없음'}</TableCell>
                          <TableCell className="font-mono text-xs">{c.certificate_number ?? '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingCert(c); setCertDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleCertDelete(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="family" className="scroll-mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">가족사항 ({family.length}명)</CardTitle>
              <Button size="sm" onClick={() => { setEditingFamily(null); setFamilyDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                등록
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>관계</TableHead>
                      <TableHead>생년월일</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>부양가족</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {family.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          가족사항이 없습니다. 상단의 &quot;등록&quot; 버튼을 눌러 추가하세요.
                        </TableCell>
                      </TableRow>
                    ) : (
                      family.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell>{f.relation}</TableCell>
                          <TableCell>{f.birth_date ?? '-'}</TableCell>
                          <TableCell>{f.phone ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant={f.is_dependent ? 'default' : 'outline'}>
                              {f.is_dependent ? '예' : '아니오'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingFamily(f); setFamilyDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleFamilyDelete(f.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="payroll" className="scroll-mt-4">
          <EmployeePayrollTab employee={employee} />
        </section>

        <section id="files" className="scroll-mt-4">
          <EmployeeFilesTab employeeId={id} />
        </section>
        </div>
      </div>

      {/* Dialogs */}
      <CareerDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        employeeId={id}
        initialData={editingCareer}
        onSubmit={handleCareerSubmit}
      />
      <EducationDialog
        open={educationDialogOpen}
        onOpenChange={setEducationDialogOpen}
        employeeId={id}
        initialData={editingEducation}
        onSubmit={handleEducationSubmit}
      />
      <CertificationDialog
        open={certDialogOpen}
        onOpenChange={setCertDialogOpen}
        employeeId={id}
        initialData={editingCert}
        onSubmit={handleCertSubmit}
      />
      <FamilyDialog
        open={familyDialogOpen}
        onOpenChange={setFamilyDialogOpen}
        employeeId={id}
        initialData={editingFamily}
        onSubmit={handleFamilySubmit}
      />
    </div>
  );
}
