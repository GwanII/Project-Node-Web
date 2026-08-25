"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dices,
  Shuffle,
  Rows3,
  Trophy,
  RotateCcw,
  Share2,
  Inbox,
} from "lucide-react";

type GameType = "제비뽑기" | "사다리타기";

interface GameEntry {
  name: string;
  result: string;
}

interface GameRecord {
  id: number;
  title: string;
  type: GameType;
  date: string;
  people: number;
  winner: string;
  note: string;
  entries: GameEntry[];
}

const RECORDS: GameRecord[] = [
  {
    id: 6,
    title: "발표 순서 제비뽑기",
    type: "제비뽑기",
    date: "2026.08.20",
    people: 5,
    winner: "박서연",
    note: "최종 발표 순서 첫 번째를 정하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "3번째" },
      { name: "박기완", result: "5번째" },
      { name: "한주현", result: "4번째" },
      { name: "권소희", result: "2번째" },
      { name: "박서연", result: "1번째" },
    ],
  },
  {
    id: 5,
    title: "청소 당번 사다리타기",
    type: "사다리타기",
    date: "2026.08.18",
    people: 5,
    winner: "박기완",
    note: "이번 주 사무실 청소 담당자를 정하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "커피 사기" },
      { name: "박기완", result: "청소 당번" },
      { name: "한주현", result: "간식 사기" },
      { name: "권소희", result: "면제" },
      { name: "박서연", result: "면제" },
    ],
  },
  {
    id: 4,
    title: "회의 진행자 제비뽑기",
    type: "제비뽑기",
    date: "2026.08.10",
    people: 3,
    winner: "한주현",
    note: "7주차 회의 진행자를 정하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "미당첨" },
      { name: "한주현", result: "당첨" },
      { name: "박기완", result: "미당첨" },
    ],
  },
  {
    id: 3,
    title: "발표 자료 담당 사다리타기",
    type: "사다리타기",
    date: "2026.08.05",
    people: 4,
    winner: "권소희",
    note: "1차 발표 자료 제작 담당자를 정하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "디자인" },
      { name: "박기완", result: "자료 조사" },
      { name: "한주현", result: "발표 대본" },
      { name: "권소희", result: "PPT 제작" },
    ],
  },
  {
    id: 2,
    title: "간식 내기 제비뽑기",
    type: "제비뽑기",
    date: "2026.07.28",
    people: 5,
    winner: "박성빈, 박기완",
    note: "이번 주 팀 간식 담당자 2명을 정하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "당첨" },
      { name: "박기완", result: "당첨" },
      { name: "한주현", result: "미당첨" },
      { name: "권소희", result: "미당첨" },
      { name: "박서연", result: "미당첨" },
    ],
  },
  {
    id: 1,
    title: "역할 분담 사다리타기",
    type: "사다리타기",
    date: "2026.07.20",
    people: 5,
    winner: "한주현",
    note: "프로젝트 초기 역할을 분담하기 위해 진행했습니다.",
    entries: [
      { name: "박성빈", result: "기획" },
      { name: "박기완", result: "디자인" },
      { name: "한주현", result: "팀장 보조" },
      { name: "권소희", result: "자료 조사" },
      { name: "박서연", result: "발표" },
    ],
  },
];

const typeIcon = (type: GameType) => (type === "제비뽑기" ? Shuffle : Rows3);

