import { ChevronDownIcon, FileWarningIcon } from "lucide-react";
import { useState } from "react";
import Modal from "@/component/common/feedback/modal";

interface SupportedItem {
  label: string;
  exts: string;
}

const SUPPORTED: SupportedItem[] = [
  { label: "이미지", exts: "jpg · jpeg · png · webp" },
  { label: "문서", exts: "pdf · docx" },
  { label: "프레젠테이션", exts: "pptx" },
  { label: "텍스트", exts: "txt · csv" },
];

interface Props {
  files: string[];
  onClose: () => void;
}

const RejectedFilesModal = ({ files, onClose }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Modal
      open={files.length > 0}
      onClose={onClose}
      title="지원하지 않는 파일이에요"
      description={
        <div className="flex flex-col gap-3 text-left">
          <ul className="flex flex-col gap-1.5">
            {files.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2"
              >
                <FileWarningIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-between text-xs text-neutral-500 hover:text-neutral-700 transition-colors px-1"
          >
            <span>지원하는 파일 보기</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {expanded && (
            <div className="flex flex-col gap-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              {SUPPORTED.map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-neutral-600">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {item.exts}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
      buttonCount={1}
      primaryText="확인"
    />
  );
};

export default RejectedFilesModal;
