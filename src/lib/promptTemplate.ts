// {{key}} 형태의 변수를 치환해 자소서 프롬프트를 완성한다.
// app/profile/page.tsx 의 generateReport 와 app/admin/prompt 화면(테스트 실행)에서 공용으로 사용.
export type PromptVars = {
  nickname: string;
  role: string;
  project_name: string;
  period: string;
  done_todos: string;
  documents: string;
  contribution: string;
};

export function renderPromptTemplate(template: string, vars: PromptVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = (vars as Record<string, string>)[key];
    return value !== undefined ? value : match;
  });
}

export const PROMPT_VARIABLE_KEYS: (keyof PromptVars)[] = [
  "nickname",
  "role",
  "project_name",
  "period",
  "done_todos",
  "documents",
  "contribution",
];