export default function MiniGameArchivePage() {
  const router = useRouter();

  const [filter, setFilter] = useState<"전체" | GameType>("전체");

  const sortedRecords = useMemo(
    () => [...RECORDS].sort((a, b) => (a.date < b.date ? 1 : -1)),
    []
  );

  const filteredRecords = useMemo(
    () =>
      filter === "전체"
        ? sortedRecords
        : sortedRecords.filter((r) => r.type === filter),
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
  const drawCount = sortedRecords.filter((r) => r.type === "제비뽑기").length;
  const ladderCount = sortedRecords.filter(
    (r) => r.type === "사다리타기"
  ).length;

  const handleReplay = () => {
    router.push("/Projectmainpage");
  };

  const handleShare = () => {
    if (!selectedRecord) return;
    alert(`"${selectedRecord.title}" 결과 링크가 복사되었습니다.`);
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
            <h2 className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
              미니게임 보관함
            </h2>
            <p className="text-sm font-medium text-[#6b7280] mt-1">
              메인페이지 미니게임에서 진행했던 제비뽑기 · 사다리타기 결과를 다시 볼 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["전체", "제비뽑기", "사다리타기"] as const).map((f) => (
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

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-3 max-[1200px]:grid-cols-2 gap-4">
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">총 진행 횟수</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {totalCount}회
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">제비뽑기 횟수</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {drawCount}회
              </div>
            </div>
          </div>

          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
              <Rows3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6b7280]">사다리타기 횟수</div>
              <div className="text-2xl font-black text-[#1f2437] tracking-[-0.5px]">
                {ladderCount}회
              </div>
            </div>
          </div>
        </div>

        {/* 2단 구성: 진행 기록 / 결과 상세 */}
        <div className="grid grid-cols-[1fr_380px] max-[1200px]:grid-cols-1 gap-6 items-start">
          {/* 좌: 진행 기록 */}
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5">
            <h3 className="text-lg font-black text-[#1f2437] tracking-[-0.5px] mb-4">
              진행 기록
            </h3>

            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-[#9aa3b8]">
                <Inbox className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">기록이 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record) => {
                  const Icon = typeIcon(record.type);
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
                      <div className="w-11 h-11 rounded-xl bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1f2437] truncate">
                            {record.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe] shrink-0">
                            {record.type}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#6b7280] mt-0.5">
                          {record.date} · {record.people}명 참여
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-[10px] font-bold text-[#9aa3b8]">
                          당첨
                        </div>
                        <div className="text-sm font-bold text-[#4f46e5] max-w-[120px] truncate">
                          {record.winner}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우: 결과 상세 */}
          <div className="bg-white border-[1.5px] border-[#c7d2fe] rounded-2xl p-5">
            {!selectedRecord ? (
              <div className="flex flex-col items-center justify-center py-14 text-[#9aa3b8]">
                <Inbox className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">기록을 선택해주세요.</span>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-[#1f2437] tracking-[-0.5px] mb-1">
                  결과 상세
                </h3>

                <div className="flex items-center gap-2 mt-3">
                  <span className="font-black text-[#1f2437] text-base tracking-[-0.5px]">
                    {selectedRecord.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]">
                    {selectedRecord.type}
                  </span>
                </div>
                <div className="text-xs font-medium text-[#6b7280] mt-1">
                  {selectedRecord.date} · {selectedRecord.people}명 참여
                </div>
                <p className="text-xs font-medium text-[#6b7280] mt-2 leading-relaxed">
                  {selectedRecord.note}
                </p>

                {/* 당첨자 강조 박스 */}
                <div className="mt-4 rounded-2xl bg-[#eef2ff] border-[1.5px] border-[#4f46e5] px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#c7d2fe] flex items-center justify-center text-[#4f46e5] shrink-0">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#4f46e5]">당첨자</div>
                    <div className="text-lg font-black text-[#1f2437] tracking-[-0.5px]">
                      {selectedRecord.winner}
                    </div>
                  </div>
                </div>

                {/* 참여자 순번 리스트 */}
                <div className="mt-4 space-y-1.5">
                  {selectedRecord.entries.map((entry, index) => {
                    const isWinner = selectedRecord.winner
                      .split(",")
                      .map((w) => w.trim())
                      .includes(entry.name);
                    return (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 border-[1.5px] ${
                          isWinner
                            ? "bg-[#f2f5ff] border-[#4f46e5]"
                            : "bg-white border-[#c7d2fe]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isWinner
                                ? "bg-[#4f46e5] text-white"
                                : "bg-[#eef2ff] text-[#4f46e5]"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span
                            className={`text-sm truncate ${
                              isWinner
                                ? "font-bold text-[#4f46e5]"
                                : "font-medium text-[#1f2437]"
                            }`}
                          >
                            {entry.name}
                          </span>
                        </div>
                        <span
                          className={`text-xs shrink-0 pl-2 ${
                            isWinner
                              ? "font-bold text-[#4f46e5]"
                              : "font-medium text-[#6b7280]"
                          }`}
                        >
                          {entry.result}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 버튼 */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleReplay}
                    className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#4f46e5] bg-white border-[1.5px] border-[#4f46e5] rounded-xl py-2 hover:bg-[#f2f5ff] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    같은 설정으로 다시 하기
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-[#4f46e5] rounded-xl py-2 hover:bg-[#4338ca] transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    공유
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
