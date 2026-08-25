"use client";

import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { Vote as VoteIcon, Plus, X, Trash2, Check } from "lucide-react";

import { createId, CURRENT_USER, TODAY } from "./data";

/**
 * 문서 안에 끼워넣는 투표 블록.
 *
 * 투표 내용은 노드 속성(attribute)으로 들어가고, 그 속성은 문서 HTML 로 저장된다.
 * 그래서 따로 저장 코드를 붙이지 않아도 기존 자동저장에 그대로 실려간다.
 */

export interface VoteOption {
  id: string;
  text: string;
  /** 이 항목을 고른 사람들. 지금은 CURRENT_USER 한 명뿐이고, 로그인이 붙으면 실제 사용자 id 가 들어간다. */
  voters: string[];
}

interface VoteAttrs {
  voteId: string;
  title: string;
  deadline: string;
  options: VoteOption[];
}

export function createEmptyVote(): VoteAttrs {
  return {
    voteId: createId(),
    title: "새 투표",
    deadline: "",
    options: [
      { id: createId(), text: "", voters: [] },
      { id: createId(), text: "", voters: [] },
    ],
  };
}

// ---------------------------------------------------------------------------
// 화면
// ---------------------------------------------------------------------------

function VoteBlockView({
  node,
  updateAttributes,
  deleteNode,
  editor,
}: ReactNodeViewProps) {
  const attrs = node.attrs as VoteAttrs;
  const options: VoteOption[] = attrs.options ?? [];
  const canEdit = editor.isEditable;

  const totalVotes = options.reduce((sum, o) => sum + o.voters.length, 0);
  const myChoice = options.find((o) => o.voters.includes(CURRENT_USER));

  // 마감일과 오늘 둘 다 "yyyy-mm-dd" 라서 문자열 비교로 충분하다.
  // (렌더 중에 Date.now() 를 읽으면 리렌더마다 값이 달라져 불안정해진다.)
  const isClosed = !!attrs.deadline && attrs.deadline < TODAY;

  const setOptions = (next: VoteOption[]) => updateAttributes({ options: next });

  /** 같은 항목을 다시 누르면 취소, 다른 항목을 누르면 옮긴다. */
  const toggleVote = (optionId: string) => {
    if (!canEdit || isClosed) return;
    setOptions(
      options.map((o) => {
        const without = o.voters.filter((v) => v !== CURRENT_USER);
        if (o.id !== optionId) return { ...o, voters: without };
        return o.voters.includes(CURRENT_USER)
          ? { ...o, voters: without }
          : { ...o, voters: [...without, CURRENT_USER] };
      })
    );
  };

  const addOption = () =>
    setOptions([...options, { id: createId(), text: "", voters: [] }]);

  const removeOption = (optionId: string) =>
    setOptions(options.filter((o) => o.id !== optionId));

  const updateOptionText = (optionId: string, text: string) =>
    setOptions(options.map((o) => (o.id === optionId ? { ...o, text } : o)));

  return (
    <NodeViewWrapper className="my-3">
      <div
        className="border-2 border-[#8CA5FF] rounded-2xl bg-white p-4 space-y-3"
        /*
         * 이 표시가 없으면 ProseMirror 가 이 안을 자기가 편집하는 영역으로 여겨서
         * React 와 서로 포커스를 뺏다가 무한 렌더 루프에 빠진다.
         * 커스텀 노드 안에 입력창을 넣을 때는 필수다.
         */
        contentEditable={false}
        // 블록 안에서 타이핑할 때 에디터가 키 입력을 가로채지 않게 한다.
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* 머리말 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <VoteIcon className="w-5 h-5 text-gray-700 shrink-0" />
            {/*
              제목은 항상 입력창으로 둔다.
              보기/편집을 토글하면 autoFocus 가 필요해지는데, 노드가 갱신될 때마다
              다시 포커스를 잡으려 들어서 불안정해진다.
            */}
            <input
              value={attrs.title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              readOnly={!canEdit}
              placeholder="투표 제목"
              className="flex-1 min-w-0 text-base font-extrabold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[#8CA5FF] focus:outline-none transition-colors"
            />
            {isClosed && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                종료됨
              </span>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={deleteNode}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              title="투표 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 항목 */}
        <div className="space-y-2">
          {options.map((option) => {
            const count = option.voters.length;
            const percent = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            const isMine = option.voters.includes(CURRENT_USER);

            return (
              <div key={option.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleVote(option.id)}
                  disabled={!canEdit || isClosed}
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isMine
                      ? "bg-[#8CA5FF] border-[#8CA5FF] text-white"
                      : "border-gray-300 hover:border-[#8CA5FF]"
                  } ${!canEdit || isClosed ? "cursor-not-allowed opacity-60" : ""}`}
                  title={isMine ? "투표 취소" : "이 항목에 투표"}
                >
                  {isMine && <Check className="w-3 h-3" />}
                </button>

                {/* 이름 + 득표 막대 */}
                <div className="flex-1 min-w-0 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#DDE5FF] rounded-md transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                  <input
                    value={option.text}
                    onChange={(e) => updateOptionText(option.id, e.target.value)}
                    readOnly={!canEdit}
                    placeholder="항목 이름"
                    className="relative w-full bg-transparent text-sm font-semibold text-gray-800 px-2 py-1.5 focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <span className="shrink-0 text-xs font-bold text-gray-600 w-16 text-right tabular-nums">
                  {count}표 · {percent}%
                </span>

                {canEdit && options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="shrink-0 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="항목 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 꼬리말 */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600">
            <span>{totalVotes}명 참여</span>
            <span className={myChoice ? "text-gray-800" : "text-red-500"}>
              {myChoice ? "참여 완료" : "참여 X"}
            </span>
            {canEdit ? (
              <label className="flex items-center gap-1">
                마감
                <input
                  type="date"
                  value={attrs.deadline}
                  onChange={(e) => updateAttributes({ deadline: e.target.value })}
                  className="border border-gray-200 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            ) : (
              attrs.deadline && <span>마감 {attrs.deadline}</span>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1 text-xs font-bold text-[#8CA5FF] hover:text-blue-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              항목 추가
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// Tiptap 노드 정의
// ---------------------------------------------------------------------------

export const VoteBlock = Node.create({
  name: "vote",
  group: "block",
  // 안에 글을 쓰는 노드가 아니라 통째로 하나의 덩어리다.
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      voteId: { default: "" },
      title: { default: "새 투표" },
      deadline: { default: "" },
      options: {
        default: [] as VoteOption[],
        // 배열은 그대로 HTML 속성에 못 넣으므로 JSON 문자열로 바꿔서 저장한다.
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute("data-options") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-options": JSON.stringify(attributes.options ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="vote"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "vote" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VoteBlockView);
  },
});
