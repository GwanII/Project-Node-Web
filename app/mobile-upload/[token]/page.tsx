"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, ImagePlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  name: string;
  status: UploadStatus;
  errorMessage?: string;
}

export default function MobileUploadPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/mobile-upload?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setLinkError(data.error ?? "유효하지 않은 링크입니다.");
        }
      } catch {
        setLinkError("링크를 확인하는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const items: UploadItem[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      status: "pending",
    }));
    setUploads((prev) => [...items, ...prev]);

    for (const [i, file] of files.entries()) {
      const itemId = items[i].id;
      setUploads((prev) =>
        prev.map((u) => (u.id === itemId ? { ...u, status: "uploading" } : u))
      );

      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);

      try {
        const res = await fetch("/api/mobile-upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === itemId ? { ...u, status: "error", errorMessage: data.error } : u
            )
          );
        } else {
          setUploads((prev) =>
            prev.map((u) => (u.id === itemId ? { ...u, status: "done" } : u))
          );
        }
      } catch {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === itemId ? { ...u, status: "error", errorMessage: "업로드 실패" } : u
          )
        );
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F5F7FF] flex flex-col items-center px-5 py-10"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
      />

      <div className="w-full max-w-sm">
        <h1 className="text-xl font-black text-gray-900 text-center tracking-tight">
          자료 보관함 업로드
        </h1>

        {loading ? (
          <div className="mt-10 flex flex-col items-center text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">확인 중...</span>
          </div>
        ) : linkError ? (
          <div className="mt-10 text-center text-sm font-bold text-red-500 bg-white rounded-2xl p-6 border border-red-100">
            {linkError}
          </div>
        ) : (
          <>
            <p className="text-center text-sm font-medium text-gray-500 mt-1">
              촬영하거나 선택한 사진은 PC 화면의 대기 목록에 올라가고,
              PC에서 <strong className="text-[#4f46e5]">확정 업로드</strong>를 눌러야 자료 보관함에 저장됩니다.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-2xl py-8 font-bold text-sm shadow-sm transition-colors"
              >
                <Camera className="w-7 h-7" />
                사진 촬영
              </button>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-[#f2f5ff] text-[#4f46e5] border-2 border-[#4f46e5] rounded-2xl py-8 font-bold text-sm transition-colors"
              >
                <ImagePlus className="w-7 h-7" />
                갤러리에서 선택
              </button>
            </div>

            {uploads.length > 0 && (
              <div className="mt-6 space-y-2">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 border border-gray-100 text-sm"
                  >
                    {u.status === "uploading" && (
                      <Loader2 className="w-4 h-4 text-[#4f46e5] animate-spin shrink-0" />
                    )}
                    {u.status === "pending" && (
                      <Loader2 className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    {u.status === "done" && (
                      <CheckCircle2 className="w-4 h-4 text-[#4f46e5] shrink-0" />
                    )}
                    {u.status === "error" && (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0 truncate font-medium text-gray-800">
                      {u.name}
                    </span>
                    {u.status === "error" && (
                      <span className="text-xs text-red-500 shrink-0">{u.errorMessage}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
