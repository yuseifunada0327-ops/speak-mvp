"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, Headphones, BookOpen } from "lucide-react";

const items = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/speaking", label: "話す", icon: Mic },
  { href: "/listening", label: "聴く", icon: Headphones },
  { href: "/vocabulary", label: "語彙", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition ${
                  active
                    ? "text-brand-blue"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
