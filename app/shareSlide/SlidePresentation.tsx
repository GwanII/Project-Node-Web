"use client";

import React, { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import { ChevronLeft, ChevronRight, X, Radio, Eye } from "lucide-react";

import { ShapeView } from "./SlideCanvas";
import TextBoxView from "./TextBoxView";
import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  readObjects,
  objectsOf,
  type Slide,
} from "./slideData";

/**
 * 발표 모드.
 *
 * 화면 전체를 덮고 슬라이드 한 장만 크게 보여준다. 여기서는 고칠 수 없다.
 *
 * "발표자 따라가기" 는 접속자 정보를 나르는 통로(awareness)를 그대로 쓴다.
 * 발표자가 "지금 몇 번째 장" 을 계속 알리고, 보는 사람은 그 값을 따라간다.
 */

interface SlidePresentationProps {
  ydoc: Y.Doc;
  slides: Slide[];
  /** 처음 보여줄 장 번호 */
  startIndex: number;
  /** 내가 발표자인지. 발표자면 내 장 번호를 남들에게 알린다. */
  isPresenter: boolean;
  /** 남이 발표 중이면 그 사람의 장 번호. 없으면 null. */
  presenterIndex: number | null;
  onIndexChange: (index: number) => void;
  onExit: () => void;
}

export default function SlidePresentation({
  ydoc,
  slides,
  startIndex,
  isPresenter,
  presenterIndex,
  onIndexChange,
  onExit,
}: SlidePresentationProps) {
  /** 내가 직접 넘긴 장 번호 */
  const [ownIndex, setOwnIndex] = useState(startIndex);
  /** 발표자를 따라갈지. 내가 발표자면 해당 없음. */
  const [isFollowing, setIsFollowing] = useState(true);

  const total = slides.length;

  /*
   * 실제로 보여줄 장.
   * 따라가는 중이면 발표자 번호를 그대로 쓴다.
   * 상태를 맞추는 대신 매번 계산해야 발표자 화면과 어긋나지 않는다.
   */
  const isFollowingNow =
    !isPresenter && isFollowing && presenterIndex !== null;
  const index = isFollowingNow ? (presenterIndex as number) : ownIndex;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), Math.max(total - 1, 0));
      setOwnIndex(clamped);
      onIndexChange(clamped);
      // 직접 넘기면 따라가기는 자동으로 끈다.
      if (!isPresenter) setIsFollowing(false);
    },
    [total, onIndexChange, isPresenter]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, onExit]);

  // 발표 중에 다른 사람이 슬라이드를 고치면 화면도 같이 갱신되어야 한다.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const map = objectsOf(ydoc);
    const bump = () => setVersion((v) => v + 1);
    map.observe(bump);
    return () => map.unobserve(bump);
  }, [ydoc]);

  const slide = slides[index];
  const objects = slide ? readObjects(ydoc, slide.id) : [];
  void version;

  // 화면에 맞춰 슬라이드 크기를 정한다. 16:9 비율은 유지한다.
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const measure = () => {
      const availW = window.innerWidth - 80;
      const availH = window.innerHeight - 120;
      const scaleBy = Math.min(availW / SLIDE_WIDTH, availH / SLIDE_HEIGHT);
      setSize({ w: SLIDE_WIDTH * scaleBy, h: SLIDE_HEIGHT * scaleBy });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const scale = size.w / SLIDE_WIDTH;
  const px = (v: number) => v * scale;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center select-none">
      {/* 위쪽 안내 */}
      <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
        {isPresenter ? (
          <span className="flex items-center gap-1.5 bg-[#FF4D4D] text-white text-xs font-bold px-3 py-1.5 rounded-full">
            <Radio className="w-3.5 h-3.5" />
            발표 중 — 보는 사람 화면도 같이 넘어갑니다
          </span>
        ) : presenterIndex !== null ? (
          <button
            type="button"
            onClick={() => setIsFollowing((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              isFollowingNow
                ? "bg-green-500 text-white"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title="발표자가 넘길 때 내 화면도 같이 넘길지"
          >
            <Eye className="w-3.5 h-3.5" />
            {isFollowingNow ? "발표자 따라가는 중" : "따라가기 꺼짐"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onExit}
          className="ml-auto flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          title="발표 끝내기 (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          나가기
        </button>
      </div>

      {/* 슬라이드 */}
      <div
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{ width: size.w, height: size.h }}
      >
        {objects.map((object) => (
          <div
            key={object.id}
            className="absolute"
            style={{
              left: px(object.x),
              top: px(object.y),
              width: px(object.w),
              height: px(object.h),
            }}
          >
            {object.type === "text" ? (
              <TextBoxView
                ydoc={ydoc}
                object={object}
                isEditing={false}
                locked
                scale={scale}
              />
            ) : (
              <ShapeView object={object} />
            )}
          </div>
        ))}
      </div>

      {/* 아래쪽 조작 */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-30 transition-colors"
          title="이전 (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white text-sm font-bold tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= total - 1}
          className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-30 transition-colors"
          title="다음 (→, Space)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
