import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

// Supabase 관리자 환경 변수 확인
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAdminKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다."
  );
}

if (!supabaseAdminKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
  );
}

// 서버 전용 Supabase 관리자 클라이언트
// RLS를 우회할 수 있으므로 서버에서만 사용
export const supabaseAdmin: SupabaseClient =
  createClient(
    supabaseUrl,
    supabaseAdminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

// 기존 함수 호출 방식과의 호환성 유지
export function createAdminClient(): SupabaseClient {
  return supabaseAdmin;
}
