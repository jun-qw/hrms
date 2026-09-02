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
import { DEFAULT_PAY_METHOD, JOB_CLASS_LABEL, PAY_METHOD_LABEL } from '@/types';
import { isMobileNumber } from '@/lib/attendance/import-parse';
import { toast } from 'sonner';
import type { Employee, PositionRank, PositionTitle, Department } from '@/types';

const employeeSchema = z.object({
  employee_number: z.string().min(1, '사원번호를 입력하세요'),
  name: z.string().min(1, '이름을 입력하세요'),
  name_en: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').or(z.literal('')).optional(),
  // 근태기록에는 사원번호가 없고 휴대폰 번호가 필수 항목입니다. 번호가 비면
  // 그 사람의 근태를 시스템에 붙일 방법이 없어 급여까지 비어서 나갑니다.
  phone: z
    .string()
    .min(1, '휴대폰 번호를 입력하세요. 근태기록을 직원에게 붙이는 유일한 열쇠입니다.')
    // 정규화는 normalizePhone 하나만 씁니다 — 근태 가져오기가 직원을 찾을 때
    // 쓰는 것과 같은 규칙이어야, 화면에서 통과한 번호가 근태에서도 붙습니다.
    .refine((v) => isMobileNumber(v), {
      message: '휴대폰 번호 형식이 아닙니다. 예: 010-1234-5678',
    }),
  birth_date: z.string().optional(),
  gender: z.enum(['M', 'F']).optional(),
  address: z.string().optional(),
  address_detail: z.string().optional(),
  zip_code: z.string().optional(),
  department_id: z.string().optional(),
  position_rank_id: z.string().optional(),
  position_title_id: z.string().optional(),
  employment_type: z.enum(['regular', 'contract', 'parttime', 'intern']),
  job_class: z.enum(['office', 'field_manager', 'field']),
  pay_method: z.enum(['monthly', 'annual', 'hourly', 'daily']),
  hire_date: z.string().min(1, '입사일을 입력하세요'),
  // DB의 numeric 컬럼은 문자열("2400000")로 옵니다. 게다가 급여방식에 따라
  // 한쪽 필드는 화면에 뜨지 않아 valueAsNumber 를 거치지 못하고 문자열
  // 기본값 그대로 제출됩니다. z.number() 는 그걸 조용히 거부해 — 오류 문구를
  // 그리는 자리도 없어서 — 저장 버튼이 아무 반응 없는 것처럼 보였습니다.
  // 화면에 뜨는 쪽은 valueAsNumber 가, 뜨지 않는 쪽은 위의 Number() 기본값이
  // 숫자를 보장합니다. coerce 를 쓰지 않는 것은 RHF 타입 추론과 충돌해서입니다.
  base_salary: z.number().min(0).optional(),
  hourly_wage: z.number().min(0).optional(),
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
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee
      ? {
          employee_number: employee.employee_number,
          name: employee.name,
          name_en: employee.name_en ?? '',
          email: employee.email ?? '',
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
          job_class: employee.job_class ?? 'office',
          pay_method: employee.pay_method ?? 'monthly',
          hire_date: employee.hire_date,
          base_salary: Number(employee.base_salary ?? 0),
          hourly_wage: Number(employee.hourly_wage ?? 0),
          bank_name: employee.bank_name ?? '',
          bank_account: employee.bank_account ?? '',
          emergency_contact_name: employee.emergency_contact_name ?? '',
          emergency_contact_phone: employee.emergency_contact_phone ?? '',
          emergency_contact_relation: employee.emergency_contact_relation ?? '',
        }
      : {
          employment_type: 'regular',
          job_class: 'office',
          pay_method: 'monthly',
          base_salary: 0,
          hourly_wage: 0,
        },
  });

  // 급여방식에 따라 입력 항목이 달라지므로 현재 값을 관찰합니다.
  const jobClass = watch('job_class');
  const payMethod = watch('pay_method');
  const isHourlyLike = payMethod === 'hourly' || payMethod === 'daily';

  /**
   * 검증 실패를 소리 내어 알립니다.
   *
   * 실제로 있었던 일입니다 — 화면에 뜨지 않은 필드가 검증에 걸리자 저장
   * 버튼이 아무 반응이 없었습니다. 오류를 그릴 자리가 없는 필드라도, 왜 저장이
   * 안 되는지는 담당자에게 보여야 합니다.
   */
  const FIELD_LABELS: Record<string, string> = {
    employee_number: '사원번호', name: '이름', email: '이메일', phone: '휴대폰 번호',
    hire_date: '입사일', base_salary: '기본급', hourly_wage: '시급',
    employment_type: '고용형태', job_class: '직군', pay_method: '급여방식', gender: '성별',
  };
  const onInvalid = (errs: Record<string, { message?: string }>) => {
    const [field, err] = Object.entries(errs)[0] ?? [];
    if (!field) return;
    toast.error(`${FIELD_LABELS[field] ?? field}: ${err?.message ?? '입력값을 확인하세요.'}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">휴대폰 번호 *</Label>
            <Input id="phone" {...register('phone')} placeholder="010-0000-0000" />
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                근태기록에는 사원번호가 없어 이 번호로 직원을 찾습니다. 비어 있으면 근태가 들어오지 않습니다.
              </p>
            )}
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
            <Label>직군</Label>
            <Select
              value={jobClass}
              onValueChange={(v) => {
                const next = v as EmployeeFormData['job_class'];
                setValue('job_class', next);
                // 현장직은 통상 시급제입니다. 기본값만 옮겨 주고, 담당자가
                // 다시 고르면 그 선택이 유지됩니다.
                setValue('pay_method', DEFAULT_PAY_METHOD[next]);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_CLASS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>급여방식</Label>
            <Select
              value={payMethod}
              onValueChange={(v) => setValue('pay_method', v as EmployeeFormData['pay_method'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAY_METHOD_LABEL).map(([value, label]) => (
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
          {isHourlyLike ? (
            <div className="space-y-2">
              <Label htmlFor="hourly_wage">{payMethod === 'daily' ? '일급' : '시급'}</Label>
              <Input id="hourly_wage" type="number" {...register('hourly_wage', { valueAsNumber: true })} />
              {errors.hourly_wage && <p className="text-xs text-destructive">{errors.hourly_wage.message}</p>}
              <p className="text-xs text-muted-foreground">
                근태 실근로시간에 곱해 기본급이 산정됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="base_salary">기본급 (월)</Label>
              <Input id="base_salary" type="number" {...register('base_salary', { valueAsNumber: true })} />
              {errors.base_salary && <p className="text-xs text-destructive">{errors.base_salary.message}</p>}
            </div>
          )}
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
