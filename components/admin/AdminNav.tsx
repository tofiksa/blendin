"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Økter", icon: "🎯" },
  { href: "/admin/tenants", label: "Tenants", icon: "🏢" },
  { href: "/admin/quiz", label: "Quiz-maler", icon: "📝" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

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
          </Link>
        );
      })}
    </nav>
  );
}
