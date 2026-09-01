'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, DemoAccount, UserRole } from '@/types';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-admin',
    email: 'admin@demo.com',
    name: '최선우',
    role: 'admin',
    employee_id: 'e004',
    department: '경영지원본부',
    position: '본부장',
    password: 'demo1234',
  },
  {
    id: 'demo-hr',
    email: 'hr@demo.com',
    name: '정승현',
    role: 'hr_manager',
    employee_id: 'e010',
    department: '인사팀',
    position: '팀장',
    password: 'demo1234',
  },
  {
    id: 'demo-manager',
    email: 'manager@demo.com',
    name: '노지후',
    role: 'dept_manager',
    employee_id: 'e022',
    department: '연구개발팀',
    position: '팀장',
    password: 'demo1234',
  },
  {
    id: 'demo-employee',
    email: 'employee@demo.com',
    name: '백수현',
    role: 'employee',
    employee_id: 'e020',
    department: '해외영업팀',
    position: '사원',
    password: 'demo1234',
  },
  {
    id: 'demo-finance',
    email: 'jang@demo.com',
    name: '임하윤',
    role: 'employee',
    employee_id: 'e013',
    department: '재무회계팀',
    position: '과장',
    password: 'demo1234',
  },
];

export interface DbSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string | null;
}

interface AuthState {
  session: AuthSession | null;
  loginDemo: (email: string, password: string) => boolean;
  loginDemoByRole: (role: UserRole) => void;
  setDbSession: (user: DbSessionUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,

      loginDemo: (email: string, password: string) => {
        const account = DEMO_ACCOUNTS.find(
          (a) => a.email === email && a.password === password
        );
        if (!account) return false;

        set({
          session: {
            account_id: account.id,
            user_id: account.id,
            user_name: account.name,
            user_email: account.email,
            role: account.role,
            employee_id: account.employee_id,
            session_id: crypto.randomUUID(),
            logged_in_at: new Date().toISOString(),
            is_demo: true,
          },
        });
        return true;
      },

      loginDemoByRole: (role: UserRole) => {
        const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
        set({
          session: {
            account_id: account.id,
            user_id: account.id,
            user_name: account.name,
            user_email: account.email,
            role: account.role,
            employee_id: account.employee_id,
            session_id: crypto.randomUUID(),
            logged_in_at: new Date().toISOString(),
            is_demo: true,
          },
        });
      },

      // Mirrors a server-verified (AUTH_MODE=db) session into the client
      // store so the client-side guard and header keep working during the
      // demo -> db migration.
      setDbSession: (user: DbSessionUser) => {
        set({
          session: {
            account_id: user.id,
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            role: user.role,
            employee_id: user.employeeId ?? '',
            session_id: crypto.randomUUID(),
            logged_in_at: new Date().toISOString(),
            is_demo: false,
          },
        });
      },

      clearSession: () => {
        set({ session: null });
      },
    }),
    {
      name: 'hrms-auth',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        // v2→3: seed accounts renamed — drop stale sessions
        if (version < 3) {
          return { session: null };
        }
        return persisted as Record<string, unknown>;
      },
    }
  )
);
