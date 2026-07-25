import { useState, useRef, useEffect, useMemo } from "react";
import {
  Building2Icon,
  ChevronDown,
  ChevronRight,
  FolderOpenIcon,
  LucideIcon,
  SearchIcon,
  Users2Icon,
} from "lucide-react";
import {
  buildDepartmentTree,
  DepartmentNode,
  DepartmentProps,
  DepartmentType,
} from "@/types/client/department";
import InputBox from "@/component/common/form/inputbox";

/**
 * SelectBox의 옵션 타입
 *
 * @property label 화면에 표시될 텍스트
 * @property value 실제 값 (string | number)
 */

/**
 * SelectBox 크기 타입
 */
type Size = "sm" | "md" | "lg";

/**
 * 옵션 리스트가 열리는 방향
 */
type Position = "top" | "bottom";

/**
 * SelectBox 컴포넌트 Props
 *
 * @property value        선택된 값
 * @property onChange     선택 시 호출되는 콜백
 * @property options      표시할 옵션 배열
 * @property placeholder  값이 없을 때 표시되는 텍스트
 * @property className    래퍼 커스텀 클래스
 * @property size         크기(sm/md/lg)
 * @property position     팝업 위치(top/bottom)
 * @property disabled     비활성화 여부
 */
interface SelectBoxProps {
  value?: number | null;
  onChange?: (value: string | number) => void;
  options: DepartmentProps[];
  placeholder?: string;
  className?: string;
  size?: Size;
  position?: Position;
  disabled?: boolean;
}

/**
 * 재사용 가능한 SelectBox (커스텀 드롭다운)
 *
 * - 옵션 리스트를 클릭하면 value/onChange 방식으로 값 반환
 * - 외부 클릭 감지하여 자동 닫힘
 * - 팝업이 열리는 방향 지정 가능 (top/bottom)
 * - 크기 옵션 제공 (sm/md/lg)
 *
 * @example 기본 사용
 * ```tsx
 * <SelectBox
 *   value={selected}
 *   onChange={(v) => setSelected(v)}
 *   options={[
 *     { label: "Option 1", value: 1 },
 *     { label: "Option 2", value: 2 },
 *   ]}
 * />
 * ```
 *
 * @example 위로 펼쳐지는 SelectBox
 * ```tsx
 * <SelectBox position="top" />
 * ```
 *
 * @example 큰 사이즈
 * ```tsx
 * <SelectBox size="lg" />
 * ```
 */
