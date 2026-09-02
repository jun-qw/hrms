'use client';

/**
 * 주민등록번호 칸.
 *
 * 기본은 마스킹입니다. 전체를 보려면 **사유를 적고** 눌러야 하고, 그 열람은
 * 감사로그에 남습니다. 개인정보보호법이 요구하는 것은 암호화만이 아니라
 * 접근 통제와 접속 기록이라, 누가 언제 무엇 때문에 봤는지가 남아야 합니다.
 *
 * 열어 둔 값은 30초 뒤 스스로 닫힙니다. 화면에 띄워 둔 채 자리를 비우는 것이
 * 가장 흔한 유출 경로입니다.
 */

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { revealResidentNumber } from '@/lib/actions/sensitive-actions';

const HIDE_AFTER_MS = 30_000;

interface Props {
  employeeId: string;
  /** 서버가 내려준 마스킹 값. 없으면 미등록입니다. */
  masked: string | null;
  /** HR 역할이 아니면 버튼 자체를 보이지 않습니다. */
  canReveal: boolean;
}

export function ResidentNumberField({ employeeId, masked, canReveal }: Props) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const hide = () => {
    setRevealed(null);
    setSecondsLeft(0);
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  };

  const startCountdown = () => {
    const until = Date.now() + HIDE_AFTER_MS;
    setSecondsLeft(Math.ceil(HIDE_AFTER_MS / 1000));
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0) hide();
      else setSecondsLeft(left);
    }, 1000);
  };

  const reveal = async () => {
    setBusy(true);
    try {
      const result = await revealResidentNumber(employeeId, purpose);
      if (!result.ok || !result.value) {
        toast.error(result.reason ?? '열람하지 못했습니다.');
        return;
      }
      setRevealed(result.value);
      setOpen(false);
      setPurpose('');
      startCountdown();
      toast.info('열람 기록이 감사로그에 남았습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground">주민등록번호</p>
      <div className="flex items-center gap-2">
        <p className="font-mono font-medium">
          {revealed ?? masked ?? '-'}
        </p>
        {revealed ? (
          <button
            onClick={hide}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <EyeOff className="h-3.5 w-3.5" />
            숨기기 ({secondsLeft}s)
          </button>
        ) : (
          canReveal && masked && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              전체 보기
            </button>
          )
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              주민등록번호 전체 열람
            </DialogTitle>
            <DialogDescription>
              열람 사실이 <strong>누가 · 언제 · 누구 것을 · 왜</strong> 형태로 감사로그에
              남습니다. 30초 뒤 자동으로 다시 가려집니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reveal-purpose">열람 사유</Label>
            <Input
              id="reveal-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예) 연말정산 자료 제출, 4대보험 취득신고"
              onKeyDown={(e) => { if (e.key === 'Enter' && purpose.trim()) reveal(); }}
            />
            <p className="text-xs text-muted-foreground">
              사유 없는 열람이 쌓이면 나중에 정당한 열람과 그렇지 않은 열람을 구분할 수 없습니다.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={reveal} disabled={busy || !purpose.trim()}>
              열람하고 기록 남기기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
