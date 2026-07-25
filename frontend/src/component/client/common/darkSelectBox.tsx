import { useState, useRef, useEffect } from "react";
import { ChevronDown, FolderIcon, PlusIcon } from "lucide-react";

/**
 * SelectBox의 옵션 타입
 *
 * @property label 화면에 표시될 텍스트
 * @property value 실제 값 (string | number)
 */
type Option = {
  label: string;
  value: string | number;
};

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
  value?: string | number | null;
  onChange?: (value: string | number) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  size?: Size;
  position?: Position;
  disabled?: boolean;
  setNewDirectory?: (value: boolean) => void;
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
const DarkSelectBox = ({
  value,
  onChange,
  options,
  className = "",
  size = "md",
  position = "bottom",
  disabled = false,
  setNewDirectory,
}: SelectBoxProps) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

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
      input: "h-10 text-sm px-3",
      item: "h-9 text-sm px-3",
      list: "text-sm py-1.5",
      arrow: "w-4 h-4",
    },
    lg: {
      input: "h-12 text-base px-3",
      item: "h-10 text-base px-3",
      list: "text-base py-2",
      arrow: "w-5 h-5",
    },
  }[size];

  /** 선택된 옵션 */
  const selectedOption = options?.find((o) => o.value === value);

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

  return (
    <div ref={boxRef} className={`relative inline-block w-full ${className}`}>
      {/* Input 영역 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`border border-gray-300 rounded-xl bg-white w-full flex items-center justify-between hover:bg-gray-50 whitespace-nowrap
          ${sizeStyles.input}
          ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        <div className="flex flex-row gap-3 items-center px-2">
          <FolderIcon className="text-iconMain w-4 h-4" />
          <span>{selectedOption?.label}</span>
        </div>

        <ChevronDown
          className={`${sizeStyles.arrow} transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* 옵션 리스트 */}
      {open && (
        <div
          className={`
            absolute border border-gray-300 bg-white shadow-lg rounded-xl z-10
            min-w-full flex flex-col items-center h-fit p-3 py-3 gap-1 overflow-y-auto
            ${sizeStyles.list}
            ${popupPosition}
          `}
        >
          {options
            .filter((opt) => opt.value != 1)
            .map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={[
                  sizeStyles.item,
                  "w-full flex flex-row gap-3 items-center shrink-0 rounded-xl",
                  value === opt.value ? "bg-gray-200/70" : "hover:bg-gray-100",
                ].join(" ")}
              >
                <FolderIcon className="text-iconMain w-4 h-4" />
                {opt.label}
              </button>
            ))}
          <button
            className="w-full flex flex-row gap-3 items-center shrink-0 rounded-xl h-9 text-sm px-3 border"
            onClick={() => {
              setNewDirectory(true);
              setOpen(false);
            }}
          >
            <PlusIcon className="text-iconMain w-4 h-4" />
            디렉토리
          </button>
        </div>
      )}
    </div>
  );
};

export default DarkSelectBox;
