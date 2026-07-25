import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  desc?: string;
}

interface DropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  align?: "left" | "right";
  width?: string; // tailwind width class for the trigger
}

const Dropdown = ({
  value,
  onChange,
  options,
  placeholder = "선택",
  align = "left",
  width = "w-full",
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`relative ${width}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border bg-white text-left transition-colors
          ${open ? "border-neutral-500" : "border-neutral-200 hover:border-neutral-400"}`}
      >
        <span className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-neutral-800 truncate">
            {current ? current.label : placeholder}
          </span>
          {current?.desc && (
            <span className="text-[10px] text-neutral-500 truncate">
              {current.desc}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1.5 min-w-full bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden
            ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors
                    ${selected ? "bg-neutral-50" : "hover:bg-neutral-50"}`}
                >
                  <span className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-neutral-800 truncate">
                      {o.label}
                    </span>
                    {o.desc && (
                      <span className="text-[10px] text-neutral-500 truncate">
                        {o.desc}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <CheckIcon className="w-3.5 h-3.5 text-neutral-800 shrink-0 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
