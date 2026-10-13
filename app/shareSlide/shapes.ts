/**
 * 도형 목록표.
 *
 * 도형 하나가 여기 한 줄이다. 그림을 그리는 쪽(SlideCanvas)과 도형을 고르는
 * 패널(page.tsx)이 둘 다 이 표 하나만 본다. 그래서 도형을 더 넣고 싶으면
 * 아래 배열에 한 줄만 추가하면 되고, 크기 조절·회전·색·묶기는 공용 코드가
 * 이미 처리하므로 따로 손댈 게 없다.
 *
 * 좌표는 전부 가로세로 100 짜리 상자 기준이다. 실제 크기는 화면에서 늘려 준다.
 * 정다각형과 별의 좌표는 눈대중이 아니라 계산해서 넣었다.
 */

/** 도형을 그리는 방식. */
export type ShapeRender =
  /** 네모·원처럼 요소로 직접 그리는 것. SVG 보다 테두리가 선명하다. */
  | "css"
  /** 곧은 변으로만 이루어진 것 */
  | "polygon"
  /** 곡선이 섞인 것 */
  | "path"
  /** 선처럼 다루는 것. 놓을 때 기준점이 다르다. */
  | "line";

export type ShapeCategory = "basic" | "arrow" | "flow" | "star" | "callout" | "line";

export const CATEGORY_LABELS: Record<ShapeCategory, string> = {
  basic: "기본 도형",
  arrow: "블록 화살표",
  flow: "순서도",
  star: "별 및 현수막",
  callout: "설명선",
  line: "선",
};

/** 패널에 보여줄 분류 차례 */
export const CATEGORY_ORDER: ShapeCategory[] = [
  "basic",
  "arrow",
  "flow",
  "star",
  "callout",
  "line",
];

export interface ShapeDef {
  /** 저장에 쓰이는 이름. 한 번 정하면 바꾸면 안 된다 — 이미 그려 둔 도형이 깨진다. */
  name: string;
  label: string;
  category: ShapeCategory;
  render: ShapeRender;
  /** render 가 polygon 일 때 쓰는 꼭짓점 */
  points?: string;
  /** render 가 path 일 때 쓰는 경로 */
  path?: string;
  /**
   * 덧그리는 선. 채우기 없이 테두리만 그린다.
   * 원통의 윗면이나 정육면체의 모서리처럼, 실루엣만으로는 모양이 안 보일 때 쓴다.
   */
  detail?: string;
}

