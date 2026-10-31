import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data: plans, error } = await supabaseAdmin
    .from("plans")
    .select("key, name, price, price_label, project_limit, member_limit, features, is_active")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: payRows } = await supabaseAdmin.from("payments").select("plan, status").eq("status", "완료");

  const subsByName = new Map<string, number>();
  for (const r of payRows ?? []) {
    subsByName.set(r.plan, (subsByName.get(r.plan) ?? 0) + 1);
  }

  const result = (plans ?? []).map((p) => ({
    key: p.key,
    name: p.name,
    price: p.price,
    priceLabel: p.price_label,
    projectLimit: p.project_limit,
    memberLimit: p.member_limit,
    features: p.features ?? [],
    isActive: p.is_active,
    subscribers: subsByName.get(p.name) ?? 0,
  }));

  return NextResponse.json({ plans: result });
}
