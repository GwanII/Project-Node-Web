"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";

import type { TableData } from "./slideData";

/**
 * 슬라이드 위의 표.
 *
 * 칸마다 글자만 넣는 단순한 표다. 편집기(Tiptap)의 표와 달리
 * 물체 상자 크기에 맞춰 자유롭게 늘어나고 회전도 된다.
 */

interface TableViewProps {
  data: TableData;
  onChange: (next: TableData) => void;
  canEdit: boolean;
  /** 선택된 상태에서만 행·열 추가 버튼을 보여준다. */
  showControls: boolean;
  /** 슬라이드 화면 배율. 글자 크기를 같이 줄이고 키운다. */
  scale: number;
}

export default function TableView({
  data,
  onChange,
  canEdit,
  showControls,
  scale,
}: TableViewProps) {
  const cells = data?.cells ?? [];
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  const setCell = (r: number, c: number, value: string) => {
    const next = cells.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? value : cell))
    );
    onChange({ cells: next });
  };

  const addRow = () => onChange({ cells: [...cells, Array(cols).fill("")] });
  const removeRow = () => {
    if (rows <= 1) return;
    onChange({ cells: cells.slice(0, -1) });
  };
  const addCol = () => onChange({ cells: cells.map((row) => [...row, ""]) });
  const removeCol = () => {
    if (cols <= 1) return;
    onChange({ cells: cells.map((row) => row.slice(0, -1)) });
  };

  const buttonClass =
    "p-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 shadow-sm transition-colors";

  return (
    <div className="w-full h-full relative">
      <table
        className="w-full h-full border-collapse table-fixed bg-white"
        style={{ fontSize: `${Math.max(scale * 16, 7)}px` }}
      >
        <tbody>
          {cells.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="border border-[#C7D4FF] p-0 align-top"
                  style={{ background: r === 0 ? "#EEF2FF" : undefined }}
                >
                  <input
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    readOnly={!canEdit}
                    // 상자를 끌 때 칸이 먼저 반응하지 않게 한다.
                    onPointerDown={(e) => {
                      if (canEdit) e.stopPropagation();
                    }}
                    className={`w-full bg-transparent px-1.5 py-1 focus:outline-none focus:bg-blue-50 ${
                      r === 0 ? "font-bold text-gray-800" : "text-gray-700"
                    }`}
                    style={{ fontSize: "inherit" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {showControls && canEdit && (
        <>
          {/* 열 추가·삭제 */}
          <div
            className="absolute top-0 -right-8 flex flex-col gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={addCol} className={buttonClass} title="열 추가">
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={removeCol}
              disabled={cols <= 1}
              className={`${buttonClass} disabled:opacity-30`}
              title="열 삭제"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>

          {/* 행 추가·삭제 */}
          <div
            className="absolute -bottom-8 left-0 flex gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={addRow} className={buttonClass} title="행 추가">
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={removeRow}
              disabled={rows <= 1}
              className={`${buttonClass} disabled:opacity-30`}
              title="행 삭제"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
