'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  createNextYearRateSet,
  resolveRateSet,
  saveRateSet,
} from '@/lib/actions/payroll-rate-actions';
import {
  DEFAULT_RATE_SET,
  type PayrollRateSet,
  type WeeklyHolidayMethod,
} from '@/lib/payroll/rate-set';
import { PAY_METHOD_LABEL, type PayMethod } from '@/types';

const METHODS: { value: WeeklyHolidayMethod; label: string; detail: string }[] = [
  {
    value: 'included',
    label: '월급에 포함',
    detail:
      '월 소정근로시간(209시간)에 주휴시간이 이미 들어 있다고 보고 별도로 지급하지 않습니다. 월급제만 있는 회사의 통상적인 처리입니다.',
  },
  {
    value: 'calculated',
    label: '자동 산정',
    detail:
      '근태를 주 단위로 보고, 소정근로일을 개근한 주마다 통상시급 × 1일 소정근로시간을 지급합니다. 시급직이 있는 회사에 맞습니다.',
  },
  {
    value: 'fixed',
    label: '월 정액',
    detail:
      '근태와 무관하게 매월 같은 금액을 지급합니다. 사규로 정액을 정해 둔 경우에 씁니다.',
  },
];

/**
 * 연도별 급여 기준값 설정.
 *
 * 4대보험 요율·최저임금은 매년 바뀌는 **고시값**이고, 주휴수당 방식은 **회사
 * 정책**입니다. 성격이 달라 화면에서도 나눠 놓았습니다 — 고시값은 대조해서
 * 채우는 것이고, 정책은 선택하는 것입니다.
 */
/** 비율(0.03545)을 화면용 퍼센트(3.545)로. 부동소수점 찌꺼기를 없앱니다. */
const asPercent = (rate: number) => Number((rate * 100).toFixed(6));

