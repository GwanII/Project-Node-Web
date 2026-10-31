import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mainpage");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "user";
  if (role !== "admin" && role !== "super_admin") {
    redirect("/mainpage");
  }

  const [{ count: failedPayments }, { count: errorReports }] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "실패"),
    supabaseAdmin
      .from("ai_reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["parse_error", "timeout"]),
  ]);

  return (
    <AdminShell
      adminName={profile?.name ?? "관리자"}
      adminRole={role}
      badges={{ payments: failedPayments ?? 0, reports: errorReports ?? 0 }}
    >
      {children}
    </AdminShell>
  );
}
