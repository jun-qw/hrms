'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Fuse, { type FuseResultMatch } from 'fuse.js';
import { Users, FileText, Menu } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { HighlightMatches } from '@/lib/utils/highlight-matches';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { ALL_MENU_ITEMS } from '@/lib/constants/menu-items';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useT } from '@/lib/i18n/use-translation';

// Shared open state so header can trigger it
let externalSetOpen: ((v: boolean) => void) | null = null;
export function openCommandPalette() {
  externalSetOpen?.(true);
}

interface SearchEntry {
  id: string;
  category: 'employee' | 'menu';
  title: string;
  subtitle: string;
  href: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { t } = useT();
  const locale = useSettingsStore((s) => s.display.locale);

  // Share setter for external trigger
  useEffect(() => {
    externalSetOpen = setOpen;
    return () => { externalSetOpen = null; };
  }, []);

  // Cmd+K / Ctrl+K binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  // Build searchable entries
  // `t` is intentionally omitted from deps: it is a derived function of `locale`,
  // so `locale` is the true semantic trigger for recomputation.
  /* eslint-disable react-hooks/exhaustive-deps */
  const entries = useMemo<SearchEntry[]>(() => {
    const result: SearchEntry[] = [];

    // Active employees
    for (const emp of employees) {
      if (emp.status !== 'active') continue;
      const dept = departments.find((d) => d.id === emp.department_id)?.name ?? '';
      const rank = positionRanks.find((r) => r.id === emp.position_rank_id)?.name ?? '';
      result.push({
        id: `emp-${emp.id}`,
        category: 'employee',
        title: emp.name,
        subtitle: [dept, rank, emp.employee_number].filter(Boolean).join(' · '),
        href: `/employees/${emp.id}`,
      });
    }

    // Menu items
    for (const menu of ALL_MENU_ITEMS) {
      result.push({
        id: `menu-${menu.href}`,
        category: 'menu',
        title: t(menu.label),
        subtitle: t(menu.description),
        href: menu.href,
      });
    }

    return result;
  }, [employees, departments, positionRanks, locale]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Fuse instance
  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: ['title', 'subtitle'],
        threshold: 0.4,
        distance: 100,
        includeMatches: true,
      }),
    [entries],
  );

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 20 });
  }, [fuse, query]);

  const employeeResults = results.filter((r) => r.item.category === 'employee');
  const menuResults = results.filter((r) => r.item.category === 'menu');
  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  const categoryIcon = (category: string) => {
    switch (category) {
      case 'employee': return <Users className="h-4 w-4 text-muted-foreground" />;
      case 'menu': return <Menu className="h-4 w-4 text-muted-foreground" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderGroup = (
    heading: string,
    items: typeof results,
  ) => {
    if (items.length === 0) return null;
    return (
      <CommandGroup heading={heading}>
        {items.map((result) => (
          <CommandItem
            key={result.item.id}
            value={result.item.id}
            onSelect={() => handleSelect(result.item.href)}
            className="flex items-center gap-3"
          >
            {categoryIcon(result.item.category)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                <HighlightMatches
                  text={result.item.title}
                  matches={result.matches as FuseResultMatch[]}
                  fieldKey="title"
                />
              </div>
              <div className="text-xs text-muted-foreground truncate">
                <HighlightMatches
                  text={result.item.subtitle}
                  matches={result.matches as FuseResultMatch[]}
                  fieldKey="subtitle"
                />
              </div>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}
      title={t('commandPalette.title')}
      description={t('commandPalette.description')}
      shouldFilter={false}
      showCloseButton={false}
    >
      <CommandInput
        placeholder={t('commandPalette.inputPlaceholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() && results.length === 0 && (
          <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
        )}
        {renderGroup(t('commandPalette.groupEmployees'), employeeResults)}
        {renderGroup(t('commandPalette.groupMenus'), menuResults)}
      </CommandList>
    </CommandDialog>
  );
}
