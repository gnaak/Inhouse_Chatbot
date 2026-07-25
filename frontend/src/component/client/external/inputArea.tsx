import ModelPicker from "@/component/common/modelPicker";
import ImageModelPicker from "@/component/common/imageModelPicker";
import RejectedFilesModal from "@/component/common/feedback/rejectedFilesModal";
import { FileIcon, ImageIcon, LightbulbIcon, PlusIcon, SendIcon, SquareIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  clientText: string;
  setClientText: (v: string) => void;
  isStreaming: boolean;
  handleSend: (text: string, files?: File[]) => void;
  handleAbort: () => void;
  model: string;
  setModel: (v: string) => void;
  isImageMode?: boolean;
  extendedThinking?: boolean;
  setExtendedThinking?: (v: boolean) => void;
}

// 다중 업로드 풀 때 true로 변경
const MULTIPLE_UPLOAD = false;

const ACCEPTED_EXTS = new Set([
  "jpg", "jpeg", "png", /* "gif", */ "webp",
  "pdf", "docx", /* "xlsx", "xls", */ "pptx", /* "ppt", */ "txt", "csv",
]);
const ACCEPT_ATTR = [
  "image/jpeg", "image/png", /* "image/gif", */ "image/webp",
  "application/pdf",
  ".docx",
  // ".xlsx", ".xls",
  ".pptx",
  // ".ppt",
  ".txt", ".csv",
].join(",");
const isAccepted = (file: File) => {
  if (file.type.startsWith("image/") || file.type === "application/pdf") return true;
  return ACCEPTED_EXTS.has(file.name.split(".").pop()?.toLowerCase() ?? "");
};

const ClientExternalInputArea = ({
  clientText,
  setClientText,
  isStreaming,
  handleSend,
  handleAbort,
  model,
  setModel,
  isImageMode,
  extendedThinking,
  setExtendedThinking,
}: Props) => {
  const [focused, setFocused] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const isClaudeFile = model.startsWith("claude-") && !isImageMode;
  const isDisabled = clientText.trim() === "" && attachedFiles.length === 0;

  useEffect(() => {
    if (!isClaudeFile) { setIsDragging(false); return; }
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) setIsDragging(true);
    };
    document.addEventListener("dragenter", onDragEnter);
    return () => document.removeEventListener("dragenter", onDragEnter);
  }, [isClaudeFile]);

  const addFiles = (files: File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];
    files.forEach((f) => (isAccepted(f) ? accepted.push(f) : rejected.push(f.name)));
    if (rejected.length) setRejectedFiles(rejected);
    if (!accepted.length) return;

    // 단일 파일 모드 (다중 업로드 풀 때 아래 블록으로 교체)
    setAttachedFiles([accepted[accepted.length - 1]]);

    // 다중 파일 모드 (임시 주석)
    // setAttachedFiles((prev) => {
    //   const newFiles = accepted.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size));
    //   return [...prev, ...newFiles];
    // });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleSendWithFile = () => {
    handleSend(clientText, attachedFiles.length > 0 ? attachedFiles : undefined);
    setAttachedFiles([]);
  };

  return (
    <div className="absolute bottom-3 py-2 px-5 md:px-8 w-full items-end justify-center flex">
      <RejectedFilesModal
        files={rejectedFiles}
        onClose={() => setRejectedFiles([])}
      />
      {isDragging && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="border-2 border-dashed border-neutral-500 rounded-2xl px-20 py-14 flex flex-col items-center gap-4 pointer-events-none bg-neutral-800">
            <UploadCloudIcon className="w-12 h-12 text-white" />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-white font-semibold text-sm">파일을 놓으세요</span>
              <span className="text-neutral-400 text-xs">이미지, PDF, 문서 파일 업로드</span>
            </div>
          </div>
        </div>
      )}
      <div
        className={`flex flex-col gap-2 w-full border rounded-xl bg-white px-3 py-3 transition-colors ${
          focused ? "border-gray-700" : "border-gray-300 hover:border-gray-500"
        }`}
      >
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-2 px-1 flex-wrap">
            {attachedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full max-w-xs">
                {file.type.startsWith("image/")
                  ? <ImageIcon className="w-3 h-3 shrink-0" />
                  : <FileIcon className="w-3 h-3 shrink-0" />}
                <span className="truncate">{file.name}</span>
                <button onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 hover:text-gray-900">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          rows={1}
          disabled={isStreaming}
          className="w-full focus:outline-none text-sm resize-none max-h-60 leading-6 py-1 bg-transparent disabled:cursor-not-allowed"
          placeholder={isStreaming ? "답변이 끝난 뒤 입력할 수 있어요" : "메시지를 입력하세요"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={clientText}
          onChange={(e) => {
            setClientText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isStreaming) return;
              handleSendWithFile();
            }
          }}
        />
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isClaudeFile && (
              <>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={MULTIPLE_UPLOAD}
                  accept={ACCEPT_ATTR}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
            {isClaudeFile && (
              <button
                onClick={() => setExtendedThinking?.(!extendedThinking)}
                title="확장 사고 모드"
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  extendedThinking
                    ? "bg-yellow-100 text-yellow-500"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                }`}
              >
                <LightbulbIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isImageMode
              ? <ImageModelPicker value={model} onChange={setModel} />
              : <ModelPicker value={model} onChange={setModel} />
            }
            {isStreaming ? (
              <button className="w-8 h-8 bg-textMain/70 flex items-center justify-center rounded-full" onClick={handleAbort}>
                <SquareIcon className="w-4 h-4 text-white" />
              </button>
            ) : (
              <button
                className="w-8 h-8 bg-textMain flex items-center justify-center rounded-lg disabled:bg-textMain/40"
                disabled={isDisabled}
                onClick={handleSendWithFile}
              >
                <SendIcon className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientExternalInputArea;
