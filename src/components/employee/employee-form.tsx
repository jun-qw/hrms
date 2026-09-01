'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { isCurrentlyEffective } from '@/lib/utils/effective-status';
import type { Employee, PositionRank, PositionTitle, Department } from '@/types';

const employeeSchema = z.object({
  employee_number: z.string().min(1, '사원번호를 입력하세요'),
  name: z.string().min(1, '이름을 입력하세요'),
  name_en: z.string().optional(),
  email: z.string().email('올바른 이메일을 입력하세요'),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['M', 'F']).optional(),
  address: z.string().optional(),
  address_detail: z.string().optional(),
  zip_code: z.string().optional(),
  department_id: z.string().optional(),
  position_rank_id: z.string().optional(),
  position_title_id: z.string().optional(),
  employment_type: z.enum(['regular', 'contract', 'parttime', 'intern']),
  hire_date: z.string().min(1, '입사일을 입력하세요'),
  base_salary: z.number().min(0).optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: Employee;
  departments: Department[];
  positionRanks: PositionRank[];
  positionTitles: PositionTitle[];
  onSubmit: (data: EmployeeFormData) => void;
}

export function EmployeeForm({
  employee,
  departments,
  positionRanks,
  positionTitles,
  onSubmit,
}: EmployeeFormProps) {
  const EMPLOYMENT_TYPES = useCodeMap(CODE.EMPLOYMENT_TYPES);
  const GENDER_LABELS = useCodeMap(CODE.GENDER_LABELS);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee
      ? {
          employee_number: employee.employee_number,
          name: employee.name,
          name_en: employee.name_en ?? '',
          email: employee.email,
          phone: employee.phone ?? '',
          birth_date: employee.birth_date ?? '',
          gender: employee.gender ?? undefined,
          address: employee.address ?? '',
          address_detail: employee.address_detail ?? '',
          zip_code: employee.zip_code ?? '',
          department_id: employee.department_id ?? '',
          position_rank_id: employee.position_rank_id ?? '',
          position_title_id: employee.position_title_id ?? '',
          employment_type: employee.employment_type,
          hire_date: employee.hire_date,
          base_salary: employee.base_salary ?? 0,
          bank_name: employee.bank_name ?? '',
          bank_account: employee.bank_account ?? '',
          emergency_contact_name: employee.emergency_contact_name ?? '',
          emergency_contact_phone: employee.emergency_contact_phone ?? '',
          emergency_contact_relation: employee.emergency_contact_relation ?? '',
        }
      : {
          employment_type: 'regular',
          base_salary: 0,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="employee_number">사원번호 *</Label>
            <Input id="employee_number" {...register('employee_number')} />
            {errors.employee_number && <p className="text-xs text-destructive">{errors.employee_number.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_en">영문이름</Label>
            <Input id="name_en" {...register('name_en')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input id="phone" {...register('phone')} placeholder="010-0000-0000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">생년월일</Label>
            <Input id="birth_date" type="date" {...register('birth_date')} />
          </div>
          <div className="space-y-2">
            <Label>성별</Label>
            <Select onValueChange={(v) => setValue('gender', v as 'M' | 'F')}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 인사 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인사 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>부서</Label>
            <Select onValueChange={(v) => setValue('department_id', v)}>
              <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => isCurrentlyEffective(d.is_active, d.effective_from, d.effective_to))
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>직급</Label>
            <Select onValueChange={(v) => setValue('position_rank_id', v)}>
              <SelectTrigger><SelectValue placeholder="직급 선택" /></SelectTrigger>
              <SelectContent>
                {positionRanks
                  .filter((r) => isCurrentlyEffective(r.is_active, r.effective_from, r.effective_to))
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>직책</Label>
            <Select onValueChange={(v) => setValue('position_title_id', v)}>
              <SelectTrigger><SelectValue placeholder="직책 선택" /></SelectTrigger>
              <SelectContent>
                {positionTitles
                  .filter((t) => isCurrentlyEffective(t.is_active, t.effective_from, t.effective_to))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>고용형태</Label>
            <Select onValueChange={(v) => setValue('employment_type', v as EmployeeFormData['employment_type'])} defaultValue="regular">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire_date">입사일 *</Label>
            <Input id="hire_date" type="date" {...register('hire_date')} />
            {errors.hire_date && <p className="text-xs text-destructive">{errors.hire_date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_salary">기본급</Label>
            <Input id="base_salary" type="number" {...register('base_salary', { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      {/* 주소 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주소</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="zip_code">우편번호</Label>
            <Input id="zip_code" {...register('zip_code')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">주소</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address_detail">상세주소</Label>
            <Input id="address_detail" {...register('address_detail')} />
          </div>
        </CardContent>
      </Card>

      {/* 급여 계좌 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">급여 계좌</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank_name">은행명</Label>
            <Input id="bank_name" {...register('bank_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account">계좌번호</Label>
            <Input id="bank_account" {...register('bank_account')} />
          </div>
        </CardContent>
      </Card>

      {/* 비상연락처 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비상연락처</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">이름</Label>
            <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">연락처</Label>
            <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_relation">관계</Label>
            <Input id="emergency_contact_relation" {...register('emergency_contact_relation')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">취소</Button>
        <Button type="submit">{employee ? '수정' : '등록'}</Button>
      </div>
    </form>
  );
}
