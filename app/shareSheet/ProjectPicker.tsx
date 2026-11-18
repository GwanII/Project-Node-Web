"use client";

import React, { useEffect, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";

import { listProjects, type ProjectBrief } from "./data";

/**
 * 프로젝트를 안 고르고 들어왔을 때 보여 주는 화면.
 *
 * 공유 시트지와 슬라이드는 이제 프로젝트마다 따로다. 그래서 주소에
 * `?project=<id>` 가 없으면 어느 프로젝트의 문서를 열어야 할지 알 수 없다.
 *
 * 프로젝트 화면에서 링크를 타고 오는 게 본래 흐름이지만, 아직 그 링크가
 * 없어서 여기서 직접 고를 수 있게 해 둔다. 그래야 주소를 외우지 않아도
 * 들어올 수 있다.
 */

interface ProjectPickerProps {
  /** "시트지" / "슬라이드" 처럼 안내 문구에 들어갈 말 */
  what: string;
  /** 고른 프로젝트로 이동할 주소를 만든다. */
  hrefFor: (projectId: string) => string;
}

export default function ProjectPicker({ what, hrefFor }: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectBrief[] | null>(null);

  useEffect(() => {
    let alive = true;
    listProjects().then((found) => {
      if (alive) setProjects(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-bold text-gray-800">어느 프로젝트의 {what}를 여시겠어요?</h1>
        <p className="mt-1 text-xs text-gray-500">
          {what}는 프로젝트마다 따로입니다. 프로젝트를 고르면 그 팀의 {what}가 열립니다.
        </p>

        <div className="mt-4 space-y-1.5">
          {projects === null ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              프로젝트를 불러오는 중…
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              참여 중인 프로젝트가 없습니다.
              <br />
              <a href="/mainpage" className="text-[#4457B4] font-semibold hover:underline">
                프로젝트 목록으로 가기
              </a>
            </p>
          ) : (
            projects.map((project) => (
              <a
                key={project.id}
                href={hrefFor(project.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#8CA5FF] hover:bg-[#F7F9FF] transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-[#8CA5FF] shrink-0" />
                <span className="text-sm font-semibold text-gray-700 truncate">
                  {project.name}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
