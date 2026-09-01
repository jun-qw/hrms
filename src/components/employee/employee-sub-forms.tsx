'use client';

import { useEffect, useState } from 'react';
import type {
  CareerHistory,
  EducationHistory,
  Certification,
  FamilyMember,
  DegreeType,
} from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ---------------------------------------------------------------------------
// CareerDialog
// ---------------------------------------------------------------------------

interface CareerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  initialData?: CareerHistory | null;
  onSubmit: (data: CareerHistory) => void;
}

export function CareerDialog({ open, onOpenChange, employeeId, initialData, onSubmit }: CareerDialogProps) {
  const [form, setForm] = useState<CareerHistory>({
    id: '',
    employee_id: employeeId,
    company_name: '',
    department: '',
    position: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({
          id: genId('ch'),
          employee_id: employeeId,
          company_name: '',
          department: '',
          position: '',
          start_date: '',
          end_date: '',
          description: '',
        });
      }
    }
  }, [open, initialData, employeeId]);

  const handleSubmit = () => {
    if (!form.company_name || !form.start_date) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? '경력 수정' : '경력 등록'}</DialogTitle>
          <DialogDescription>이전 회사의 경력 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>회사명 *</Label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="예) ABC 주식회사"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>부서</Label>
              <Input
                value={form.department ?? ''}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="예) 개발팀"
              />
            </div>
            <div className="space-y-2">
              <Label>직위</Label>
              <Input
                value={form.position ?? ''}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="예) 대리"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>입사일 *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>퇴사일</Label>
              <Input
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>업무내용</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="담당 업무 및 주요 프로젝트"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit}>{initialData ? '수정' : '등록'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EducationDialog
// ---------------------------------------------------------------------------

interface EducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  initialData?: EducationHistory | null;
  onSubmit: (data: EducationHistory) => void;
}

export function EducationDialog({ open, onOpenChange, employeeId, initialData, onSubmit }: EducationDialogProps) {
  const DEGREE_LABELS = useCodeMap(CODE.DEGREE_LABELS);

  const [form, setForm] = useState<EducationHistory>({
    id: '',
    employee_id: employeeId,
    school_name: '',
    major: '',
    degree: null,
    start_date: '',
    end_date: '',
    is_graduated: true,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({
          id: genId('eh'),
          employee_id: employeeId,
          school_name: '',
          major: '',
          degree: null,
          start_date: '',
          end_date: '',
          is_graduated: true,
        });
      }
    }
  }, [open, initialData, employeeId]);

  const handleSubmit = () => {
    if (!form.school_name) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? '학력 수정' : '학력 등록'}</DialogTitle>
          <DialogDescription>학력 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>학교명 *</Label>
            <Input
              value={form.school_name}
              onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              placeholder="예) 서울대학교"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>전공</Label>
              <Input
                value={form.major ?? ''}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
                placeholder="예) 컴퓨터공학"
              />
            </div>
            <div className="space-y-2">
              <Label>학위</Label>
              <Select
                value={form.degree ?? ''}
                onValueChange={(v) => setForm({ ...form, degree: (v || null) as DegreeType | null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="학위 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEGREE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>입학일</Label>
              <Input
                type="date"
                value={form.start_date ?? ''}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>졸업일</Label>
              <Input
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_graduated"
              checked={form.is_graduated}
              onCheckedChange={(v) => setForm({ ...form, is_graduated: v === true })}
            />
            <Label htmlFor="is_graduated" className="cursor-pointer">졸업 완료</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit}>{initialData ? '수정' : '등록'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CertificationDialog
// ---------------------------------------------------------------------------

interface CertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  initialData?: Certification | null;
  onSubmit: (data: Certification) => void;
}

export function CertificationDialog({ open, onOpenChange, employeeId, initialData, onSubmit }: CertificationDialogProps) {
  const [form, setForm] = useState<Certification>({
    id: '',
    employee_id: employeeId,
    name: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
    certificate_number: '',
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({
          id: genId('cert'),
          employee_id: employeeId,
          name: '',
          issuer: '',
          issue_date: '',
          expiry_date: '',
          certificate_number: '',
        });
      }
    }
  }, [open, initialData, employeeId]);

  const handleSubmit = () => {
    if (!form.name) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? '자격증 수정' : '자격증 등록'}</DialogTitle>
          <DialogDescription>자격증 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>자격증명 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예) 정보처리기사"
            />
          </div>
          <div className="space-y-2">
            <Label>발급기관</Label>
            <Input
              value={form.issuer ?? ''}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              placeholder="예) 한국산업인력공단"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>취득일</Label>
              <Input
                type="date"
                value={form.issue_date ?? ''}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>만료일</Label>
              <Input
                type="date"
                value={form.expiry_date ?? ''}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>자격증 번호</Label>
            <Input
              value={form.certificate_number ?? ''}
              onChange={(e) => setForm({ ...form, certificate_number: e.target.value })}
              placeholder="예) 20-01-001234"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit}>{initialData ? '수정' : '등록'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// FamilyDialog
// ---------------------------------------------------------------------------

interface FamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  initialData?: FamilyMember | null;
  onSubmit: (data: FamilyMember) => void;
}

const RELATION_OPTIONS = [
  '배우자',
  '자녀',
  '부',
  '모',
  '시부',
  '시모',
  '장인',
  '장모',
  '형제',
  '자매',
  '조부',
  '조모',
  '기타',
];

export function FamilyDialog({ open, onOpenChange, employeeId, initialData, onSubmit }: FamilyDialogProps) {
  const [form, setForm] = useState<FamilyMember>({
    id: '',
    employee_id: employeeId,
    name: '',
    relation: '배우자',
    birth_date: '',
    phone: '',
    is_dependent: false,
    is_living_together: true,
    has_income: false,
    medical_notes: null,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({
          id: genId('fm'),
          employee_id: employeeId,
          name: '',
          relation: '배우자',
          birth_date: '',
          phone: '',
          is_dependent: false,
          is_living_together: true,
          has_income: false,
          medical_notes: null,
        });
      }
    }
  }, [open, initialData, employeeId]);

  const handleSubmit = () => {
    if (!form.name || !form.relation) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? '가족 수정' : '가족 등록'}</DialogTitle>
          <DialogDescription>가족 구성원 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>관계 *</Label>
              <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>생년월일</Label>
              <Input
                type="date"
                value={form.birth_date ?? ''}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label>연락처</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="010-0000-0000"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_dependent"
              checked={form.is_dependent}
              onCheckedChange={(v) => setForm({ ...form, is_dependent: v === true })}
            />
            <Label htmlFor="is_dependent" className="cursor-pointer">부양가족 (연말정산 인적공제 대상)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit}>{initialData ? '수정' : '등록'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
