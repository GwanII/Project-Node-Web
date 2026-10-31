"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FolderKanban,
  PenLine,
  Sparkles,
  Wallet,
  Gem,
  Bell,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "대시보드", icon: LayoutGrid },
  { href: "/admin/members", label: "회원 관리", icon: Users },
  { href: "/admin/projects", label: "프로젝트 관리", icon: FolderKanban },
  { href: "/admin/prompt", label: "자소서 프롬프트", icon: PenLine },
  { href: "/admin/reports", label: "AI 리포트 로그", icon: Sparkles, badgeKey: "reports" as const },
  { href: "/admin/payments", label: "결제 내역", icon: Wallet, badgeKey: "payments" as const },
  { href: "/admin/plans", label: "플랜 관리", icon: Gem },
  { href: "/admin/notices", label: "공지 · 알림", icon: Bell },
  { href: "/admin/settings", label: "관리자 설정", icon: Settings },
];

type Badges = { reports?: number; payments?: number };

export default function AdminShell({
  adminName,
  adminRole,
  badges,
  children,
}: {
  adminName: string;
  adminRole: string;
  badges: Badges;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const current =
    NAV.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href))) ??
    NAV[0];

  const roleLabel =
    adminRole === "super_admin" ? "최고 관리자" : adminRole === "admin" ? "관리자" : adminRole;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ffffff", color: "#1f2437" }}>
      <aside
        style={{
          width: 248,
          flex: "0 0 248px",
          background: "#dfe6fd",
          padding: "26px 18px 28px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 900,
                color: "#4f46e5",
                border: "1.5px solid #4f46e5",
                borderRadius: 6,
                padding: "2px 6px",
                background: "#ffffff",
              }}
            >
              ADMIN
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>CobaltHUB</div>
          <div style={{ fontSize: 12, color: "#5b6178" }}>/admin · 관리자 콘솔</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            const badge = n.badgeKey ? badges[n.badgeKey] : undefined;
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  border: "1.5px solid",
                  borderColor: active ? "#c7d2fe" : "transparent",
                  background: active ? "#ffffff" : "transparent",
                  color: active ? "#4f46e5" : "#2b3149",
                  fontWeight: active ? 700 : 500,
                  textDecoration: "none",
                }}
              >
                <Icon size={16} strokeWidth={2} style={{ flex: "0 0 auto" }} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {!!badge && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#ffffff",
                      background: "#e5484d",
                      borderRadius: 999,
                      padding: "1px 7px",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push("/mainpage")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              border: "1.5px solid #c7d2fe",
              borderRadius: 10,
              padding: 9,
              fontSize: 13,
              fontWeight: 500,
              color: "#2b3149",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            ← 서비스로 돌아가기
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#1f2437",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                flex: "0 0 auto",
              }}
            >
              {adminName.slice(0, 1)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{adminName}</div>
              <div style={{ fontSize: 11.5, color: "#5b6178" }}>{roleLabel}</div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 34px",
            borderBottom: "1px solid #eef1fb",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#9aa3b8" }}>관리자 / {current.label}</div>
            <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
              {current.label}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #c7d2fe",
                borderRadius: 999,
                padding: "8px 14px",
                width: 240,
                boxSizing: "border-box",
              }}
            >
              <span style={{ color: "#9aa3b8", fontSize: 12 }}>⌕</span>
              <span style={{ color: "#9aa3b8", fontSize: 12.5 }}>회원, 주문번호, 프로젝트 검색</span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                border: "1px solid #c7d2fe",
                borderRadius: 999,
                padding: "8px 14px",
              }}
            >
              {today} 기준
            </div>
          </div>
        </header>

        <div style={{ padding: "26px 34px 56px", display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