export default function PayrollRateSettings() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rates, setRates] = useState<PayrollRateSet>(DEFAULT_RATE_SET);
  const [source, setSource] = useState<'exact' | 'carried' | 'default'>('default');
  const [fromYear, setFromYear] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    resolveRateSet(year)
      .then((r) => {
        if (!alive) return;
        setRates(r.rates);
        setSource(r.source);
        setFromYear(r.fromYear);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [year]);

  const patch = (next: Partial<PayrollRateSet>) => setRates((prev) => ({ ...prev, ...next }));
  const patchWeekly = (next: Partial<PayrollRateSet['weeklyHoliday']>) =>
    setRates((prev) => ({ ...prev, weeklyHoliday: { ...prev.weeklyHoliday, ...next } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await saveRateSet({ ...rates, year });
      if (ok) {
        setSource('exact');
        setFromYear(undefined);
        toast.success(`${year}년 급여 기준값을 저장했습니다.`);
      } else {
        toast.error('저장하지 못했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNext = async () => {
    const next = year + 1;
    const created = await createNextYearRateSet(next);
    if (!created) {
      toast.error('만들지 못했습니다.');
      return;
    }
    setYear(next);
    toast.success(`${next}년 기준값을 ${year}년 값에서 복사했습니다. 고시값으로 대조하세요.`);
  };

  const num = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="year" className="text-sm">
          기준 연도
        </Label>
        <Input
          id="year"
          type="number"
          className="h-8 w-24"
          value={year}
          onChange={(e) => setYear(Number(e.target.value) || thisYear)}
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {source === 'carried' && (
          <Badge variant="secondary" className="text-[11px]">
            {fromYear}년 값을 이어 쓰는 중
          </Badge>
        )}
        {source === 'default' && (
          <Badge variant="secondary" className="text-[11px]">
            등록된 값 없음 — 기본값 표시 중
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleCreateNext()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {year + 1}년 만들기
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            저장
          </Button>
        </div>
      </div>

      {source !== 'exact' && (
        <div className="flex items-start gap-2 rounded-md border border-accent-amber/40 bg-accent-amber-subtle px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <span>
            {year}년 기준값이 아직 등록되지 않아{' '}
            {source === 'carried' ? `${fromYear}년 값으로` : '기본값으로'} 계산하고 있습니다.
            고시값을 확인해 저장하세요.
          </span>
        </div>
      )}

      {/* ── 주휴수당 (회사 정책) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주휴수당</CardTitle>
          <p className="text-xs text-muted-foreground">
            근로기준법 제55조는 1주 평균 1회 이상의 유급휴일을 정하지만, 지급 방식은 회사마다
            다릅니다. 잘못 고르면 이중지급이나 미지급이 되므로 사규를 확인하고 정하세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {METHODS.map((m) => {
              const active = rates.weeklyHoliday.method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => patchWeekly({ method: m.value })}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    active ? 'border-primary bg-primary/5' : 'hover:border-foreground/30',
                  )}
                >
                  <p className={cn('text-sm font-semibold', active && 'text-primary')}>
                    {m.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.detail}</p>
                </button>
              );
            })}
          </div>

          {rates.weeklyHoliday.method !== 'included' && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div>
                <Label className="text-xs">적용 대상 급여방식</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(PAY_METHOD_LABEL) as PayMethod[]).map((pm) => {
                    const on = rates.weeklyHoliday.applyTo.includes(pm);
                    return (
                      <button
                        key={pm}
                        type="button"
                        onClick={() =>
                          patchWeekly({
                            applyTo: on
                              ? rates.weeklyHoliday.applyTo.filter((x) => x !== pm)
                              : [...rates.weeklyHoliday.applyTo, pm],
                          })
                        }
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          on
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {PAY_METHOD_LABEL[pm]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  월급제는 209시간에 주휴시간이 이미 들어 있어 보통 제외합니다. 켜면 이중지급이
                  될 수 있습니다.
                </p>
              </div>

              {rates.weeklyHoliday.method === 'calculated' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="minw" className="text-xs">
                        지급 대상 최소 주 소정근로시간
                      </Label>
                      <Input
                        id="minw"
                        type="number"
                        className="h-8"
                        value={rates.weeklyHoliday.minWeeklyHours}
                        onChange={(e) => patchWeekly({ minWeeklyHours: num(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        근로기준법 제18조 제3항의 15시간이 기준입니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-sm">개근한 주에만 지급</Label>
                      <p className="text-xs text-muted-foreground">
                        시행령 제30조. 끄면 결근이 있어도 지급합니다.
                      </p>
                    </div>
                    <Switch
                      checked={rates.weeklyHoliday.requireFullAttendance}
                      onCheckedChange={(v) => patchWeekly({ requireFullAttendance: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="text-sm">단시간 근로자 비례 계산</Label>
                      <p className="text-xs text-muted-foreground">
                        주 40시간 미만이면 (주 소정근로시간 ÷ 40) × 1일 소정근로시간으로 줄입니다.
                      </p>
                    </div>
                    <Switch
                      checked={rates.weeklyHoliday.prorateForPartTime}
                      onCheckedChange={(v) => patchWeekly({ prorateForPartTime: v })}
                    />
                  </div>
                </>
              )}

              {rates.weeklyHoliday.method === 'fixed' && (
                <div className="space-y-1">
                  <Label htmlFor="fixedamt" className="text-xs">
                    월 정액
                  </Label>
                  <Input
                    id="fixedamt"
                    type="number"
                    className="h-8 w-48"
                    value={rates.weeklyHoliday.fixedMonthlyAmount}
                    onChange={(e) => patchWeekly({ fixedMonthlyAmount: num(e.target.value) })}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 고시값 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">4대보험 요율 · 최저임금</CardTitle>
          <p className="text-xs text-muted-foreground">
            매년 개정되는 고시값입니다. 근로자 부담분만 입력하세요 — 사업주 부담분은 급여
            계산에 들어가지 않습니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="국민연금 (%)" value={asPercent(rates.nationalPension.rate)} onChange={(v) => patch({ nationalPension: { ...rates.nationalPension, rate: Number((v / 100).toFixed(8)) } })} step={0.001} />
          <Field label="국민연금 상한액" value={rates.nationalPension.maxBase} onChange={(v) => patch({ nationalPension: { ...rates.nationalPension, maxBase: v } })} />
          <Field label="국민연금 하한액" value={rates.nationalPension.minBase} onChange={(v) => patch({ nationalPension: { ...rates.nationalPension, minBase: v } })} />
          <Field label="건강보험 (%)" value={asPercent(rates.healthInsurance.rate)} onChange={(v) => patch({ healthInsurance: { rate: Number((v / 100).toFixed(8)) } })} step={0.001} />
          <Field label="장기요양 (건강보험료의 %)" value={asPercent(rates.longTermCare.rate)} onChange={(v) => patch({ longTermCare: { rate: Number((v / 100).toFixed(8)) } })} step={0.001} />
          <Field label="고용보험 (%)" value={asPercent(rates.employmentInsurance.rate)} onChange={(v) => patch({ employmentInsurance: { rate: Number((v / 100).toFixed(8)) } })} step={0.001} />
          <Field label="최저임금 (시간급)" value={rates.minimumHourlyWage} onChange={(v) => patch({ minimumHourlyWage: v })} />
          <Field label="월 소정근로시간" value={rates.monthlyWorkHours} onChange={(v) => patch({ monthlyWorkHours: v })} />
          <Field label="1일 소정근로시간" value={rates.standardDailyHours} onChange={(v) => patch({ standardDailyHours: v })} step={0.5} />
        </CardContent>
      </Card>

      {/* ── 비과세 한도 · 가산율 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">비과세 한도 · 가산율</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="식대 (월)" value={rates.nonTaxableLimits.meal} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, meal: v } })} />
          <Field label="교통비 (월)" value={rates.nonTaxableLimits.transport} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, transport: v } })} />
          <Field label="출산·보육 (월)" value={rates.nonTaxableLimits.childcare} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, childcare: v } })} />
          <Field label="연구보조비 (월)" value={rates.nonTaxableLimits.research} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, research: v } })} />
          <Field label="연장 가산율" value={rates.premiums.overtime} onChange={(v) => patch({ premiums: { ...rates.premiums, overtime: v } })} step={0.1} />
          <Field label="야간 가산율" value={rates.premiums.night} onChange={(v) => patch({ premiums: { ...rates.premiums, night: v } })} step={0.1} />
          <Field label="휴일 가산율" value={rates.premiums.holiday} onChange={(v) => patch({ premiums: { ...rates.premiums, holiday: v } })} step={0.1} />
        </CardContent>
      </Card>

      <div className="space-y-1">
        <Label htmlFor="note" className="text-xs">
          확인 근거 (메모)
        </Label>
        <Input
          id="note"
          placeholder="예: 2026년 국민연금공단·건강보험공단 고시 확인 (2026-01-05, 홍길동)"
          value={rates.note}
          onChange={(e) => patch({ note: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          어느 고시로 확인했는지 남겨 두면 내년 담당자가 무엇을 대조해야 하는지 압니다.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step ?? 1}
        className="h-8"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
