'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, User, GripVertical } from 'lucide-react';
import type { DragPayload } from '@/types';

interface DragOverlayProps {
  payload: DragPayload | null;
}

export function DragOverlay({ payload }: DragOverlayProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (payload) {
      // Delay for entrance animation
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [payload]);

  useEffect(() => {
    if (!payload) return;

    const handleDragOver = (e: globalThis.DragEvent) => {
      // Filter out the final (0,0) event that fires on dragend
      if (e.clientX !== 0 || e.clientY !== 0) {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('dragover', handleDragOver);
    return () => document.removeEventListener('dragover', handleDragOver);
  }, [payload]);

  if (!mounted || !payload) return null;

  const Icon = payload.type === 'department' ? Building2 : User;
  const label = payload.type === 'department' ? '부서 이동 중' : '직원 이동 중';

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -60%) scale(${visible ? 1 : 0.8})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease-out',
      }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute -inset-3 rounded-[28px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(120,180,255,0.12) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />

      {/* Main liquid glass container */}
      <div
        className="relative px-4 py-3 rounded-2xl min-w-[160px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.08) 100%)',
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: [
            '0 12px 40px rgba(0,0,0,0.12)',
            '0 4px 12px rgba(0,0,0,0.06)',
            'inset 0 1px 0 rgba(255,255,255,0.5)',
            'inset 0 -1px 0 rgba(255,255,255,0.1)',
          ].join(', '),
        }}
      >
        {/* Top specular highlight — the "liquid" reflection */}
        <div
          className="absolute inset-x-0 top-0 h-[55%] rounded-t-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
          }}
        />

        {/* Secondary edge highlight — left side refraction */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[40%] rounded-l-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
          }}
        />

        {/* Inner border glow */}
        <div
          className="absolute inset-[1px] rounded-[15px] pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        />

        {/* Content */}
        <div className="relative flex items-center gap-3">
          {/* Icon container — nested glass */}
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            <Icon className="h-4 w-4 text-foreground/80" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
              {payload.name}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {label}
            </p>
          </div>

          <GripVertical className="h-4 w-4 text-foreground/25 ml-auto shrink-0" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
