import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, ArrowRight, Handshake, Eye } from 'lucide-react';
import type { ApprovalLine, ApprovalLineType } from '@/types';

interface ApprovalFlowProps {
  lines: (ApprovalLine & { approverName: string; approverRank: string })[];
}

const LINE_TYPE_LABEL: Record<ApprovalLineType, string> = {
  approval: '결재',
  agreement: '합의',
  cc: '참조',
};

const LINE_TYPE_COLOR: Record<ApprovalLineType, string> = {
  approval: 'text-blue-600',
  agreement: 'text-amber-600',
  cc: 'text-slate-400',
};

export function ApprovalFlow({ lines }: ApprovalFlowProps) {
  const statusIcon = (status: string, lineType: ApprovalLineType) => {
    if (lineType === 'cc') return <Eye className="h-3 w-3 text-slate-400" />;
    switch (status) {
      case 'approved': return <Check className="h-3 w-3 text-green-600" />;
      case 'rejected': return <X className="h-3 w-3 text-red-600" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const statusColor = (status: string, lineType: ApprovalLineType) => {
    if (lineType === 'cc') {
      return status === 'approved' ? 'border-slate-300 bg-slate-50' : 'border-dashed border-slate-300';
    }
    switch (status) {
      case 'approved': return 'border-green-500 bg-green-50';
      case 'rejected': return 'border-red-500 bg-red-50';
      default: return 'border-muted';
    }
  };

  const statusLabel = (status: string, lineType: ApprovalLineType) => {
    if (lineType === 'cc') return status === 'approved' ? '열람' : '대기';
    switch (status) {
      case 'approved': return lineType === 'agreement' ? '합의완료' : '승인';
      case 'rejected': return '반려';
      default: return '대기';
    }
  };

  const statusVariant = (status: string, lineType: ApprovalLineType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (lineType === 'cc') return 'outline';
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  };

  const lineTypeIcon = (t: ApprovalLineType) => {
    switch (t) {
      case 'agreement': return <Handshake className="h-3 w-3" />;
      case 'cc': return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  // 그룹: 합의(agreement) → 결재(approval) → 참조(cc) 순서
  const agreements = lines.filter((l) => l.line_type === 'agreement');
  const approvals = lines.filter((l) => l.line_type === 'approval').sort((a, b) => a.step - b.step);
  const ccs = lines.filter((l) => l.line_type === 'cc');

  const renderCard = (line: typeof lines[0], idx: number, showArrow: boolean) => (
    <div key={line.id} className="flex items-center gap-2">
      <div className={`flex flex-col items-center gap-1 p-3 border-2 rounded-lg min-w-[100px] ${statusColor(line.status, line.line_type)}`}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{line.approverName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium">{line.approverName}</span>
        <span className="text-[10px] text-muted-foreground">{line.approverRank}</span>
        <div className="flex items-center gap-1">
          {lineTypeIcon(line.line_type)}
          <span className={`text-[10px] font-semibold ${LINE_TYPE_COLOR[line.line_type]}`}>
            {LINE_TYPE_LABEL[line.line_type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {statusIcon(line.status, line.line_type)}
          <Badge variant={statusVariant(line.status, line.line_type)} className="text-[10px] h-4">
            {statusLabel(line.status, line.line_type)}
          </Badge>
        </div>
        {line.acted_at && (
          <span className="text-[10px] text-muted-foreground">{line.acted_at.slice(0, 10)}</span>
        )}
      </div>
      {showArrow && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  const allItems = [...agreements, ...approvals, ...ccs];

  return (
    <div className="space-y-2">
      {/* Section labels */}
      {agreements.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <Handshake className="h-3 w-3" />
          <span className="font-semibold">합의 ({agreements.length}명) — 모든 합의 완료 후 최종결재 가능</span>
        </div>
      )}

      {/* Flow cards */}
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        {allItems.map((line, idx) => {
          const isLast = idx === allItems.length - 1;
          // 합의→결재 경계 또는 결재→참조 경계에서는 구분선 표시
          const nextLine = allItems[idx + 1];
          const isBoundary = nextLine && line.line_type !== nextLine.line_type;
          return renderCard(line, idx, !isLast);
        })}
      </div>

      {ccs.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Eye className="h-3 w-3" />
          <span>참조 ({ccs.length}명) — 최종결재 완료 후 열람 가능</span>
        </div>
      )}
    </div>
  );
}
