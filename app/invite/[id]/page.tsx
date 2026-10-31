"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type InviteInfo = {
  id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  role: string;
  projectId: string;
  projectName: string;
  inviterName: string;
};

export default function InviteResponsePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);
  const [resultStatus, setResultStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (!user) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/invite/${params.id}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "초대 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      setInvite(json);
      setLoading(false);
    })();
  }, [params.id]);

  async function respond(action: "accept" | "decline") {
    setResponding(action);
    try {
      const res = await fetch(`/api/invite/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json?.error ?? "처리 중 오류가 발생했습니다.");
        return;
      }

      setResultStatus(json.status);

      if (json.status === "accepted") {
        router.push(`/Projectmainpage/${json.projectId}`);
      }
    } finally {
      setResponding(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-sm text-gray-500">
        불러오는 중...
      </div>
    );
  }

  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center bg-gray-100">
        <p className="text-sm text-gray-700">
          초대를 확인하려면 먼저 로그인해주세요.
          <br />
          로그인 후 이 링크로 다시 들어와주시면 됩니다.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-sm text-gray-500">
        {error ?? "초대 정보를 찾을 수 없습니다."}
      </div>
    );
  }

  const effectiveStatus = resultStatus ?? invite.status;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-100">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-2">프로젝트 초대</h1>
        <p className="text-sm text-gray-600 mb-6">
          <strong className="text-gray-900">{invite.inviterName}</strong>님이{" "}
          <strong className="text-gray-900">[{invite.projectName}]</strong> 프로젝트에
          <br />
          팀원으로 초대했습니다.
        </p>

        {effectiveStatus === "pending" ? (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => respond("decline")}
              disabled={responding !== null}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {responding === "decline" ? "처리 중..." : "거절"}
            </button>
            <button
              onClick={() => respond("accept")}
              disabled={responding !== null}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {responding === "accept" ? "처리 중..." : "수락"}
            </button>
          </div>
        ) : effectiveStatus === "accepted" ? (
          <p className="text-sm text-green-600 font-medium">초대를 수락했습니다.</p>
        ) : effectiveStatus === "declined" ? (
          <p className="text-sm text-gray-500 font-medium">초대를 거절했습니다.</p>
        ) : (
          <p className="text-sm text-gray-500 font-medium">만료된 초대입니다.</p>
        )}
      </div>
    </div>
  );
}
