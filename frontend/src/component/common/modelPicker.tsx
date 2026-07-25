import { useGet } from "@/hooks/common/useAPI";
import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useState } from "react";

interface ModelOption {
  value: string;
  label: string;
}

interface ModelPickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

const ModelPicker = ({ value, onChange }: ModelPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: models = [] } = useGet<ModelOption[]>("api/models/chat", ["models-chat"]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (models.length === 0) return;
    if (!value || !models.find((m) => m.value === value)) {
      onChange?.(models[0].value);
    }
  }, [models, value]);

  const current = models.find((m) => m.value === value) ?? models[0];

  if (!current) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-neutral-600 hover:bg-neutral-100 transition-colors"
      >
        <SparklesIcon className="w-3.5 h-3.5" />
        <span className="font-medium">{current.label}</span>
        <ChevronDownIcon
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-xl shadow-lg overflow-hidden min-w-[160px] z-20">
          {models.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                onChange?.(m.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors
                ${m.value === value ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelPicker;
