"use client";

import React, { useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { ChevronLeft, ChevronRight, Trash2, X, Plus } from "lucide-react";

import { createId, TODAY, THIS_MONTH } from "./data";

/**
 * 문서 안에 끼워넣는 달력 블록.
 *
 * 투표 블록과 같은 방식이다 — 내용은 노드 속성으로 들어가고,
 * 그 속성이 문서 HTML 로 저장되므로 기존 자동저장에 그대로 실려간다.
 */

export interface CalendarEvent {
  id: string;
  /** "yyyy-mm-dd" */
  date: string;
  text: string;
  color: string;
}

interface CalendarAttrs {
  calendarId: string;
  title: string;
  events: CalendarEvent[];
}

const EVENT_COLORS = [
  { label: "파랑", value: "#8CA5FF" },
  { label: "빨강", value: "#FF4D4D" },
  { label: "초록", value: "#22C55E" },
  { label: "보라", value: "#A855F7" },
  { label: "노랑", value: "#F59E0B" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function createEmptyCalendar(): CalendarAttrs {
  return {
    calendarId: createId(),
    title: "새 달력",
    events: [],
  };
}

/** "yyyy-mm" 한 달치 칸을 만든다. 앞뒤 빈칸은 null 로 채운다. */
function buildMonthGrid(month: string): (string | null)[] {
  const [year, mon] = month.split("-").map(Number);
  // 인자를 명시한 Date 는 결과가 항상 같아서 렌더 중에 써도 안전하다.
  const startWeekday = new Date(year, mon - 1, 1).getDay();
  const daysInMonth = new Date(year, mon, 0).getDate();

  const cells: (string | null)[] = Array(startWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// 화면
// ---------------------------------------------------------------------------

function CalendarBlockView({
  node,
  updateAttributes,
  deleteNode,
  editor,
}: ReactNodeViewProps) {
  const attrs = node.attrs as CalendarAttrs;
  const events: CalendarEvent[] = attrs.events ?? [];
  const canEdit = editor.isEditable;

  // 보고 있는 달과 고른 날짜는 문서 내용이 아니라 화면 상태라서 저장하지 않는다.
  const [month, setMonth] = useState(THIS_MONTH);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].value);

  const cells = buildMonthGrid(month);
  const [year, mon] = month.split("-").map(Number);

  const eventsOn = (date: string) => events.filter((e) => e.date === date);

  const addEvent = () => {
    const text = newText.trim();
    if (!text || !selectedDate) return;
    updateAttributes({
      events: [...events, { id: createId(), date: selectedDate, text, color: newColor }],
    });
    setNewText("");
  };

  const removeEvent = (id: string) =>
    updateAttributes({ events: events.filter((e) => e.id !== id) });

  return (
    <NodeViewWrapper className="my-3">
      <div
        className="border-2 border-[#8CA5FF] rounded-2xl bg-white p-4 space-y-3"
        /* 투표 블록과 같은 이유. 없으면 ProseMirror 와 React 가 포커스를 두고 다툰다. */
        contentEditable={false}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* 머리말 */}
        <div className="flex items-center justify-between gap-2">
          <input
            value={attrs.title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            readOnly={!canEdit}
            placeholder="달력 이름"
            className="min-w-0 flex-1 text-base font-extrabold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[#8CA5FF] focus:outline-none transition-colors"
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-800 w-24 text-center tabular-nums">
              {year}년 {mon}월
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonth(THIS_MONTH)}
              className="text-xs font-bold text-[#8CA5FF] hover:text-blue-600 px-2 transition-colors"
            >
              오늘
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={deleteNode}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="달력 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 요일 */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-[11px] font-bold py-1 ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 칸 */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} />;

            const dayEvents = eventsOn(date);
            const dayNumber = Number(date.slice(-2));
            const weekday = index % 7;
            const isToday = date === TODAY;
            const isSelected = date === selectedDate;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className={`min-h-[62px] rounded-lg border p-1 text-left align-top transition-colors ${
                  isSelected
                    ? "border-[#8CA5FF] bg-blue-50"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`text-[11px] font-bold mb-0.5 ${
                    isToday
                      ? "bg-[#8CA5FF] text-white rounded-full w-5 h-5 flex items-center justify-center"
                      : weekday === 0
                        ? "text-red-500"
                        : weekday === 6
                          ? "text-blue-500"
                          : "text-gray-700"
                  }`}
                >
                  {dayNumber}
                </div>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="text-[10px] font-semibold text-white rounded px-1 py-0.5 truncate"
                      style={{ backgroundColor: event.color }}
                      title={event.text}
                    >
                      {event.text}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] font-semibold text-gray-500 px-1">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 고른 날짜의 일정 */}
        {selectedDate && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                {selectedDate.replace(/-/g, ". ")} 일정
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors"
                title="닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {eventsOn(selectedDate).map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">
                    {event.text}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeEvent(event.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="일정 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {eventsOn(selectedDate).length === 0 && (
                <div className="text-xs text-gray-400">등록된 일정이 없습니다.</div>
              )}
            </div>

            {canEdit && (
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex items-center gap-1 shrink-0">
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewColor(color.value)}
                      className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${
                        newColor === color.value
                          ? "ring-2 ring-offset-1 ring-gray-700"
                          : "border border-gray-300"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEvent();
                    }
                  }}
                  placeholder="일정 입력 후 Enter"
                  className="flex-1 min-w-0 text-sm px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={addEvent}
                  className="shrink-0 flex items-center gap-1 bg-[#8CA5FF] hover:bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  추가
                </button>
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-2">
            날짜를 누르면 일정을 넣을 수 있습니다.
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// Tiptap 노드 정의
// ---------------------------------------------------------------------------

export const CalendarBlock = Node.create({
  name: "calendarBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      calendarId: { default: "" },
      title: { default: "새 달력" },
      events: {
        default: [] as CalendarEvent[],
        // 배열은 HTML 속성에 그대로 못 넣으므로 JSON 문자열로 바꿔서 저장한다.
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-events") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-events": JSON.stringify(attributes.events ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="calendar"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "calendar" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalendarBlockView);
  },
});
