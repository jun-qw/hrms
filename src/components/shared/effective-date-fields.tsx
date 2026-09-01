'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EffectiveDateFieldsProps {
  effectiveFrom: string;
  effectiveTo: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export default function EffectiveDateFields({
  effectiveFrom,
  effectiveTo,
  onFromChange,
  onToChange,
}: EffectiveDateFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>시작일</Label>
        <Input
          type="date"
          value={effectiveFrom}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder="미지정 시 즉시 적용"
        />
        <p className="text-xs text-muted-foreground">
          미입력 시 즉시 적용
        </p>
      </div>
      <div className="space-y-2">
        <Label>종료일</Label>
        <Input
          type="date"
          value={effectiveTo}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="미지정 시 무기한"
        />
        <p className="text-xs text-muted-foreground">
          미입력 시 무기한
        </p>
      </div>
    </div>
  );
}
