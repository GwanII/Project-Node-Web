"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Share2,
  RotateCcw,
  Vote as VoteIcon,
  Trophy,
  Inbox,
} from "lucide-react";

type VoteState = "진행중" | "종료";

interface VoteOption {
  label: string;
  count: number;
}

interface MemberStatus {
  name: string;
  done: boolean;
}

interface VoteRecordItem {
  id: number;
  title: string;
  state: VoteState;
  date: string;
  dateLabel: string;
  total: number;
  voted: number;
  note: string;
  options: VoteOption[];
  members: MemberStatus[];
}

const RECORDS: VoteRecordItem[] = [
  {
    id: 6,
    title: "발표 날짜 조율",
    state: "진행중",
    date: "2026.08.22",
    dateLabel: "2026/08/22 마감",
    total: 5,
    voted: 2,
    note: "최종 발표 날짜를 조율하기 위한 투표입니다.",
    options: [
      { label: "8월 25일", count: 1 },
      { label: "8월 27일", count: 1 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: true },
      { name: "한주현", done: false },
      { name: "권소희", done: false },
      { name: "박서연", done: false },
    ],
  },
  {
    id: 5,
    title: "버튼 UI 선택",
    state: "진행중",
    date: "2026.08.15",
    dateLabel: "2026/08/15 마감",
    total: 5,
    voted: 3,
    note: "메인 버튼 디자인 시안을 선택하기 위한 투표입니다.",
    options: [
      { label: "시안 A", count: 2 },
      { label: "시안 B", count: 1 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: true },
      { name: "한주현", done: true },
      { name: "권소희", done: false },
      { name: "박서연", done: false },
    ],
  },
  {
    id: 4,
    title: "7주차 회의 날짜",
    state: "진행중",
    date: "2026.08.05",
    dateLabel: "2026/08/05 마감",
    total: 5,
    voted: 1,
    note: "7주차 정기 회의 날짜를 정하기 위한 투표입니다.",
    options: [
      { label: "화요일", count: 1 },
      { label: "목요일", count: 0 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: false },
      { name: "한주현", done: false },
      { name: "권소희", done: false },
      { name: "박서연", done: false },
    ],
  },
  {
    id: 3,
    title: "로고 시안 최종 선택",
    state: "종료",
    date: "2026.07.20",
    dateLabel: "2026/07/20 종료",
    total: 5,
    voted: 5,
    note: "팀 로고 시안 3개 중 최종안을 선택하기 위한 투표입니다.",
    options: [
      { label: "시안 A", count: 1 },
      { label: "시안 B", count: 3 },
      { label: "시안 C", count: 1 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: true },
      { name: "한주현", done: true },
      { name: "권소희", done: true },
      { name: "박서연", done: true },
    ],
  },
  {
    id: 2,
    title: "팀 회식 메뉴 투표",
    state: "종료",
    date: "2026.07.01",
    dateLabel: "2026/07/01 종료",
    total: 5,
    voted: 4,
    note: "다음 팀 회식 메뉴를 정하기 위한 투표입니다.",
    options: [
      { label: "삼겹살", count: 1 },
      { label: "치킨", count: 2 },
      { label: "피자", count: 1 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: true },
      { name: "한주현", done: true },
      { name: "권소희", done: true },
      { name: "박서연", done: false },
    ],
  },
  {
    id: 1,
    title: "6주차 회의 날짜",
    state: "종료",
    date: "2026.06.15",
    dateLabel: "2026/06/15 종료",
    total: 5,
    voted: 5,
    note: "6주차 정기 회의 날짜를 정하기 위한 투표입니다.",
    options: [
      { label: "월요일", count: 2 },
      { label: "수요일", count: 3 },
    ],
    members: [
      { name: "박성빈", done: true },
      { name: "박기완", done: true },
      { name: "한주현", done: true },
      { name: "권소희", done: true },
      { name: "박서연", done: true },
    ],
  },
];

