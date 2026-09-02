'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  createNextYearRateSet,
  deleteRateSet,
  fetchRateSets,
  resolveRateSet,
  saveRateSet,
} from '@/lib/actions/payroll-rate-actions';
import {
  DEFAULT_RATE_SET,
  STATUTORY_MINIMUM_WAGE,
  STATUTORY_RATES,
  STATUTORY_PENSION_BASE_INTERVALS,
  pensionBaseAt,
  type PensionBaseInterval,
  monthlyMinimumWage,
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
  /** 등록된 연도들. 자유 입력만 두면 몇 년치가 들어 있는지 알 수 없습니다. */
  const [years, setYears] = useState<number[]>([]);
  /** 직전 해 값 — 무엇이 바뀌었는지 나란히 보여 주기 위해 함께 읽습니다. */
  const [previous, setPrevious] = useState<PayrollRateSet | null>(null);

  const reloadYears = () => {
    void fetchRateSets().then((list) => setYears(list.map((r) => r.year).sort((a, b) => b - a)));
  };
  useEffect(reloadYears, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([resolveRateSet(year), resolveRateSet(year - 1)])
      .then(([current, prior]) => {
        if (!alive) return;
        setRates(current.rates);
        setSource(current.source);
        setFromYear(current.fromYear);
        // 직전 해에 등록된 값이 없으면 비교 대상이 없습니다.
        setPrevious(prior.source === 'exact' ? prior.rates : null);
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
        reloadYears();
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
    reloadYears();
    toast.success(`${next}년 기준값을 ${year}년 값에서 복사했습니다. 고시값으로 대조하세요.`);
  };

  const handleDelete = async () => {
    if (source !== 'exact') return;
    const ok = await deleteRateSet(year);
    if (!ok) { toast.error('삭제하지 못했습니다.'); return; }
    reloadYears();
    // 지운 해를 다시 읽으면 직전 해 값을 이어 쓰는 상태가 됩니다.
    const again = await resolveRateSet(year);
    setRates(again.rates); setSource(again.source); setFromYear(again.fromYear);
    toast.success(`${year}년 기준값을 지웠습니다.`);
  };

  const markVerified = () =>
    patch({
      verified: true,
      verifiedAt: new Date().toISOString().slice(0, 10),
    });

  /** 이 기준값이 들고 있는 구간. 없으면 고시 구간을 씁니다. */
  const baseIntervals =
    rates.nationalPension.baseIntervals ?? STATUTORY_PENSION_BASE_INTERVALS;

  /** 그 해에서 이 구간이 덮는 달을 `1~6월` 처럼 적습니다. */
  const monthsUsingInterval = (iv: PensionBaseInterval) => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
      .filter((m) => pensionBaseAt(baseIntervals, year, m) === iv);
    if (months.length === 0) return '—';
    if (months.length === 12) return '전체';
    return `${months[0]}~${months[months.length - 1]}월`;
  };

  /** 그 해 고시값. 없으면 대조 카드를 띄우지 않습니다. */
  const statutoryRow = STATUTORY_RATES[year];

  const pct = (v: number) => `${Number((v * 100).toFixed(4))}%`;
  const won = (v: number) => `${v.toLocaleString('ko-KR')}원`;

  /** 담당자가 넣은 값과 고시값이 어긋나는 항목. */
  const diffs = statutoryRow
    ? ([
        ['국민연금', rates.nationalPension.rate, statutoryRow.nationalPension, pct],
        ['건강보험', rates.healthInsurance.rate, statutoryRow.healthInsurance, pct],
        ['장기요양 (건보료 대비)', rates.longTermCare.rate, statutoryRow.longTermCare, pct],
        ['고용보험', rates.employmentInsurance.rate, statutoryRow.employmentInsurance, pct],
        ['최저임금 (시급)', rates.minimumHourlyWage, statutoryRow.minimumHourlyWage, won],
        ['기준소득월액 상한', rates.nationalPension.maxBase, statutoryRow.pensionMaxBase, won],
        ['기준소득월액 하한', rates.nationalPension.minBase, statutoryRow.pensionMinBase, won],
      ] as [string, number, number, (v: number) => string][])
        .filter(([, mine, official]) => Number(mine) !== Number(official))
        .map(([label, mine, official, fmt]) => ({
          label,
          shown: fmt(Number(mine)),
          expected: fmt(Number(official)),
        }))
    : [];

  /** 어긋난 항목을 한 번에 고시값으로 맞춥니다. */
  const applyStatutory = () => {
    if (!statutoryRow) return;
    patch({
      nationalPension: {
        ...rates.nationalPension,
        rate: statutoryRow.nationalPension,
        maxBase: statutoryRow.pensionMaxBase,
        minBase: statutoryRow.pensionMinBase,
      },
      healthInsurance: { rate: statutoryRow.healthInsurance },
      longTermCare: { rate: statutoryRow.longTermCare },
      employmentInsurance: { rate: statutoryRow.employmentInsurance },
      minimumHourlyWage: statutoryRow.minimumHourlyWage,
    });
    toast.info('고시값을 채웠습니다. 확인 후 저장하세요.');
  };

  /** 최저임금 고시액과 담당자가 넣은 값이 어긋나는가. */
  const statutory = STATUTORY_MINIMUM_WAGE[year];
  const wageMismatch =
    statutory !== undefined && Number(rates.minimumHourlyWage) !== statutory;

  /** 직전 해와 달라진 항목. 매년 갱신할 때 무엇을 건드렸는지 보여 줍니다. */
  const changes = previous
    ? ([
        ['국민연금', asPercent(previous.nationalPension.rate), asPercent(rates.nationalPension.rate), '%'],
        ['건강보험', asPercent(previous.healthInsurance.rate), asPercent(rates.healthInsurance.rate), '%'],
        ['장기요양', asPercent(previous.longTermCare.rate), asPercent(rates.longTermCare.rate), '%'],
        ['고용보험', asPercent(previous.employmentInsurance.rate), asPercent(rates.employmentInsurance.rate), '%'],
        ['최저임금', previous.minimumHourlyWage, rates.minimumHourlyWage, '원'],
        ['국민연금 상한', previous.nationalPension.maxBase, rates.nationalPension.maxBase, '원'],
        ['식대 비과세', previous.nonTaxableLimits.meal, rates.nonTaxableLimits.meal, '원'],
      ] as [string, number, number, string][]).filter(([, a, c]) => a !== c)
    : [];

  const num = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0;

  return (
    <div className="space-y-4">
      {/* ── 연도 고르기 ──
          자유 입력만 두면 몇 년치가 등록돼 있는지 알 수 없습니다. 등록된
          연도를 늘어놓고, 대조가 끝난 해인지 아닌지도 함께 보여 줍니다. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-1 text-sm">기준 연도</Label>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-[13px] tabular-nums transition-colors',
                y === year
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {y}
            </button>
          ))}
          {!years.includes(year) && (
            <span className="rounded-md border border-primary bg-primary/10 px-2.5 py-1 text-[13px] font-semibold tabular-nums text-primary">
              {year}
            </span>
          )}
          <Input
            type="number"
            aria-label="다른 연도 보기"
            className="h-7 w-20 text-[13px]"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || thisYear)}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {source === 'exact' && rates.verified && (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[11px] text-emerald-800">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              고시값 대조 완료{rates.verifiedAt ? ` · ${rates.verifiedAt}` : ''}
            </Badge>
          )}
          {source === 'exact' && !rates.verified && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              대조 전
            </Badge>
          )}
          {source === 'carried' && (
            <Badge variant="secondary" className="text-[11px]">{fromYear}년 값을 이어 쓰는 중</Badge>
          )}
          {source === 'default' && (
            <Badge variant="secondary" className="text-[11px]">등록된 값 없음 — 기본값 표시 중</Badge>
          )}

          <div className="ml-auto flex gap-2">
            {source === 'exact' && !rates.verified && (
              <Button variant="outline" size="sm" onClick={markVerified}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                대조 완료 표시
              </Button>
            )}
            {source === 'exact' && years.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => void handleDelete()}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {year}년 삭제
              </Button>
            )}
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
      </div>

      {/* 직전 해와 달라진 것 — 매년 갱신할 때 무엇을 건드렸는지 보여 줍니다. */}
      {changes.length > 0 && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="font-medium">{year - 1}년 대비 변경</span>
          <span className="ml-2 text-muted-foreground">
            {changes.map(([label, before, after, unit]) => (
              <span key={label} className="mr-3 inline-block tabular-nums">
                {label} {before.toLocaleString('ko-KR')}
                {unit} → <strong className="text-foreground">{after.toLocaleString('ko-KR')}{unit}</strong>
              </span>
            ))}
          </span>
        </div>
      )}

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

      {/* ── 고시값 대조 ──
          담당자가 넣은 값과 고시값을 나란히 놓습니다. 요율은 매년 바뀌는데
          숫자만 봐서는 맞는지 알 수 없고, 틀리면 전 직원의 공제액이 틀립니다. */}
      {statutoryRow && (
        <Card className={cn(diffs.length > 0 && 'border-amber-300')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {diffs.length === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {year}년 고시값과 일치합니다
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {year}년 고시값과 {diffs.length}건 다릅니다
                </>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              근로자 부담분 기준입니다. 고시값은 참고용이며 자동으로 덮어쓰지 않습니다 —
              회사가 다르게 둘 이유가 있을 수 있습니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {diffs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                국민연금 · 건강보험 · 장기요양 · 고용보험 · 최저임금 · 기준소득월액 상하한
                모두 대조했습니다.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1.5 text-left font-medium">항목</th>
                        <th className="py-1.5 text-right font-medium">현재 값</th>
                        <th className="py-1.5 text-right font-medium">{year}년 고시값</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {diffs.map((d) => (
                        <tr key={d.label} className="border-b last:border-0">
                          <td className="py-1.5">{d.label}</td>
                          <td className="py-1.5 text-right text-amber-700">{d.shown}</td>
                          <td className="py-1.5 text-right font-semibold">{d.expected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" onClick={applyStatutory}>
                  고시값으로 맞추기 ({diffs.length}건)
                </Button>
              </>
            )}
            <p className="text-[11px] text-muted-foreground">
              국민연금 기준소득월액 상·하한은 매년 <strong>7월</strong>에 바뀝니다
              (여기 적힌 값은 {statutoryRow.baseEffectiveFrom} 적용분). 연 단위 기준값
              한 벌로는 상반기와 하반기가 어긋나므로, 그 해 상반기 급여를 다시 돌릴
              때는 직전 해 값을 확인하세요.
            </p>
          </CardContent>
        </Card>
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
          <div className="space-y-1">
            <Field label="최저임금 (시간급)" value={rates.minimumHourlyWage} onChange={(v) => patch({ minimumHourlyWage: v })} />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              월 환산 {monthlyMinimumWage(rates.minimumHourlyWage, rates.monthlyWorkHours).toLocaleString('ko-KR')}원
              ({rates.monthlyWorkHours}시간)
            </p>
            {statutory !== undefined && (
              wageMismatch ? (
                <button
                  type="button"
                  onClick={() => patch({ minimumHourlyWage: statutory })}
                  className="text-left text-[11px] text-amber-700 underline underline-offset-2"
                >
                  {year}년 고시액은 {statutory.toLocaleString('ko-KR')}원입니다 — 눌러서 맞추기
                </button>
              ) : (
                <p className="text-[11px] text-emerald-700">{year}년 고시액과 일치</p>
              )
            )}
            {statutory === undefined && (
              <p className="text-[11px] text-muted-foreground">
                {year}년 고시액은 등록돼 있지 않습니다. 최저임금위원회 고시를 확인하세요.
              </p>
            )}
          </div>
          <Field label="월 소정근로시간" value={rates.monthlyWorkHours} onChange={(v) => patch({ monthlyWorkHours: v })} />
          <Field label="1일 소정근로시간" value={rates.standardDailyHours} onChange={(v) => patch({ standardDailyHours: v })} step={0.5} />
        </CardContent>
      </Card>

      {/* ── 국민연금 기준소득월액 구간 ──
          이 값은 7월 1일에 바뀝니다. 한 해에 숫자 하나만 담으면 상반기와
          하반기 중 한쪽이 반드시 틀립니다. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">국민연금 기준소득월액 구간</CardTitle>
          <p className="text-xs text-muted-foreground">
            상·하한은 <strong>7월 1일</strong>에 바뀝니다. 연도가 아니라 구간으로 두어,
            같은 해라도 급여 달에 맞는 값이 쓰입니다. 급여계산이 그 달에 유효한 구간을
            골라 씁니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1.5 text-left font-medium">적용 기간</th>
                  <th className="py-1.5 text-right font-medium">상한</th>
                  <th className="py-1.5 text-right font-medium">하한</th>
                  <th className="py-1.5 text-right font-medium">이 해에 적용</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {baseIntervals.map((iv) => {
                  // 그 해 1월과 12월 중 하나라도 이 구간에 들면 표시합니다.
                  const usedThisYear =
                    pensionBaseAt(baseIntervals, year, 1) === iv ||
                    pensionBaseAt(baseIntervals, year, 12) === iv;
                  return (
                    <tr key={iv.effectiveFrom} className={cn('border-b last:border-0', usedThisYear && 'bg-primary/5')}>
                      <td className="py-1.5">
                        {iv.effectiveFrom} ~ {iv.effectiveTo ?? '현재'}
                      </td>
                      <td className="py-1.5 text-right">{iv.maxBase.toLocaleString('ko-KR')}원</td>
                      <td className="py-1.5 text-right">{iv.minBase.toLocaleString('ko-KR')}원</td>
                      <td className="py-1.5 text-right">
                        {usedThisYear ? (
                          <span className="font-medium text-primary">
                            {monthsUsingInterval(iv)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            국민연금공단이 매년 3월경 결정해 7월부터 적용합니다. 고시된 구간이라 회사가
            바꿀 값은 아니지만, 새 구간이 나오면 여기에 더해야 그 이후 급여가 맞습니다.
          </p>
        </CardContent>
      </Card>

      {/* ── 비과세 한도 · 가산율 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">비과세 한도 · 가산율</CardTitle>
          <p className="text-xs text-muted-foreground">
            한도 금액은 소득세법 제12조 제3호 기준입니다. 다만 <strong>한도 안이라고
            무조건 비과세는 아닙니다</strong> — 아래 조건을 못 맞추면 과세 대상이고,
            나중에 원천징수 정정 사유가 됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            <strong>식대</strong> — 급여 규정이나 근로계약서에 지급 기준이 적혀 있어야
            하고, 회사가 식사를 현물로 따로 제공하면 비과세가 되지 않습니다.
            <br />
            <strong>교통비(자가운전보조금)</strong> — <strong>본인 소유 차량을 업무에
            쓰고 실비를 따로 받지 않는 사람</strong>만 해당합니다. 지금 이 시스템은
            전 직원에게 같은 한도를 적용하므로, 해당하지 않는 사람은 사원별 급여
            설정에서 항목을 빼야 합니다.
            <br />
            <strong>출산·보육수당</strong> — 2026년 1월 1일 지급분부터 만 6세 이하
            <strong> 자녀 1인당</strong> 월 20만원입니다(자녀 2명이면 40만원).
            여기 한 칸으로는 자녀 수를 반영하지 못하므로 인원별로 확인하세요.
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="식대 (월)" value={rates.nonTaxableLimits.meal} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, meal: v } })} />
          <Field label="교통비 (월)" value={rates.nonTaxableLimits.transport} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, transport: v } })} />
          <Field label="출산·보육 (월)" value={rates.nonTaxableLimits.childcare} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, childcare: v } })} />
          <Field label="연구보조비 (월)" value={rates.nonTaxableLimits.research} onChange={(v) => patch({ nonTaxableLimits: { ...rates.nonTaxableLimits, research: v } })} />
          <Field label="연장 가산율" value={rates.premiums.overtime} onChange={(v) => patch({ premiums: { ...rates.premiums, overtime: v } })} step={0.1} />
          <Field label="야간 가산율" value={rates.premiums.night} onChange={(v) => patch({ premiums: { ...rates.premiums, night: v } })} step={0.1} />
          <Field label="휴일 가산율" value={rates.premiums.holiday} onChange={(v) => patch({ premiums: { ...rates.premiums, holiday: v } })} step={0.1} />
          </div>
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
