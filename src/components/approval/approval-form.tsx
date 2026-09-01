'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalFormProps {
  approvalId: string;
  onApprove?: (comment?: string) => void;
  onReject?: (comment?: string) => void;
  approveLabel?: string;
}

export function ApprovalActionForm({ approvalId, onApprove, onReject, approveLabel = '승인' }: ApprovalFormProps) {
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label>의견</Label>
        <Textarea
          placeholder="결재 의견을 입력하세요"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="destructive"
          onClick={() => {
            onReject?.(comment || undefined);
            toast.error('결재가 반려되었습니다.');
            setComment('');
          }}
        >
          <X className="h-4 w-4 mr-2" />
          반려
        </Button>
        <Button
          onClick={() => {
            onApprove?.(comment || undefined);
            toast.success('결재가 승인되었습니다.');
            setComment('');
          }}
        >
          <Check className="h-4 w-4 mr-2" />
          {approveLabel}
        </Button>
      </div>
    </div>
  );
}
