"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { can, type User } from "@/lib/auth";
import { dashboardItem, navGroups, type NavGroup, type NavItem } from "./nav";

const STORAGE_KEY = "ir-admin-open-groups";

function loadOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveOpenGroups(v: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // Private browsing / blocked storage: the accordion still works, it just won't remember.
  }
}

function isActive(href: string, path: string) {
  return href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`) || path.startsWith(`${href}?`);
}

/** The grouped, collapsible admin sidebar navigation. Icon-rail mode when `collapsed`. */
export function AdminNav({ user, collapsed, onNavigate }: { user: User; collapsed: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  // Explicit expand/collapse the user has clicked. A group with no entry here defaults open
  // when it contains the active page, so navigating there doesn't require a manual click.
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => loadOpenGroups());

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.perm === null || can(user, i.perm)) }))
    .filter((g) => g.items.length > 0);

  function toggle(label: string, defaultOpen: boolean) {
    setOverrides((prev) => {
      const next = { ...prev, [label]: !(label in prev ? prev[label] : defaultOpen) };
      saveOpenGroups(next);
      return next;
    });
  }

  const dashboardActive = isActive(dashboardItem.href, path);

  if (collapsed) {
    return (
      <nav aria-label="Admin" className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3">
        <CollapsedLink item={dashboardItem} active={dashboardActive} onNavigate={onNavigate} />
        <div className="my-1.5 h-px w-8 bg-black/10" aria-hidden />
        {visibleGroups.map((g) =>
          g.items.length === 1 ? (
            <CollapsedLink key={g.label} item={{ ...g.items[0], icon: g.icon }} active={isActive(g.items[0].href, path)} onNavigate={onNavigate} />
          ) : (
            <CollapsedGroup key={g.label} group={g} path={path} onNavigate={onNavigate} />
          ),
        )}
      </nav>
    );
  }

  return (
    <nav aria-label="Admin" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      <Link
        href={dashboardItem.href}
        onClick={onNavigate}
        aria-current={dashboardActive ? "page" : undefined}
        className={`mb-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold transition ${dashboardActive ? "bg-brand-red text-white" : "text-ink/80 hover:bg-surface-alt"}`}
      >
        <dashboardItem.icon size={17} />
        {dashboardItem.label}
      </Link>
      {visibleGroups.map((g) => {
        if (g.items.length === 1) return <SingleRow key={g.label} icon={g.icon} item={g.items[0]} path={path} onNavigate={onNavigate} />;
        const defaultOpen = g.items.some((i) => isActive(i.href, path));
        const open = g.label in overrides ? overrides[g.label] : defaultOpen;
        return <ExpandedGroup key={g.label} group={g} path={path} open={open} onToggle={() => toggle(g.label, defaultOpen)} onNavigate={onNavigate} />;
      })}
    </nav>
  );
}

function SingleRow({ icon: Icon, item, path, onNavigate }: { icon: LucideIcon; item: NavItem; path: string; onNavigate?: () => void }) {
  const active = isActive(item.href, path);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold transition ${active ? "bg-brand-red/10 text-brand-red" : "text-ink/75 hover:bg-surface-alt"}`}
    >
      <Icon size={17} className={active ? "text-brand-red" : "text-ink/45"} />
      {item.label}
    </Link>
  );
}

function ExpandedGroup({ group, path, open, onToggle, onNavigate }: { group: NavGroup; path: string; open: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const active = group.items.some((i) => isActive(i.href, path));
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition hover:bg-surface-alt">
        <group.icon size={17} className={active ? "text-brand-red" : "text-ink/45"} />
        <span className={`flex-1 truncate text-left text-[12px] font-bold uppercase tracking-wide ${active ? "text-ink" : "text-ink/50"}`}>{group.label}</span>
        <ChevronRight size={14} className={`shrink-0 text-ink/30 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <ul className="space-y-0.5 py-0.5">
            {group.items.map((item) => {
              const itemActive = isActive(item.href, path);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={itemActive ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-md py-1.5 pl-8 pr-2.5 text-[13px] font-medium transition ${itemActive ? "bg-brand-red/10 text-brand-red" : "text-ink/70 hover:bg-surface-alt"}`}
                  >
                    <item.icon size={15} className={itemActive ? "text-brand-red" : "text-ink/40"} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CollapsedLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <div className="group relative">
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`grid size-10 place-items-center rounded-md transition ${active ? "bg-brand-red text-white" : "text-ink/60 hover:bg-surface-alt hover:text-ink"}`}
      >
        <item.icon size={19} />
      </Link>
      <span className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-float transition group-hover:visible group-hover:opacity-100">
        {item.label}
      </span>
    </div>
  );
}

function CollapsedGroup({ group, path, onNavigate }: { group: NavGroup; path: string; onNavigate?: () => void }) {
  const active = group.items.some((i) => isActive(i.href, path));
  return (
    <div className="group relative">
      <button type="button" aria-label={group.label} className={`grid size-10 place-items-center rounded-md transition ${active ? "bg-brand-red/10 text-brand-red" : "text-ink/60 hover:bg-surface-alt hover:text-ink"}`}>
        <group.icon size={19} />
      </button>
      <div className="invisible absolute left-full top-0 z-50 ml-2 w-52 -translate-y-1 rounded-xl border border-black/5 bg-white py-2 opacity-0 shadow-float transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{group.label}</p>
        <ul>
          {group.items.map((item) => {
            const itemActive = isActive(item.href, path);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={itemActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium ${itemActive ? "bg-brand-red/10 text-brand-red" : "text-ink/80 hover:bg-surface-alt"}`}
                >
                  <item.icon size={15} className={itemActive ? "text-brand-red" : "text-ink/40"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
