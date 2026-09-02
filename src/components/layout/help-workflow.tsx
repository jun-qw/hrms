'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserCircle,
  Network,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  ArrowRightLeft,
  FileCheck,
  Settings,
  ShieldAlert,
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Search,
  type LucideIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// ── Helpers ──

function matchesSearch(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

// ── Workflow diagram data ──

interface FlowNode {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface FlowRow {
  nodes: FlowNode[];
}

const workflowRows: FlowRow[] = [
  {
    nodes: [
      { id: 'organization', label: '조직도', icon: Network, href: '/organization' },
      { id: 'employees', label: '인사정보', icon: Users, href: '/employees' },
    ],
  },
  {
    nodes: [
      { id: 'appointments', label: '인사발령', icon: ArrowRightLeft, href: '/appointments' },
    ],
  },
  {
    nodes: [
      { id: 'attendance', label: '근태관리', icon: Clock, href: '/attendance' },
      { id: 'leave', label: '휴가관리', icon: CalendarDays, href: '/leave' },
    ],
  },
  {
    nodes: [
      { id: 'approval', label: '전자결재', icon: FileCheck, href: '/approval' },
    ],
  },
  {
    nodes: [
      { id: 'payroll', label: '급여관리', icon: Banknote, href: '/payroll' },
    ],
  },
  {
    nodes: [
      { id: 'audit-log', label: '감사로그', icon: ShieldAlert, href: '/audit-log' },
    ],
  },
];

// ── Module guide data ──

interface ModuleGuide {
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
  workflow: string;
}

const moduleGuides: ModuleGuide[] = [
  {
    label: '대시보드',
    icon: LayoutDashboard,
    href: '/',
    description: '전체 현황을 한눈에 확인합니다. 임직원수, 금일 출근율, 휴가 현황, 입퇴사 추이, 직급별 인력분포, 근속연수 분포, 휴가 소진율, 월별 초과근무 현황, 생일/기념일 등 다양한 위젯을 제공합니다.',
    workflow: '로그인 → 대시보드 → 현황 카드 확인 → 상세 모듈 이동',
  },
  {
    label: '마이페이지',
    icon: UserCircle,
    href: '/my',
    description: '내 출퇴근/근태 기록, 휴가 신청, 기본정보 및 증명서 발급(재직/경력), 인사발령 내역, 급여 명세서(추이 차트 포함), 전자결재 현황(결재대기/진행중/승인/반려), 교육/평가 이력을 한곳에서 관리합니다.',
    workflow: '마이페이지 접속 → 탭 선택(출퇴근, 휴가, 기본정보, 인사발령, 급여, 전자결재, 교육/평가) → 정보 조회/신청',
  },
  {
    label: '조직도',
    icon: Network,
    href: '/organization',
    description: '조직 구조를 트리 형태로 확인합니다. 부서를 클릭하면 소속 인원을 볼 수 있고, 시뮬레이션 모드에서는 드래그 앤 드롭으로 인사이동을 미리 검토할 수 있습니다.',
    workflow: '조직도 조회 → 부서 클릭 → 구성원 확인 → (시뮬레이션 모드)',
  },
  {
    label: '인사정보',
    icon: Users,
    href: '/employees',
    description: '직원의 기본정보를 등록/수정하고, 경력사항·학력사항·자격증·가족사항을 탭별로 등록·수정·삭제합니다. 인사기록카드 출력, 재직/경력/퇴직 증명서 발급도 지원합니다.',
    workflow: '직원 목록 → 직원 선택/등록 → 기본정보 입력 → 경력/학력/자격증/가족 탭에서 추가 → 인사기록카드 출력',
  },
  {
    label: '인사발령',
    icon: ArrowRightLeft,
    href: '/appointments',
    description: '승진, 전보, 직책변경, 입사, 퇴사 등 발령을 등록하고 이력을 관리합니다. 발령 내역은 직원 상세 페이지와 마이페이지에서도 확인 가능합니다.',
    workflow: '발령 유형 선택 → 대상자 선택 → 변경 전/후 정보 입력 → 등록 → 이력 확인',
  },
  {
    label: '근태관리',
    icon: Clock,
    href: '/attendance',
    description: '출퇴근을 기록하고 금일 근태 현황(출근/출장/외근/재택/지각/결근/휴가/반차)을 조회합니다. "근태 신청" 버튼으로 외근·출장·휴가·반차·반반차·재택근무를 신청하면 전자결재로 팀장/상위자에게 자동 전달되고, 최종 승인 시 근태 기록이 자동 생성됩니다.',
    workflow: '출근 → 퇴근 기록 / 근태 신청(전자결재) → 결재 승인 → 근태 자동 반영 → 월별 현황 조회',
  },
  {
    label: '휴가관리',
    icon: CalendarDays,
    href: '/leave',
    description: '직원은 잔여 연차를 확인한 뒤 휴가를 신청합니다. HR은 승인/반려, 연차 일괄 부여, 잔여일수 조정, 휴가 유형(연차/병가/경조/출산 등) 설정을 수행합니다.',
    workflow: '잔여 연차 확인 → 휴가 신청 → 승인/반려 → 잔여일수 자동 차감 → 완료',
  },
  {
    label: '급여관리',
    icon: Banknote,
    href: '/payroll',
    description: '5단계 급여 계산 워크플로우(기간/직원 불러오기 → 근태내역 확인 → 지급항목 설정 → 공제항목 설정 → 계산/결과)를 제공합니다. 계산 결과를 엑셀로 다운로드하거나 업로드할 수 있고, 월별 마감/마감해제/지급완료 처리가 가능합니다. 하위 메뉴로 4대보험 관리, 연말정산, 퇴직금 관리, 원천징수부, 급여 대시보드(월별 집계·부서별·항목별·분포 분석)를 제공합니다.',
    workflow: '직원 불러오기 → 근태 확인 → 지급항목 설정 → 공제항목 설정 → 계산 → 저장 → 마감 → 지급완료',
  },
  {
    label: '전자결재',
    icon: FileCheck,
    href: '/approval',
    description: '근태 신청(외근/출장/휴가/반차/재택), 경비, 발령 등의 문서를 기안하고 결재라인에서 순차적으로 승인/반려합니다. 결재 라인은 자동으로 팀장→본부장 순서로 설정되며, 신청 시 직접 변경할 수도 있습니다. 승인/반려 결과는 알림 벨(헤더)로 실시간 통지됩니다.',
    workflow: '근태 신청 또는 문서 기안 → 결재라인 확인/변경 → 제출 → 순차 승인/반려 → 신청자에게 알림 → 근태 자동 반영',
  },
  {
    label: '감사로그',
    icon: ShieldAlert,
    href: '/audit-log',
    description: '시스템 사용 내역을 추적합니다. 로그인/로그아웃, 페이지 조회, 데이터 생성/수정/삭제, 결재 승인/반려 등의 액션과 사용자명, 역할, IP 주소, 일시를 기록하여 보안 감사를 지원합니다.',
    workflow: '사용자명/액션유형/기간 필터 → 로그 조회 → IP 주소 확인 → 이상 행위 추적',
  },
  {
    label: '설정',
    icon: Settings,
    href: '/settings',
    description: '회사정보, 부서/직급/직책 관리, 근무일정(유연근무 포함), 공휴일, 연차정책, 경조사휴가, 결재양식, 코드관리(모든 화면에 사용되는 코드 라벨 변경), 급여 항목, 알림, 보안, 화면 설정 등 시스템 전반의 설정을 관리합니다.',
    workflow: '설정 메뉴 선택 → 항목 조회/수정 → 저장',
  },
];

// ── Sub-components ──

function FlowNodeCard({
  node,
  isActive,
  isHighlighted,
  isDimmed,
  onClick,
}: {
  node: FlowNode;
  isActive: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  onClick?: () => void;
}) {
  const Icon = node.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border-border bg-card text-card-foreground',
        isHighlighted && 'ring-2 ring-primary/50',
        isDimmed && 'opacity-40'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{node.label}</span>
    </button>
  );
}

function WorkflowDiagram({
  pathname,
  search,
  onNodeClick,
}: {
  pathname: string;
  search: string;
  onNodeClick: (href: string) => void;
}) {
  const isNodeActive = (node: FlowNode) => {
    if (node.href === '/') return pathname === '/';
    return pathname.startsWith(node.href);
  };

  const isNodeMatch = (node: FlowNode) => {
    if (!search) return false;
    return matchesSearch(node.label, search);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">전체 업무흐름도</h3>
      <div className="flex flex-col items-center gap-1.5">
        {workflowRows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex flex-col items-center gap-1.5">
            {rowIdx > 0 && (
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <div className="flex items-center gap-1.5">
              {row.nodes.map((node, nodeIdx) => (
                <div key={node.id} className="flex items-center gap-1.5">
                  {nodeIdx > 0 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <FlowNodeCard
                    node={node}
                    isActive={isNodeActive(node)}
                    isHighlighted={search ? isNodeMatch(node) : false}
                    isDimmed={search ? !isNodeMatch(node) : false}
                    onClick={() => onNodeClick(node.href)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideItem({
  guide,
  pathname,
  forceOpen,
  onNavigate,
}: {
  guide: ModuleGuide;
  pathname: string;
  forceOpen?: boolean;
  onNavigate: (href: string) => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const Icon = guide.icon;
  const isActive = guide.href === '/' ? pathname === '/' : pathname.startsWith(guide.href);
  const isOpen = forceOpen || manualOpen;

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isActive && 'border-primary/50',
        forceOpen && 'border-primary bg-primary/5'
      )}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!manualOpen)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1">{guide.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="border-t px-3 py-2.5 text-sm">
          <p className="text-muted-foreground leading-relaxed">{guide.description}</p>
          <div className="mt-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">흐름: </span>
            {guide.workflow}
          </div>
          <button
            type="button"
            onClick={() => onNavigate(guide.href)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {guide.label} 페이지로 이동
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export function HelpWorkflow() {
  const [open, setOpen] = useState(false);

  // 헤더의 ? 버튼이 이 이벤트로 엽니다. 트리거와 패널이 다른 컴포넌트에 있어
  // 전역 이벤트 하나로 잇습니다 — 컨텍스트를 만들 만큼의 관계가 아닙니다.
  useEffect(() => {
    const openHelp = () => setOpen(true);
    window.addEventListener('open-help', openHelp);
    return () => window.removeEventListener('open-help', openHelp);
  }, []);
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    if (!normalizedSearch) return moduleGuides;
    return moduleGuides.filter(
      (g) =>
        g.label.toLowerCase().includes(normalizedSearch) ||
        g.description.toLowerCase().includes(normalizedSearch) ||
        g.workflow.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  // Auto-focus search input when the sheet opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleNavigate = (href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch('');
    }
  };

  return (
    <>
      {/* Sheet panel — 여는 버튼은 헤더에 있습니다. 예전에는 화면 오른쪽
          아래에 떠 있었는데, 폼의 저장·수정 버튼이 정확히 그 자리라 겹쳐서
          버튼을 못 누르는 화면이 나왔습니다. */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-md w-full p-0 flex flex-col"
          onOpenAutoFocus={(e) => {
            // Let our own autoFocus handle it (search input)
            e.preventDefault();
          }}
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-lg">업무 도움말</SheetTitle>
            <SheetDescription>
              HRMS 업무흐름 가이드 및 모듈별 사용법
            </SheetDescription>
          </SheetHeader>

          {/* Search input - fixed above scroll area */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent radix dialog from capturing keystrokes
                  e.stopPropagation();
                }}
                placeholder="모듈 검색... (예: 급여, 휴가, 근태)"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {search && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                검색 결과: {filteredGuides.length}건
              </p>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-4 p-4">
              {/* Workflow diagram */}
              <WorkflowDiagram
                pathname={pathname}
                search={normalizedSearch}
                onNodeClick={handleNavigate}
              />

              {/* Module guides */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">모듈별 가이드</h3>
                {filteredGuides.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    검색 결과 없음
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredGuides.map((guide) => (
                      <GuideItem
                        key={guide.href}
                        guide={guide}
                        pathname={pathname}
                        forceOpen={!!search}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