export const SHAPES: ShapeDef[] = [
  // --- 기본 도형 ----------------------------------------------------------
  { name: "rect", label: "직사각형", category: "basic", render: "css" },
  { name: "roundRect", label: "둥근 직사각형", category: "basic", render: "css" },
  { name: "ellipse", label: "타원", category: "basic", render: "css" },
  { name: "triangle", label: "삼각형", category: "basic", render: "polygon",
    points: "50,3 97,97 3,97" },
  { name: "rightTriangle", label: "직각삼각형", category: "basic", render: "polygon",
    points: "3,3 3,97 97,97" },
  { name: "trapezoid", label: "사다리꼴", category: "basic", render: "polygon",
    points: "25,5 75,5 97,95 3,95" },
  { name: "parallelogram", label: "평행사변형", category: "basic", render: "polygon",
    points: "25,5 97,5 75,95 3,95" },
  { name: "diamond", label: "마름모", category: "basic", render: "polygon",
    points: "50,3 97,50 50,97 3,50" },
  { name: "pentagon", label: "오각형", category: "basic", render: "polygon",
    points: "50,2 95.7,35.2 78.2,88.8 21.8,88.8 4.3,35.2" },
  { name: "hexagon", label: "육각형", category: "basic", render: "polygon",
    points: "50,2 91.6,26 91.6,74 50,98 8.4,74 8.4,26" },
  { name: "heptagon", label: "칠각형", category: "basic", render: "polygon",
    points: "50,2 87.5,20.1 96.8,60.7 70.8,93.2 29.2,93.2 3.2,60.7 12.5,20.1" },
  { name: "octagon", label: "팔각형", category: "basic", render: "polygon",
    points: "50,2 83.9,16.1 98,50 83.9,83.9 50,98 16.1,83.9 2,50 16.1,16.1" },
  { name: "decagon", label: "십각형", category: "basic", render: "polygon",
    points: "50,2 78.2,11.2 95.7,35.2 95.7,64.8 78.2,88.8 50,98 21.8,88.8 4.3,64.8 4.3,35.2 21.8,11.2" },
  { name: "cross", label: "십자가", category: "basic", render: "polygon",
    points: "35,3 65,3 65,35 97,35 97,65 65,65 65,97 35,97 35,65 3,65 3,35 35,35" },
  { name: "plaque", label: "액자", category: "basic", render: "path",
    path: "M20,4 H80 A20,20 0 0 0 96,20 V80 A20,20 0 0 0 80,96 H20 A20,20 0 0 0 4,80 V20 A20,20 0 0 0 20,4 Z" },
  { name: "heart", label: "하트", category: "basic", render: "path",
    path: "M50,92 C18,68 4,50 4,33 C4,18 15,7 29,7 C39,7 47,13 50,21 C53,13 61,7 71,7 C85,7 96,18 96,33 C96,50 82,68 50,92 Z" },
  { name: "lightning", label: "번개", category: "basic", render: "polygon",
    points: "56,2 20,54 44,54 32,98 80,40 54,40 72,2" },
  { name: "sun", label: "해", category: "basic", render: "polygon",
    points: "50,2 57.8,21 74,8.4 71.2,28.8 91.6,26 79,42.2 98,50 79,57.8 91.6,74 71.2,71.2 74,91.6 57.8,79 50,98 42.2,79 26,91.6 28.8,71.2 8.4,74 21,57.8 2,50 21,42.2 8.4,26 28.8,28.8 26,8.4 42.2,21" },
  { name: "moon", label: "달", category: "basic", render: "path",
    path: "M66,3 A48,48 0 1 0 66,97 A40,47 0 1 1 66,3 Z" },
  { name: "cloud", label: "구름", category: "basic", render: "path",
    path: "M26,84 A20,20 0 0 1 24,44 A24,24 0 0 1 68,30 A18,18 0 0 1 86,56 A16,16 0 0 1 76,84 Z" },
  { name: "cylinder", label: "원통", category: "basic", render: "path",
    path: "M6,18 C6,10 26,4 50,4 C74,4 94,10 94,18 V82 C94,90 74,96 50,96 C26,96 6,90 6,82 Z",
    detail: "M6,18 C6,26 26,32 50,32 C74,32 94,26 94,18" },
  { name: "cube", label: "정육면체", category: "basic", render: "path",
    path: "M4,28 L28,4 L96,4 L96,72 L72,96 L4,96 Z",
    detail: "M4,28 L72,28 L96,4 M72,28 L72,96" },
  { name: "pie", label: "파이", category: "basic", render: "path",
    path: "M50,50 L50,2 A48,48 0 1 1 2,50 Z" },
  { name: "teardrop", label: "눈물방울", category: "basic", render: "path",
    path: "M50,4 A46,46 0 1 1 4,50 L4,4 Z" },

  // --- 블록 화살표 --------------------------------------------------------
  { name: "arrowRight", label: "오른쪽 화살표", category: "arrow", render: "polygon",
    points: "3,33 62,33 62,8 97,50 62,92 62,67 3,67" },
  { name: "arrowLeft", label: "왼쪽 화살표", category: "arrow", render: "polygon",
    points: "97,33 38,33 38,8 3,50 38,92 38,67 97,67" },
  { name: "arrowUp", label: "위쪽 화살표", category: "arrow", render: "polygon",
    points: "33,97 33,38 8,38 50,3 92,38 67,38 67,97" },
  { name: "arrowDown", label: "아래쪽 화살표", category: "arrow", render: "polygon",
    points: "33,3 33,62 8,62 50,97 92,62 67,62 67,3" },
  { name: "arrowLeftRight", label: "양방향 화살표", category: "arrow", render: "polygon",
    points: "3,50 28,22 28,38 72,38 72,22 97,50 72,78 72,62 28,62 28,78" },
  { name: "arrowUpDown", label: "위아래 화살표", category: "arrow", render: "polygon",
    points: "50,3 78,28 62,28 62,72 78,72 50,97 22,72 38,72 38,28 22,28" },
  { name: "arrowQuad", label: "십자 화살표", category: "arrow", render: "polygon",
    points: "50,2 70,22 58,22 58,42 78,42 78,30 98,50 78,70 78,58 58,58 58,78 70,78 50,98 30,78 42,78 42,58 22,58 22,70 2,50 22,30 22,42 42,42 42,22 30,22" },
  { name: "chevron", label: "갈매기형", category: "arrow", render: "polygon",
    points: "3,5 68,5 97,50 68,95 3,95 32,50" },
  { name: "arrowPentagon", label: "오각형 화살표", category: "arrow", render: "polygon",
    points: "3,5 68,5 97,50 68,95 3,95" },
  { name: "arrowBent", label: "굽은 화살표", category: "arrow", render: "polygon",
    points: "3,97 3,38 60,38 60,13 97,48 60,83 60,62 28,62 28,97" },

  // --- 순서도 -------------------------------------------------------------
  { name: "flowProcess", label: "처리", category: "flow", render: "polygon",
    points: "3,18 97,18 97,82 3,82" },
  { name: "flowDecision", label: "판단", category: "flow", render: "polygon",
    points: "50,5 97,50 50,95 3,50" },
  { name: "flowData", label: "데이터", category: "flow", render: "polygon",
    points: "22,18 97,18 78,82 3,82" },
  { name: "flowTerminator", label: "단말", category: "flow", render: "path",
    path: "M22,18 H78 A32,32 0 0 1 78,82 H22 A32,32 0 0 1 22,18 Z" },
  { name: "flowDocument", label: "문서", category: "flow", render: "path",
    path: "M3,15 H97 V77 C84,86 66,68 50,77 C34,86 16,68 3,77 Z" },
  { name: "flowPreparation", label: "준비", category: "flow", render: "polygon",
    points: "22,15 78,15 97,50 78,85 22,85 3,50" },
  { name: "flowManualInput", label: "수동 입력", category: "flow", render: "polygon",
    points: "3,30 97,12 97,85 3,85" },
  { name: "flowManualOp", label: "수동 작업", category: "flow", render: "polygon",
    points: "3,15 97,15 80,85 20,85" },
  { name: "flowStoredData", label: "저장 데이터", category: "flow", render: "path",
    path: "M12,15 H90 C100,33 100,67 90,85 H12 C22,67 22,33 12,15 Z" },
  { name: "flowDelay", label: "지연", category: "flow", render: "path",
    path: "M3,15 H62 A35,35 0 0 1 62,85 H3 Z" },

  // --- 별 및 현수막 -------------------------------------------------------
  { name: "star4", label: "4각 별", category: "star", render: "polygon",
    points: "50,2 64.3,35.7 98,50 64.3,64.3 50,98 35.7,64.3 2,50 35.7,35.7" },
  { name: "star", label: "5각 별", category: "star", render: "polygon",
    points: "50,2 61.8,33.7 95.7,35.2 69.2,56.2 78.2,88.8 50,70.2 21.8,88.8 30.8,56.2 4.3,35.2 38.2,33.7" },
  { name: "star6", label: "6각 별", category: "star", render: "polygon",
    points: "50,2 60.1,32.5 91.6,26 70.2,50 91.6,74 60.1,67.5 50,98 39.9,67.5 8.4,74 29.8,50 8.4,26 39.9,32.5" },
  { name: "star8", label: "8각 별", category: "star", render: "polygon",
    points: "50,2 61.4,22.5 83.9,16.1 77.5,38.6 98,50 77.5,61.4 83.9,83.9 61.4,77.5 50,98 38.6,77.5 16.1,83.9 22.5,61.4 2,50 22.5,38.6 16.1,16.1 38.6,22.5" },
  { name: "star16", label: "16각 별", category: "star", render: "polygon",
    points: "50,2 57.3,13.3 68.4,5.7 70.8,18.9 83.9,16.1 81.1,29.2 94.3,31.6 86.7,42.7 98,50 86.7,57.3 94.3,68.4 81.1,70.8 83.9,83.9 70.8,81.1 68.4,94.3 57.3,86.7 50,98 42.7,86.7 31.6,94.3 29.2,81.1 16.1,83.9 18.9,70.8 5.7,68.4 13.3,57.3 2,50 13.3,42.7 5.7,31.6 18.9,29.2 16.1,16.1 29.2,18.9 31.6,5.7 42.7,13.3" },
  { name: "star24", label: "24각 별", category: "star", render: "polygon",
    points: "50,2 54.9,12.9 62.4,3.6 64.3,15.4 74,8.4 72.8,20.3 83.9,16.1 79.7,27.2 91.6,26 84.6,35.7 96.4,37.6 87.1,45.1 98,50 87.1,54.9 96.4,62.4 84.6,64.3 91.6,74 79.7,72.8 83.9,83.9 72.8,79.7 74,91.6 64.3,84.6 62.4,96.4 54.9,87.1 50,98 45.1,87.1 37.6,96.4 35.7,84.6 26,91.6 27.2,79.7 16.1,83.9 20.3,72.8 8.4,74 15.4,64.3 3.6,62.4 12.9,54.9 2,50 12.9,45.1 3.6,37.6 15.4,35.7 8.4,26 20.3,27.2 16.1,16.1 27.2,20.3 26,8.4 35.7,15.4 37.6,3.6 45.1,12.9" },
  { name: "explosion", label: "폭발", category: "star", render: "polygon",
    points: "50,2 60,24 78,10 74,33 96,30 82,48 98,62 76,64 84,86 62,76 58,98 44,80 28,94 28,70 6,76 16,56 2,46 20,36 10,16 34,20 38,2" },
  { name: "banner", label: "배너", category: "star", render: "polygon",
    points: "3,22 97,22 84,50 97,78 3,78 16,50" },

  // --- 설명선 -------------------------------------------------------------
  { name: "speech", label: "사각 말풍선", category: "callout", render: "path",
    path: "M4,6 H96 V74 H40 L24,96 V74 H4 Z" },
  { name: "speechRound", label: "둥근 말풍선", category: "callout", render: "path",
    path: "M18,6 H82 A14,14 0 0 1 96,20 V60 A14,14 0 0 1 82,74 H40 L24,96 V74 H18 A14,14 0 0 1 4,60 V20 A14,14 0 0 1 18,6 Z" },
  { name: "speechEllipse", label: "타원 말풍선", category: "callout", render: "path",
    path: "M50,6 C75,6 96,20 96,40 C96,60 75,74 50,74 C44,74 38,73 33,72 L18,96 L22,69 C11,62 4,52 4,40 C4,20 25,6 50,6 Z" },
  { name: "speechCloud", label: "구름 말풍선", category: "callout", render: "path",
    path: "M30,70 A18,18 0 0 1 28,34 A22,22 0 0 1 68,22 A16,16 0 0 1 84,46 A14,14 0 0 1 74,70 Z M26,78 A7,7 0 1 1 26,79 Z M14,94 A5,5 0 1 1 14,95 Z" },
  { name: "calloutLine", label: "선 설명선", category: "callout", render: "path",
    path: "M4,6 H96 V62 H4 Z",
    detail: "M30,62 L14,96" },

  // --- 선 -----------------------------------------------------------------
  { name: "line", label: "선", category: "line", render: "line" },
  { name: "arrow", label: "화살표", category: "line", render: "line" },
];

/** 이름으로 빨리 찾기 위한 색인 */
export const SHAPE_BY_NAME: Record<string, ShapeDef> = Object.fromEntries(
  SHAPES.map((s) => [s.name, s])
);

/** 분류별로 묶은 목록. 고르는 패널이 이대로 그린다. */
export const SHAPES_BY_CATEGORY = CATEGORY_ORDER.map((category) => ({
  category,
  label: CATEGORY_LABELS[category],
  shapes: SHAPES.filter((s) => s.category === category),
}));
