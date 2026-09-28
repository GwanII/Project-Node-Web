import { createClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트. RLS를 우회하므로 Route Handler 등 서버 코드에서만 사용하고
// "use client" 컴포넌트나 브라우저로 전달되는 코드에는 절대 import하지 않는다.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
