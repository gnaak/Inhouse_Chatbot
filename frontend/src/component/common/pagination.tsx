import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationSize = "sm" | "md";

/**
 * Pagination 컴포넌트 Props
 *
 * @property page          현재 페이지 번호 (1-based)
 * @property total         전체 아이템 개수
 * @property pageSize      페이지당 아이템 개수 (기본 10)
 * @property onChange      페이지 변경 시 호출되는 콜백
 * @property visibleCount  한 번에 보여줄 페이지 버튼 개수 (기본 5)
 * @property size          버튼 크기 (sm / md)
 * @property className     외부 클래스
 */
interface Props {
  page: number; // 1-based
  total?: number; // 총 아이템 개수 (undefined면 로딩 중으로 간주)
  pageSize?: number;
  onChange: (page: number) => void;
  visibleCount?: number;
  size?: PaginationSize;
  className?: string;
}

/**
 * Pagination 컴포넌트
 *
 * - total(총 개수) + pageSize 로 전체 페이지 수 계산
 * - 페이지를 visibleCount 단위로 묶어서 표시
 * - Prev / Next 는 그룹 단위 이동
 *
 * @example
 * ```tsx
 * <Pagination
 *   page={1}
 *   total={123}
 *   pageSize={10}
 *   onChange={(p) => setPage(p)}
 * />
 * ```
 */
const Pagination = ({
  page,
  total,
  onChange,
  visibleCount = 5,
  pageSize = 10,
  size = "md",
  className = "",
}: Props) => {
  /** total이 없거나 0 이하라면 페이징 표시할 필요 없음 */
  if (!total || total <= 0) return null;

  /** 전체 페이지 수 = 총 개수 / 페이지당 개수 */
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /**
   * 실제 보여줄 페이지 버튼 수
   * - visibleCount보다 totalPages가 더 작은 경우 totalPages로 조정
   */
  const count = Math.max(1, Math.min(visibleCount, totalPages));

  /** 안전하게 1~totalPages 범위 안에 보정된 현재 페이지 */
  const currentPage = Math.min(Math.max(1, page), totalPages);

  /**
   * 현재 페이지가 속한 묶음의 시작/끝
   * 예: 1~5, 6~10, 11~15
   */
  const start = Math.floor((currentPage - 1) / count) * count + 1;
  const end = Math.min(totalPages, start + count - 1);

  /** 현재 그룹에 표시할 페이지 번호 배열 */
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  /** 공통 스타일 */
  const base =
    "inline-flex items-center justify-center rounded-md border text-sm transition";
  const sizeClass = size === "sm" ? "h-7 min-w-7 px-1" : "h-8 min-w-8 px-2";
  const normal = "border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  const active = "!bg-main-active !text-white !border-main-active";
  const disabled = "opacity-40 pointer-events-none cursor-default";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  /**
   * 이전 묶음으로 이동
   * - start가 1이면 첫 그룹이므로 이동 불가
   */
  const handlePrevGroup = () => {
    if (start === 1) return;
    onChange(start - 1);
  };

  /**
   * 다음 묶음으로 이동
   * - 다음 그룹의 첫 페이지로 이동
   */
  const handleNextGroup = () => {
    if (end === totalPages) return;
    onChange(Math.min(totalPages, start + count));
  };

  /**
   * 특정 페이지로 이동
   *
   * @param p 이동할 페이지 번호
   */
  const handleClickPage = (p: number) => {
    if (p !== currentPage) {
      onChange(p);
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
      <nav
        className={`flex items-center gap-2 select-none ${className}`}
        aria-label="Pagination"
      >
        {/* 이전 묶음 */}
        <button
          type="button"
          className={`${base} ${sizeClass} ${normal} ${
            start === 1 ? disabled : ""
          }`}
          onClick={handlePrevGroup}
          aria-label="Previous pages group"
          disabled={start === 1}
        >
          <ChevronLeft className={iconSize} />
        </button>

        {/* 페이지 숫자 버튼 */}
        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handleClickPage(p)}
              aria-current={isActive ? "page" : undefined}
              className={`${base} ${sizeClass} ${isActive ? active : normal}`}
            >
              {p}
            </button>
          );
        })}

        {/* 다음 묶음 */}
        <button
          type="button"
          className={`${base} ${sizeClass} ${normal} ${
            end === totalPages ? disabled : ""
          }`}
          onClick={handleNextGroup}
          aria-label="Next pages group"
          disabled={end === totalPages}
        >
          <ChevronRight className={iconSize} />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
