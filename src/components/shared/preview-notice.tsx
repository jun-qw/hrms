'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Marks a screen that is not finished.
 *
 * These modules are hidden from the menu by default; an administrator can
 * switch them on to look around, and this banner keeps it clear that what they
 * see is a preview rather than working functionality.
 */
export function PreviewNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="text-amber-900">
        <p className="font-medium">준비중인 기능입니다</p>
        <p className="mt-0.5">
          {children ?? '화면 구성만 되어 있으며 실제 데이터 저장과 일부 동작은 아직 제공되지 않습니다.'}
        </p>
      </div>
    </div>
  );
}
