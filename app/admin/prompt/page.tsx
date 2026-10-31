"use client";

import { useEffect, useRef, useState } from "react";
import { renderPromptTemplate, PROMPT_VARIABLE_KEYS } from "@/src/lib/promptTemplate";

type Version = {
  id: string;
  version: number;
  content: string;
  memo: string | null;
  model: string;
  temperature: number;
  fallbackEnabled: boolean;
  isLive: boolean;
  authorName: string;
  createdAt: string;
};

const MODELS = ["qwen2.5:7b", "llama3.1:8b", "gemma2:9b"];

const SAMPLE_VARS = {
  nickname: "박성빈",
  role: "UI 디자인",
  project_name: "프로젝트 NODE",
  period: "2026.03 ~ 2026.06",
  done_todos: "로그인/회원가입 화면 설계\n팀원 초대 플로우 설계",
  documents: "[참여 프로젝트]\n프로젝트 NODE(2026-03-01~2026-06-30)\n\n[제작·업로드한 산출물]\n와이어프레임.fig(image)\n\n[참여한 회의 기록]\n[2차 스프린트 회고]\n디자인 시스템 컬러 토큰을 통일하기로 결정",
  contribution: "72",
};

const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL ?? "http://localhost:11434/api/generate";

export default function AdminPromptPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [promptText, setPromptText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [model, setModel] = useState("qwen2.5:7b");
  const [temperature, setTemperature] = useState(0.3);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);

  const [testState, setTestState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [testOutput, setTestOutput] = useState("");
  const [testMeta, setTestMeta] = useState<{ ms: number; parsed: boolean } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/prompts");
    const json = await res.json();
    const list: Version[] = json.versions ?? [];
    setVersions(list);
    const live = list.find((v) => v.isLive) ?? list[0];
    if (live) selectVersion(live);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function selectVersion(v: Version) {
    setSelectedId(v.id);
    setPromptText(v.content);
    setSavedText(v.content);
    setModel(v.model);
    setTemperature(v.temperature);
    setFallbackEnabled(v.fallbackEnabled);
    setTestState("idle");
  }

  const dirty = promptText !== savedText;
  const charCount = `${promptText.length}자 · 약 ${Math.round(promptText.length / 2.2)} 토큰`;

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      setPromptText((t) => t + token);
      return;
    }
    const start = el.selectionStart ?? promptText.length;
    const end = el.selectionEnd ?? promptText.length;
    const next = promptText.slice(0, start) + token + promptText.slice(end);
    setPromptText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  function resetPrompt() {
    setPromptText(savedText);
  }

  async function saveAsNewVersion() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: promptText,
          model,
          temperature,
          fallbackEnabled,
          memo: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error ?? "저장에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deploy(id: string) {
    if (!confirm("이 버전을 배포하시겠습니까? /profile 의 리포트 생성에 즉시 반영됩니다.")) return;
    setDeployingId(id);
    try {
      const res = await fetch(`/api/admin/prompts/${id}/deploy`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error ?? "배포에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setDeployingId(null);
    }
  }

  async function runTest() {
    setTestState("running");
    setTestOutput("");
    setTestMeta(null);
    const rendered = renderPromptTemplate(promptText, SAMPLE_VARS);
    const started = performance.now();
    try {
      const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: rendered,
          stream: false,
          format: "json",
          options: { temperature },
        }),
      });
      const data = await res.json();
      const ms = Math.round(performance.now() - started);
      if (data.error) throw new Error(String(data.error));
      const raw = data.response ?? "";
      let parsedOk = false;
      let preview = raw;
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        parsedOk = true;
        preview = parsed.summary ?? JSON.stringify(parsed).slice(0, 400);
      } catch {
        parsedOk = false;
      }
      setTestOutput(preview || "(빈 응답)");
      setTestMeta({ ms, parsed: parsedOk });
      setTestState("done");
    } catch (e) {
      setTestOutput(e instanceof Error ? e.message : "테스트 실행에 실패했습니다.");
      setTestState("error");
    }
  }

  const liveVersion = versions.find((v) => v.isLive);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
      {/* 좌: 버전 기록 */}
      <section
        style={{
          flex: "1 1 220px",
          boxSizing: "border-box",
          border: "1.5px solid #c7d2fe",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900 }}>버전 기록</div>
        {loading && <div style={{ fontSize: 12.5, color: "#9aa3b8" }}>불러오는 중...</div>}
        {versions.map((v) => {
          const active = v.id === selectedId;
          return (
            <div
              key={v.id}
              onClick={() => selectVersion(v)}
              style={{
                border: "1.5px solid",
                borderColor: active ? "#4f46e5" : "#e6ebfb",
                background: active ? "#f2f5ff" : "#ffffff",
                borderRadius: 12,
                padding: "11px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>v{v.version}</span>
                {v.isLive && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#ffffff",
                      background: "#4f46e5",
                      borderRadius: 999,
                      padding: "1px 7px",
                    }}
                  >
                    배포중
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>
                {new Date(v.createdAt).toLocaleDateString("ko-KR")} · {v.authorName}
              </div>
              {v.memo && <div style={{ fontSize: 11.5, color: "#9aa3b8", marginTop: 2 }}>{v.memo}</div>}
              {!v.isLive && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    deploy(v.id);
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#4f46e5",
                    opacity: deployingId === v.id ? 0.5 : 1,
                  }}
                >
                  {deployingId === v.id ? "배포 중..." : "이 버전 배포"}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 가운데: 편집기 */}
      <section
        style={{
          flex: "999 1 460px",
          minWidth: 0,
          boxSizing: "border-box",
          border: "1.5px solid #c7d2fe",
          borderRadius: 18,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>AI 성과 리포트 · 자소서 프롬프트</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              /profile 의 AI 성과 리포트 생성 시 사용됩니다. {liveVersion && `(현재 배포: v${liveVersion.version})`}
            </div>
          </div>
          {dirty && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: 999, padding: "3px 10px" }}>
              저장 안 됨
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>사용 가능한 변수 · 클릭하면 커서 위치에 삽입</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PROMPT_VARIABLE_KEYS.map((k) => (
              <div
                key={k}
                onClick={() => insertVariable(k)}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "ui-monospace, Menlo, monospace",
                  color: "#4f46e5",
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  borderRadius: 6,
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                {`{{${k}}}`}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 460,
            boxSizing: "border-box",
            border: "1.5px solid #c7d2fe",
            borderRadius: 14,
            padding: 16,
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 12.5,
            lineHeight: 1.75,
            color: "#1f2437",
            background: "#f8faff",
            resize: "vertical",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#9aa3b8" }}>{charCount}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              onClick={resetPrompt}
              style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#5b6178", cursor: "pointer" }}
            >
              되돌리기
            </div>
            <div
              onClick={saveAsNewVersion}
              style={{
                border: "1.5px solid #4f46e5",
                borderRadius: 10,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#4f46e5",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "저장 중..." : "새 버전으로 저장"}
            </div>
            <div
              onClick={() => selectedId && deploy(selectedId)}
              style={{
                background: "#4f46e5",
                border: "1.5px solid #4f46e5",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              배포
            </div>
          </div>
        </div>
      </section>

      {/* 우: 모델 설정 + 테스트 */}
      <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 18 }}>
        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>모델 설정</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>모델</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {MODELS.map((m) => {
                const active = model === m;
                return (
                  <div
                    key={m}
                    onClick={() => setModel(m)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1.5px solid",
                      borderColor: active ? "#4f46e5" : "#c7d2fe",
                      background: active ? "#eef2ff" : "#ffffff",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontFamily: "ui-monospace, Menlo, monospace",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: active ? "#4f46e5" : "#c7d2fe",
                        background: active ? "#4f46e5" : "transparent",
                      }}
                    />
                    {m}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
              <span>Temperature</span>
              <span style={{ fontWeight: 700, color: "#1f2437" }}>{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#4f46e5" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "#6b7280" }}>응답 형식</span>
            <span style={{ fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace" }}>format: &quot;json&quot;</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "#6b7280" }}>실패 시 예시 데이터 대체</span>
            <div
              onClick={() => setFallbackEnabled((v) => !v)}
              style={{
                width: 38,
                height: 22,
                borderRadius: 999,
                position: "relative",
                cursor: "pointer",
                background: fallbackEnabled ? "#4f46e5" : "#d1d5db",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#ffffff",
                  left: fallbackEnabled ? 19 : 3,
                  transition: "left .15s",
                }}
              />
            </div>
          </div>
        </section>

        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>테스트 실행</div>
            <div
              onClick={runTest}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
                background: "#4f46e5",
                borderRadius: 8,
                padding: "6px 11px",
                cursor: "pointer",
              }}
            >
              {testState === "running" ? "실행 중..." : "실행"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>샘플: 박성빈 · UI 디자인 · 프로젝트 NODE</div>
          {(testState === "done" || testState === "error") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  border: "1.5px solid #c7d2fe",
                  borderRadius: 12,
                  background: "#f8faff",
                  padding: 12,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: "#2b3149",
                }}
              >
                {testOutput}
              </div>
              {testMeta && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#6b7280", background: "#f1f3f9", borderRadius: 999, padding: "2px 9px" }}>
                    응답 {(testMeta.ms / 1000).toFixed(1)}초
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: testMeta.parsed ? "#6b7280" : "#e5484d",
                      background: testMeta.parsed ? "#f1f3f9" : "#ffffff",
                      border: testMeta.parsed ? "none" : "1px solid #e5484d",
                      borderRadius: 999,
                      padding: "2px 9px",
                    }}
                  >
                    {testMeta.parsed ? "JSON 파싱 성공" : "JSON 파싱 실패"}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