export default function VoteRecordPage() {
  const router = useRouter();

  const [filter, setFilter] = useState<"전체" | VoteState>("전체");

  const sortedRecords = useMemo(
    () =>
      [...RECORDS].sort((a, b) => {
        if (a.state !== b.state) return a.state === "진행중" ? -1 : 1;
        return a.date < b.date ? 1 : -1;
      }),
    []
  );

  const filteredRecords = useMemo(
    () =>
      filter === "전체"
        ? sortedRecords
        : sortedRecords.filter((r) => r.state === filter),
    [sortedRecords, filter]
  );

  const [selectedId, setSelectedId] = useState<number | null>(
    sortedRecords[0]?.id ?? null
  );

  const selectedRecord = useMemo(
    () =>
      filteredRecords.find((r) => r.id === selectedId) ??
      filteredRecords[0] ??
      null,
    [filteredRecords, selectedId]
  );

  const totalCount = sortedRecords.length;
  const inProgressCount = sortedRecords.filter(
    (r) => r.state === "진행중"
  ).length;
  const closedCount = sortedRecords.filter((r) => r.state === "종료").length;
  const avgParticipation = Math.round(
    (sortedRecords.reduce((sum, r) => sum + r.voted / r.total, 0) /
      (sortedRecords.length || 1)) *
      100
  );

  const leaderLabel = useMemo(() => {
    if (!selectedRecord || selectedRecord.options.length === 0) return "";
    const max = Math.max(...selectedRecord.options.map((o) => o.count));
    const leaders = selectedRecord.options.filter((o) => o.count === max);
    return leaders.map((o) => o.label).join(", ");
  }, [selectedRecord]);

  const handlePrimaryAction = () => {
    router.push("/Projectmainpage");
  };

  const handleShare = () => {
    if (!selectedRecord) return;
    alert(`"${selectedRecord.title}" 투표 결과 링크가 복사되었습니다.`);
  };

  return (
    <div
      className="min-h-screen bg-white text-[#1f2437]"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
      />

      {/* 상단 헤더 */}
      <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10">
        <Link
          href="/Projectmainpage"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#1f2437] hover:text-[#4f46e5] transition-colors bg-white px-3 py-1.5 rounded-lg border border-[#c7d2fe] shadow-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>메인페이지</span>
        </Link>

        <h1 className="text-2xl md:text-3xl font-black text-[#1f2437] tracking-[-0.5px]">
          프로젝트 NODE
        </h1>

        <div className="text-sm font-medium text-[#1f2437]">
          <strong className="text-[#4f46e5] font-bold">박성빈</strong>님 환영합니다
        </div>
      </header>

      <main className="px-8 md:px-10 py-8 space-y-8 max-w-[1440px] mx-auto">
        {/* 페이지 타이틀 + 필터 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center border-[1.5px] border-[#4f46e5] text-[#4f46e5] bg-white text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">
                VOTE
              </span>
              <h2 className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                투표 기록
              </h2>
            </div>
            <p className="text-sm font-medium text-[#6b7280] mt-1">
              메인페이지 투표 위젯에서 진행했던 투표의 결과와 참여 현황을 다시 볼 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["전체", "진행중", "종료"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                  filter === f
                    ? "bg-[#4f46e5] border-[#4f46e5] text-white"
                    : "bg-white border-[#c7d2fe] text-[#1f2437] hover:bg-[#f8faff]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-4 max-[1200px]:grid-cols-2 gap-4">
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <VoteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">전체 투표</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {totalCount}건
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <Circle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">진행중</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {inProgressCount}건
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#f1f3f9] border border-[#c7d2fe] flex items-center justify-center text-[#6b7280] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">종료</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {closedCount}건
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">평균 참여율</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {avgParticipation}%
              </div>
            </div>
          </div>
        </div>

        {/* 2단 구성: 투표 목록 / 투표 상세 */}
        <div className="grid grid-cols-[1fr_380px] max-[1200px]:grid-cols-1 gap-6 items-start">
          {/* 좌: 투표 목록 */}
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5">
            <h3 className="text-lg font-black text-[#1f2437] tracking-[-0.5px] mb-4">
              투표 목록
            </h3>

            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-[#9aa3b8]">
                <Inbox className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">기록이 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record) => {
                  const isSelected = record.id === selectedRecord?.id;
                  return (
                    <button
                      key={record.id}
                      onClick={() => setSelectedId(record.id)}
                      className={`w-full flex items-center gap-3 text-left rounded-2xl border-[1.5px] px-4 py-3 transition-colors ${
                        isSelected
                          ? "border-[#4f46e5] bg-[#f2f5ff]"
                          : "border-[#c7d2fe] bg-white hover:bg-[#f8faff]"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#4f46e5]" : "border-[#c7d2fe]"
                        }`}
                      >
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1f2437] truncate">
                            &quot;{record.title}&quot;
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              record.state === "진행중"
                                ? "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]"
                                : "bg-[#f1f3f9] text-[#6b7280] border-[#c7d2fe]"
                            }`}
                          >
                            {record.state}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#6b7280] mt-0.5">
                          {record.voted}명 참여 · {record.dateLabel}
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-[10px] font-bold text-[#9aa3b8]">
                          내 참여
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            record.members[0]?.done
                              ? "text-[#1f2437]"
                              : "text-[#e5484d]"
                          }`}
                        >
                          {record.members[0]?.done ? "참여 완료" : "참여 X"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우: 투표 상세 */}
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5">
            {!selectedRecord ? (
              <div className="flex flex-col items-center justify-center py-14 text-[#9aa3b8]">
                <Inbox className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">기록을 선택해주세요.</span>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-[#1f2437] tracking-[-0.5px] mb-1">
                  투표 상세
                </h3>

                <div className="flex items-center gap-2 mt-3">
                  <span className="font-black text-[#1f2437] text-base tracking-[-0.5px]">
                    &quot;{selectedRecord.title}&quot;
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedRecord.state === "진행중"
                        ? "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]"
                        : "bg-[#f1f3f9] text-[#6b7280] border-[#c7d2fe]"
                    }`}
                  >
                    {selectedRecord.state}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#6b7280] mt-1">
                  {selectedRecord.dateLabel} · 참여 {selectedRecord.voted}/
                  {selectedRecord.total}명
                </div>
                <p className="text-xs font-medium text-[#6b7280] mt-2 leading-relaxed">
                  {selectedRecord.note}
                </p>

                {/* 강조 박스 */}
                <div className="mt-4 rounded-2xl bg-[#eef2ff] border-[1.5px] border-[#4f46e5] px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#4f46e5]">
                      {selectedRecord.state === "종료" ? "최종 선택" : "현재 1위"}
                    </div>
                    <div className="text-lg font-black text-[#1f2437] tracking-[-0.5px]">
                      {leaderLabel}
                    </div>
                  </div>
                </div>

                {/* 항목별 득표 */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-[#6b7280] mb-2">
                    항목별 득표
                  </h4>
                  <div className="space-y-2.5">
                    {(() => {
                      const maxCount = Math.max(
                        1,
                        ...selectedRecord.options.map((o) => o.count)
                      );
                      return selectedRecord.options.map((option) => {
                        const isLeader = option.count === maxCount;
                        const width = `${(option.count / maxCount) * 100}%`;
                        return (
                          <div key={option.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span
                                className={`font-bold ${
                                  isLeader
                                    ? "text-[#4f46e5]"
                                    : "text-[#1f2437]"
                                }`}
                              >
                                {option.label}
                              </span>
                              <span className="font-medium text-[#6b7280]">
                                {option.count}표
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[#e6ebfb] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isLeader ? "bg-[#4f46e5]" : "bg-[#c7d2fe]"
                                }`}
                                style={{ width }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 참여 현황 */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-[#6b7280] mb-2">
                    참여 현황
                  </h4>
                  <div className="space-y-1.5">
                    {selectedRecord.members.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center justify-between rounded-xl px-3 py-2 border-[1.5px] border-[#c7d2fe] bg-white"
                      >
                        <span className="text-sm font-medium text-[#1f2437]">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            member.done
                              ? "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]"
                              : "bg-white text-[#e5484d] border-[#e5484d]"
                          }`}
                        >
                          {member.done ? "완료" : "미참여"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 하단 버튼 */}
                {selectedRecord.state === "종료" ? (
                  <div className="mt-5">
                    <button
                      onClick={handlePrimaryAction}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-[#4f46e5] bg-white border-[1.5px] border-[#4f46e5] rounded-xl py-2 hover:bg-[#f2f5ff] transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      결과 다시 보기
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      onClick={handlePrimaryAction}
                      className="flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-[#4f46e5] rounded-xl py-2 hover:bg-[#4338ca] transition-colors"
                    >
                      <VoteIcon className="w-4 h-4" />
                      투표 참여하기
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#4f46e5] bg-white border-[1.5px] border-[#4f46e5] rounded-xl py-2 hover:bg-[#f2f5ff] transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      공유
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
