"use client";

import React, { useEffect, useMemo } from "react";
import type * as Y from "yjs";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Collaboration from "@tiptap/extension-collaboration";
import { Bold, Italic, Underline as UnderlineIcon, List } from "lucide-react";

import { VoteBlock } from "../shareSheet/VoteBlock";
import { CalendarBlock } from "../shareSheet/CalendarBlock";
import type { SlideObject } from "./slideData";

/**
 * 슬라이드 위의 텍스트 상자.
 *
 * 상자 하나마다 Yjs 안에 자기만의 편집 영역(fragment)을 갖는다.
 * 그래서 두 사람이 서로 다른 상자를 동시에 고쳐도 부딪히지 않는다.
 *
 * 시트지에서 쓰던 블록을 그대로 넣었기 때문에,
 * 이 상자 안에서 표·달력·투표가 전부 그대로 동작한다.
 */

interface TextBoxViewProps {
  ydoc: Y.Doc;
  object: SlideObject;
  /** 편집 중이면 글자를 칠 수 있고, 아니면 상자를 끌어 옮길 수 있다. */
  isEditing: boolean;
  locked: boolean;
  /** 슬라이드 화면 배율. 글자 크기를 같이 줄이고 키우는 데 쓴다. */
  scale: number;
}

const TEXT_COLORS = ["#111827", "#FF4D4D", "#8CA5FF", "#22C55E", "#7C3AED"];

/** 버튼을 눌러도 글 선택이 풀리지 않게 막는다. */
const keepSelection = (e: React.MouseEvent) => e.preventDefault();

export default function TextBoxView({
  ydoc,
  object,
  isEditing,
  locked,
  scale,
}: TextBoxViewProps) {
  // 상자마다 따로 쓰는 편집 영역. 상자 번호를 이름으로 쓴다.
  const fragment = useMemo(
    () => ydoc.getXmlFragment(`textbox:${object.id}`),
    [ydoc, object.id]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // 동시 편집에서는 Yjs 가 되돌리기를 맡으므로 기본 되돌리기를 끈다.
      StarterKit.configure({ undoRedo: false }),
      TextStyleKit.configure({
        lineHeight: { types: ["paragraph", "heading"] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TableKit.configure({ table: { resizable: true } }),
      VoteBlock,
      CalendarBlock,
      Collaboration.configure({ fragment }),
    ],
    editorProps: { attributes: { class: "slide-prose" } },
  });

  useEffect(() => {
    editor?.setEditable(isEditing && !locked);
  }, [editor, isEditing, locked]);

  // 편집 모드로 들어가면 바로 글을 칠 수 있게 커서를 놓는다.
  useEffect(() => {
    if (editor && isEditing && !locked) editor.commands.focus();
  }, [editor, isEditing, locked]);

  const toggleClass = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${
      active ? "bg-[#8CA5FF] text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <>
      <style>{`
        .slide-prose { outline: none; color: #1f2937; line-height: 1.5; }
        .slide-prose h1 { font-size: 1.9em; font-weight: 800; margin: .2em 0; }
        .slide-prose h2 { font-size: 1.5em; font-weight: 700; margin: .2em 0; }
        .slide-prose p { margin: .15em 0; min-height: 1.3em; }
        .slide-prose ul { list-style: disc; padding-left: 1.3em; margin: .2em 0; }
        .slide-prose ol { list-style: decimal; padding-left: 1.3em; margin: .2em 0; }
        .slide-prose img { max-width: 100%; height: auto; border-radius: .3em; }
        .slide-prose table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: .3em 0; }
        .slide-prose td, .slide-prose th { border: 1px solid #C7D4FF; padding: .25em .4em; }
        .slide-prose th { background: #EEF2FF; font-weight: 700; }
        .slide-prose .selectedCell:after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: rgba(140,165,255,.22);
        }
      `}</style>

      <div
        className={`w-full h-full overflow-hidden rounded-md px-2 py-1 ${
          isEditing ? "ring-2 ring-[#8CA5FF] bg-white" : ""
        }`}
        style={{
          // 슬라이드를 축소해서 보여줄 때 글자도 같이 줄어야 한다.
          fontSize: `${Math.max(scale * 20, 8)}px`,
          // 편집 중이 아닐 때는 상자를 끌 수 있도록 클릭을 통과시킨다.
          pointerEvents: isEditing ? "auto" : "none",
        }}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <span className="text-gray-300">…</span>
        )}
      </div>

      {editor && isEditing && !locked && (
        <BubbleMenu
          editor={editor}
          appendTo={() => document.body}
          className="z-50"
          options={{ strategy: "fixed", placement: "top" }}
          shouldShow={({ editor: e, from, to }) => e.isEditable && from !== to}
        >
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-lg px-2 py-1.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={keepSelection}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title="글자색"
              />
            ))}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={toggleClass(editor.isActive("bold"))}
              title="굵게"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={toggleClass(editor.isActive("italic"))}
              title="기울임"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={toggleClass(editor.isActive("underline"))}
              title="밑줄"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={toggleClass(editor.isActive("bulletList"))}
              title="글머리 기호"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </BubbleMenu>
      )}
    </>
  );
}
