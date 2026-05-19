"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminStoredSessions } from "@/hooks/useAdminStoredSessions";

const navItems = [
  { href: "/admin", label: "Opprett økt", icon: "🎯" },
  { href: "/admin/pagaende", label: "Pågående økter", icon: "☕" },
  { href: "/admin/tenants", label: "Tenants", icon: "🏢" },
  { href: "/admin/quiz", label: "Quiz-maler", icon: "📝" },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: "⚙️" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const { sessions, ready } = useAdminStoredSessions();
  const ongoingCount = ready ? sessions.length : 0;

  return (
    <nav className="flex gap-1 rounded-2xl bg-surface-container-low p-1.5">
      {navItems.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-surface-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface-white/50"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.href === "/admin/pagaende" && ongoingCount > 0 ? (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-surface-white">
                {ongoingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
