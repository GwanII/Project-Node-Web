"use client";

import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { VoteBlock, createEmptyVote } from "./VoteBlock";
import { CalendarBlock, createEmptyCalendar } from "./CalendarBlock";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ChevronDown,
  Check,
  AlignJustify,
  Rows3,
  Columns3,
  TableCellsMerge,
  TableCellsSplit,
  Heading,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";

import type { EditorMode } from "./Toolbar";

export interface EditorHandle {
  /** 툴바의 "추가 → 파일" 에서 호출한다. 파일 선택 창을 연다. */
  insertImage: () => void;
  /** 툴바의 "추가 → 표" 에서 호출한다. */
  insertTable: () => void;
  /** 툴바의 "추가 → 투표" 에서 호출한다. */
  insertVote: () => void;
  /** 툴바의 "추가 → 달력" 에서 호출한다. */
  insertCalendar: () => void;
}

interface EditorProps {
  isLocked: boolean;
  mode: EditorMode;
  /** 저장돼 있던 내용. 불러오기가 끝난 뒤에만 이 컴포넌트가 그려진다. */
  initialContent: string;
  /** 글이 바뀔 때마다 부모에게 알린다. 실제 저장은 부모가 모아서 한다. */
  onChange: (html: string) => void;
  /** 본문 스크롤 영역. 서식 툴바가 이 안을 벗어나지 않게 하는 데 쓴다. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  ref?: React.Ref<EditorHandle>;
}

const TEXT_COLORS = [
  { label: "검정", value: "#111827" },
  { label: "빨강", value: "#FF4D4D" },
  { label: "파랑", value: "#8CA5FF" },
  { label: "초록", value: "#22C55E" },
  { label: "보라", value: "#7C3AED" },
  { label: "회색", value: "#9CA3AF" },
];

const FONT_FAMILIES = [
  { label: "기본", value: "" },
  { label: "고딕", value: "'Malgun Gothic', sans-serif" },
  { label: "명조", value: "'Batang', serif" },
  { label: "고정폭", value: "monospace" },
];

const FONT_SIZES = ["12", "14", "16", "20", "24", "32", "48", "64"];

const LINE_HEIGHTS = [
  { label: "기본", value: "" },
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
];

/** 버튼을 눌러도 본문 선택이 풀리지 않게 막는다. */
const keepSelection = (e: React.MouseEvent) => e.preventDefault();

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function ColorPicker({ editor }: { editor: TiptapEditor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // v3 에서는 이렇게 구독해야 커서를 옮길 때마다 현재 색이 갱신된다.
  const currentColor = useEditorState({
    editor,
    selector: ({ editor: e }) => (e.getAttributes("textStyle").color as string) ?? "#111827",
  });

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setRecent((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, 8));
  };

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = hexInput.trim().startsWith("#") ? hexInput.trim() : `#${hexInput.trim()}`;
    if (!HEX_PATTERN.test(value)) return;
    applyColor(value);
    setHexInput("");
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* 자주 쓰는 색 */}
      {TEXT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onMouseDown={keepSelection}
          onClick={() => applyColor(color.value)}
          className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform relative"
          style={{ backgroundColor: color.value }}
          title={color.label}
        >
          {currentColor.toLowerCase() === color.value.toLowerCase() && (
            <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow" />
          )}
        </button>
      ))}

      {/* 자세히 고르기 */}
      <button
        type="button"
        onMouseDown={keepSelection}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center rounded-md px-0.5 py-1 transition-colors ${
          isOpen ? "bg-gray-100" : "hover:bg-gray-100"
        }`}
        title="색상 자세히 고르기"
      >
        <span
          className="w-5 h-5 rounded-full border border-gray-300 block"
          style={{
            background:
              "conic-gradient(#FF4D4D,#FACC15,#22C55E,#06B6D4,#8CA5FF,#A855F7,#FF4D4D)",
          }}
        />
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-3 z-50"
        >
          {/* 색상환 */}
          <div>
            <div className="text-[11px] font-bold text-gray-500 mb-1.5">색상 직접 고르기</div>
            <div className="flex items-center gap-2">
              <label
                className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer relative overflow-hidden shrink-0"
                style={{ backgroundColor: currentColor }}
                title="색상환 열기"
              >
                <input
                  type="color"
                  value={HEX_PATTERN.test(currentColor) ? currentColor : "#111827"}
                  onChange={(e) => applyColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <span className="text-xs font-mono text-gray-600">{currentColor}</span>
            </div>
          </div>

          {/* HEX 직접 입력 */}
          <div>
            <div className="text-[11px] font-bold text-gray-500 mb-1.5">
              HEX 코드 (피그마에서 복사한 값)
            </div>
            <form onSubmit={handleHexSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                placeholder="#8CA5FF"
                maxLength={7}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-[#8CA5FF] hover:bg-blue-600 text-white text-xs font-bold transition-colors"
              >
                적용
              </button>
            </form>
          </div>

          {/* 최근 쓴 색 */}
          {recent.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-500 mb-1.5">최근 쓴 색</div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={keepSelection}
                    onClick={() => applyColor(color)}
                    className="w-6 h-6 rounded-md border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="w-full text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg py-1.5 transition-colors"
          >
            색상 지우기
          </button>
        </div>
      )}
    </div>
  );
}

export default function Editor({
  isLocked,
  mode,
  initialContent,
  onChange,
  scrollRef,
  ref,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 서식 툴바를 본문 영역 안에 가둘 기준 요소.
   * 첫 렌더에는 ref 가 아직 안 붙어 있어서 state 로 한 박자 늦게 잡는다.
   */
  const [boundary, setBoundary] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setBoundary(scrollRef.current);
  }, [scrollRef]);

  // onUpdate 안에서 옛날 onChange 를 붙잡고 있지 않도록 ref 로 최신 값을 본다.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // 서버에서 미리 그리면 하이드레이션이 어긋나므로 클라이언트에서만 그린다.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      // TextStyleKit 하나로 글자색 / 배경색 / 글씨체 / 크기 / 줄간격이 모두 들어온다.
      TextStyleKit.configure({
        // 줄간격만 기본값(글자 단위)에서 문단 단위로 바꾼다.
        // 기본값이면 드래그한 글자에만 <span style="line-height"> 이 붙어서
        // 한 줄 안에서 간격이 들쭉날쭉해지고 빈 줄에는 적용되지 않는다.
        lineHeight: { types: ["paragraph", "heading"] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      // 표. resizable 이면 열 경계를 끌어서 너비를 조절할 수 있다.
      TableKit.configure({ table: { resizable: true } }),
      VoteBlock,
      CalendarBlock,
    ],
    content: initialContent,
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getHTML()),
    editorProps: {
      attributes: {
        class: "sheet-prose",
      },
    },
  });

  // 잠금 상태이거나 드로잉 모드일 때는 편집을 막는다.
  const isEditable = !isLocked && mode === "typing";

  useEffect(() => {
    editor?.setEditable(isEditable);
  }, [editor, isEditable]);

  useImperativeHandle(ref, () => ({
    insertImage: () => fileInputRef.current?.click(),
    insertTable: () =>
      editor
        ?.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    insertVote: () =>
      editor
        ?.chain()
        .focus()
        .insertContent({ type: "vote", attrs: createEmptyVote() })
        .run(),
    insertCalendar: () =>
      editor
        ?.chain()
        .focus()
        .insertContent({ type: "calendarBlock", attrs: createEmptyCalendar() })
        .run(),
  }));

  /**
   * 툴바가 커서 위치를 따라가게 하려면 v3 에서는 이렇게 구독해야 한다.
   * 이게 없으면 다음 입력이 있을 때까지 툴바가 이전 상태를 보여준다
   * (제목을 골랐는데 직전 문단의 줄간격이 뜨는 식).
   */
  const toolbar = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isUnderline: e?.isActive("underline") ?? false,
      isBulletList: e?.isActive("bulletList") ?? false,
      isOrderedList: e?.isActive("orderedList") ?? false,
      isInTable: e?.isActive("table") ?? false,
      // 커서가 제목 안에 있으면 제목 값을, 아니면 문단 값을 읽는다.
      lineHeight:
        ((e?.isActive("heading")
          ? e.getAttributes("heading").lineHeight
          : e?.getAttributes("paragraph").lineHeight) as string) ?? "",
    }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 값을 비워둬야 같은 파일을 연속으로 골라도 change 가 다시 발생한다.
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
  };

  if (!editor) {
    return <div className="flex-1 p-10 text-sm text-gray-400">에디터를 불러오는 중…</div>;
  }

  const tableButtonClass =
    "p-1.5 rounded-md text-gray-700 hover:bg-gray-100 transition-colors";

  const toggleButtonClass = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${
      active ? "bg-[#8CA5FF] text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  // 줄간격은 문단 속성이라 setLineHeight(글자용) 대신 문단 속성을 직접 바꾼다.
  const applyLineHeight = (value: string) => {
    const lineHeight = value === "" ? null : value;
    // 선택 범위에 문단과 제목이 섞여 있을 수 있어서 둘 다 처리한다.
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { lineHeight })
      .updateAttributes("heading", { lineHeight })
      .run();
  };

  return (
    <>
      {/* ProseMirror 기본 스타일. globals.css 는 팀 공용이라 건드리지 않고 여기서만 정의한다. */}
      <style>{`
        .sheet-prose { outline: none; min-height: 60vh; color: #1f2937; line-height: 1.7; }
        .sheet-prose h1 { font-size: 2rem; font-weight: 800; margin: 1rem 0 0.5rem; }
        .sheet-prose h2 { font-size: 1.5rem; font-weight: 700; margin: 0.9rem 0 0.4rem; }
        .sheet-prose h3 { font-size: 1.25rem; font-weight: 700; margin: 0.8rem 0 0.3rem; }
        .sheet-prose p { margin: 0.35rem 0; min-height: 1.7em; }
        .sheet-prose ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
        .sheet-prose ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
        .sheet-prose blockquote { border-left: 3px solid #8CA5FF; padding-left: 0.85rem; color: #4b5563; margin: 0.5rem 0; }
        .sheet-prose code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.9em; }
        .sheet-prose pre { background: #f3f4f6; padding: 0.75rem 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 0.5rem 0; }
        .sheet-prose pre code { background: none; padding: 0; }
        .sheet-prose img { max-width: 100%; height: auto; border-radius: 0.5rem; border: 2px solid #8CA5FF; margin: 0.5rem 0; }
        .sheet-prose hr { border-top: 1px solid #e5e7eb; margin: 1rem 0; }
        .sheet-prose a { color: #4f46e5; text-decoration: underline; }

        /* 표 */
        /* 열이 많아 폭을 넘치면 표만 가로 스크롤된다. 본문 레이아웃은 안 밀린다. */
        .sheet-prose .tableWrapper { overflow-x: auto; margin: 0.75rem 0; }
        .sheet-prose table { border-collapse: collapse; margin: 0; width: 100%; table-layout: fixed; }
        .sheet-prose td, .sheet-prose th { border: 1px solid #C7D4FF; padding: 0.5rem 0.65rem; vertical-align: top; position: relative; min-width: 3rem; }
        .sheet-prose th { background: #EEF2FF; font-weight: 700; text-align: left; }
        .sheet-prose td > *, .sheet-prose th > * { margin-bottom: 0; }
        /* 드래그로 고른 칸 */
        .sheet-prose .selectedCell:after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: rgba(140, 165, 255, 0.22);
        }
        /* 열 너비 조절 손잡이 */
        .sheet-prose .column-resize-handle {
          position: absolute; right: -2px; top: 0; bottom: -2px; width: 4px;
          background: #8CA5FF; pointer-events: none;
        }
        .sheet-prose.resize-cursor { cursor: col-resize; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/*
        서식 도구는 body 에 붙인다.
        기본값은 "에디터의 부모"인데, 그러면 스크롤 영역 안에 들어가서
        메뉴가 잘리거나 스크롤바를 건드려 화면이 흔들릴 수 있다.
      */}
      <BubbleMenu
        editor={editor}
        appendTo={() => document.body}
        className="z-50"
        options={{
          strategy: "fixed",
          placement: "top",
          // 본문 영역 밖(= 사이드바 위)으로 밀려나지 않게 가둔다.
          shift: boundary ? { boundary, padding: 8 } : true,
          // 이걸 안 주면 창(window)만 보고 있어서 본문을 스크롤할 때 툴바가 안 따라온다.
          scrollTarget: boundary ?? undefined,
        }}
        shouldShow={({ editor: e, from, to }) => e.isEditable && from !== to}
      >
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-lg px-2 py-1.5">
          <ColorPicker editor={editor} />

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 글씨체 */}
          <select
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                editor.chain().focus().setFontFamily(value).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }}
            className="text-xs border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="글씨체"
            defaultValue=""
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          {/* 글자 크기 */}
          <select
            onChange={(e) => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
            className="text-xs border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="글자 크기"
            defaultValue="16"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 굵기 / 기울임 / 밑줄 */}
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toggleButtonClass(toolbar?.isBold ?? false)}
            title="굵게"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toggleButtonClass(toolbar?.isItalic ?? false)}
            title="기울임"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={toggleButtonClass(toolbar?.isUnderline ?? false)}
            title="밑줄"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 목록 */}
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toggleButtonClass(toolbar?.isBulletList ?? false)}
            title="글머리 기호"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toggleButtonClass(toolbar?.isOrderedList ?? false)}
            title="번호 매기기"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 줄간격 — 글자가 아니라 문단 전체에 적용된다 */}
          <div className="flex items-center gap-1" title="줄간격">
            <AlignJustify className="w-4 h-4 text-gray-500 shrink-0" />
            <select
              value={toolbar?.lineHeight ?? ""}
              onChange={(e) => applyLineHeight(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {LINE_HEIGHTS.map((item) => (
                <option key={item.label} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </BubbleMenu>

      {/*
        표 안에 커서가 있을 때 뜨는 표 전용 도구.
        글자를 드래그했을 때는 위쪽 서식 툴바가 뜨므로, 겹치지 않게 커서만 있을 때로 제한한다.
      */}
      <BubbleMenu
        editor={editor}
        pluginKey="tableBubbleMenu"
        appendTo={() => document.body}
        className="z-50"
        options={{
          strategy: "fixed",
          placement: "top",
          shift: boundary ? { boundary, padding: 8 } : true,
          scrollTarget: boundary ?? undefined,
        }}
        shouldShow={({ editor: e, from, to }) =>
          e.isEditable && e.isActive("table") && from === to
        }
      >
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-lg px-2 py-1.5">
          {/* 행 */}
          <div className="flex items-center gap-0.5" title="행">
            <Rows3 className="w-4 h-4 text-gray-500 mr-0.5" />
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className={tableButtonClass}
              title="위에 행 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className={tableButtonClass}
              title="아래에 행 추가"
            >
              <Plus className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().deleteRow().run()}
              className={tableButtonClass}
              title="행 삭제"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 열 */}
          <div className="flex items-center gap-0.5" title="열">
            <Columns3 className="w-4 h-4 text-gray-500 mr-0.5" />
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className={tableButtonClass}
              title="왼쪽에 열 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className={tableButtonClass}
              title="오른쪽에 열 추가"
            >
              <Plus className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className={tableButtonClass}
              title="열 삭제"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 셀 */}
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().mergeCells().run()}
            className={tableButtonClass}
            title="셀 합치기 (여러 칸을 드래그한 뒤 누르세요)"
          >
            <TableCellsMerge className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().splitCell().run()}
            className={tableButtonClass}
            title="합친 셀 나누기"
          >
            <TableCellsSplit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className={tableButtonClass}
            title="첫 행을 머리글로"
          >
            <Heading className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="p-1.5 rounded-md text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="표 전체 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} className="max-w-4xl mx-auto px-10 py-8" />
    </>
  );
}