const DepartmentSelectBox = ({
  value,
  onChange,
  options,
  placeholder = "선택하세요",
  className = "",
  size = "md",
  position = "bottom",
  disabled = false,
}: SelectBoxProps) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // 열려있는 노드 관리
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 검색용
  const [keyword, setKeyword] = useState("");

  // 노드 열기 / 닫기
  const toggleNode = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 사이즈별 스타일 맵
   */
  const sizeStyles = {
    sm: {
      input: "h-8 text-xs px-2",
      item: "h-7 text-xs px-2",
      list: "text-xs py-1",
      arrow: "w-3 h-3",
    },
    md: {
      input: "h-10 text-xs px-3",
      item: "h-9 text-xs px-3",
      list: "text-sm",
      arrow: "w-4 h-4",
    },
    lg: {
      input: "h-12 text-base px-3",
      item: "h-10 text-base px-3",
      list: "text-base py-2",
      arrow: "w-5 h-5",
    },
  }[size];

  const filterTree = (
    nodes: DepartmentNode[],
    keyword: string,
  ): DepartmentNode[] => {
    if (!keyword.trim()) return nodes;

    return nodes
      .map((node) => {
        const isMatched = node.name
          .toLowerCase()
          .includes(keyword.toLowerCase());

        const filteredChildren = filterTree(node.children ?? [], keyword);

        if (isMatched || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }

        return null;
      })
      .filter(Boolean) as DepartmentNode[];
  };

  // flat 구조를 tree 구조로 변환
  const treeData = useMemo(() => {
    return buildDepartmentTree(options ?? []);
  }, [options]);

  const filteredTree = useMemo(() => {
    return filterTree(treeData, keyword);
  }, [treeData, keyword]);

  // 아이콘 매핑
  const typeIconMap: Record<DepartmentType, LucideIcon> = {
    group: FolderOpenIcon,
    hq: Building2Icon,
    division: FolderOpenIcon,
    part: Users2Icon,
    team: Users2Icon,
  };

  const findNodeById = (
    nodes: DepartmentNode[],
    id?: number | null,
  ): DepartmentNode | null => {
    if (!id) return null;

    for (const node of nodes) {
      if (node.id === id) return node;

      if (node?.children.length > 0) {
        const found = findNodeById(node?.children, id);
        if (found) return found;
      }
    }

    return null;
  };

  /** 선택된 옵션 */
  const selectedOption = useMemo(() => {
    return findNodeById(treeData, value) ?? null;
  }, [treeData, value]);

  /** 팝업 위치 */
  const popupPosition =
    position === "top" ? "bottom-full mb-1 left-0" : "top-full mt-1 left-0";

  /**
   * 외부 클릭 → SelectBox 닫기
   */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /**
   * 옵션 선택 처리
   */
  const handleSelect = (val: string | number) => {
    onChange?.(val);
    setOpen(false);
  };

  useEffect(() => {
    if (!keyword.trim()) {
      setExpandedIds(new Set());
      return;
    }

    const allIds = new Set<number>();

    const collectIds = (nodes: DepartmentNode[]) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };

    collectIds(treeData);

    setExpandedIds(allIds);
  }, [keyword, treeData]);

  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;

    const regex = new RegExp(`(${keyword})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 text-black font-medium">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const renderTree = (nodes: DepartmentNode[], depth = 0) => {
    return nodes.map((node) => {
      const Icon = typeIconMap[node.type];
      const hasChildren = node.children?.length > 0;
      const shouldExpand = expandedIds.has(node.id);
      return (
        <div key={node.id} className="w-full">
          <div
            className={[
              sizeStyles.item,
              "w-full flex items-center gap-2 text-left",
              value === node.id ? "bg-sub1 text-white" : "hover:bg-main/10",
            ].join(" ")}
            style={{ paddingLeft: `calc(${depth * 16}px + 0.75rem)` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="w-4 h-4 flex items-center justify-center shrink-0"
              >
                {shouldExpand ? (
                  <ChevronDown
                    className={`w-4 h-4
                    ${value == node.id ? "text-white" : "text-iconMain"}`}
                  />
                ) : (
                  <ChevronRight
                    className={`w-4 h-4
                    ${value == node.id ? "text-white" : "text-iconMain"}`}
                  />
                )}
              </button>
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}

            {/* 선택 버튼 */}
            <button
              type="button"
              onClick={() => handleSelect(node.id)}
              className={`flex-1 flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-4 h-4
                    ${value == node.id ? "text-white" : "text-iconMain"}`}
                />
                <span>{highlightText(node.name, keyword)}</span>{" "}
              </div>

              <span
                className={`text-xs
                ${value == node.id ? "text-white" : "text-inputHeader"}`}
              >
                {node.type === "hq"
                  ? "본부"
                  : node.type === "division"
                    ? "부서"
                    : node.type == "part"
                      ? "파트"
                      : node.type == "group"
                        ? "그룹"
                        : "팀"}
              </span>
            </button>
          </div>

          {hasChildren && shouldExpand && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div ref={boxRef} className={`relative inline-block w-full ${className}`}>
      {/* Input 영역 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`text-xs border rounded-md bg-white w-full flex items-center justify-between hover:bg-gray-50 whitespace-nowrap
          ${sizeStyles.input}
          ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        <span>{selectedOption ? selectedOption.name : placeholder}</span>

        <ChevronDown
          className={`${sizeStyles.arrow} transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* 옵션 리스트 */}
      {open && (
        <>
          <div
            className={`
              absolute border border-gray-300 bg-white shadow-lg rounded-md z-10
              min-w-full flex flex-col items-start h-fit max-h-[240px] overflow-y-auto
              ${sizeStyles.list}
              ${popupPosition}
              `}
          >
            <div className="border-b w-full sticky top-0">
              <InputBox
                leftIcon={<SearchIcon className="text-[#A3A3A3]" />}
                placeholder="조직 검색"
                value={keyword}
                onChange={(value) => setKeyword(value)}
                className="!border-none"
              />
            </div>
            <div className="py-1.5 w-full">
              {filteredTree.length === 0 ? (
                <div className="text-xs text-inputHeader py-4 text-center">
                  검색 결과가 없습니다
                </div>
              ) : (
                renderTree(filteredTree)
              )}
            </div>{" "}
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentSelectBox;
