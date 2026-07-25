import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  BanIcon,
  Building2Icon,
  ChevronDownIcon,
  FileIcon,
  ImageIcon,
  LightbulbIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { ClientLayoutContext } from "@/types/client/user";
import ModelPicker from "@/component/common/modelPicker";
import Modal from "@/component/common/feedback/modal";
import RejectedFilesModal from "@/component/common/feedback/rejectedFilesModal";
import { useGet } from "@/hooks/common/useAPI";

interface UserSettings {
  chat_model: string;
}

interface ModelOption {
  value: string;
  label: string;
}

type Mode = "internal" | "external";

const ClientHome = () => {
  const navigate = useNavigate();
  const { meData, directoryId, setDirectoryId, userDirectoryDatas } =
    useOutletContext<ClientLayoutContext>();

  const approvedDirectories =
    userDirectoryDatas?.filter((d) => d.id !== 1 && d.status === "approved") ??
    [];

  const { data: settingsData } = useGet<UserSettings>("api/user/settings", [
    "userSettings",
  ]);
  const { data: chatModels = [] } = useGet<ModelOption[]>("api/models/chat", [
    "models-chat",
  ]);

  const [mode, setMode] = useState<Mode>("internal");
  const [showNoModelModal, setShowNoModelModal] = useState(false);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [model, setModel] = useState<string>("gpt-5.5");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!model.startsWith("claude-")) setExtendedThinking(false);
  }, [model]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsData?.chat_model) setModel(settingsData.chat_model);
  }, [settingsData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode !== "internal") return;
    if (directoryId && approvedDirectories.some((d) => d.id === directoryId))
      return;
    if (approvedDirectories.length > 0)
      setDirectoryId(approvedDirectories[0].id);
  }, [mode, approvedDirectories, directoryId]);

  const selectedDirectory = approvedDirectories.find(
    (d) => d.id === directoryId,
  );
  const canSend = text.trim() !== "" || attachedFiles.length > 0;

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

  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

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

  const isClaudeExternal = mode === "external" && model.startsWith("claude-");

  useEffect(() => {
    if (!isClaudeExternal) { setIsDragging(false); return; }
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) setIsDragging(true);
    };
    document.addEventListener("dragenter", onDragEnter);
    return () => document.removeEventListener("dragenter", onDragEnter);
  }, [isClaudeExternal]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleSend = () => {
    if (!canSend) return;
    const message = text.trim();
    if (mode === "internal") {
      const targetId = selectedDirectory?.id ?? 1;
      navigate(`/internal/${targetId}`, {
        state: { pendingMessage: message },
      });
    } else {
      if (chatModels.length === 0) {
        setShowNoModelModal(true);
        return;
      }
      navigate(`/chatbot`, { state: { pendingMessage: message, model, attachedFiles, extendedThinking } });
    }
  };

  const greetingName = meData?.name ?? "";

  const buildGreeting = () => {
    const now = new Date();
    const last = meData?.last_login_at ? new Date(meData.last_login_at) : null;
    const withinDay =
      last && now.getTime() - last.getTime() < 24 * 60 * 60 * 1000;

    if (withinDay) {
      return greetingName
        ? `${greetingName}님, 다시 오셨네요`
        : "다시 오셨네요";
    }

    const hour = now.getHours();
    let timeGreeting = "좋은 저녁입니다";
    if (hour >= 5 && hour < 12) timeGreeting = "좋은 아침입니다";
    else if (hour >= 12 && hour < 18) timeGreeting = "좋은 오후입니다";

    return greetingName ? `${greetingName}님, ${timeGreeting}` : timeGreeting;
  };

  return (
    <div className="bg-gray-50/5 flex flex-col w-full h-full items-center px-5 md:px-8 pt-[22vh] text-textMain">
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
      <Modal
        open={showNoModelModal}
        onClose={() => setShowNoModelModal(false)}
        title="접근 권한 없음"
        description={
          <div className="flex flex-col">
            <span>외부용 채팅에 대한 접근 권한이 없습니다.</span>
            <span>관리자에게 문의해주세요.</span>
          </div>
        }
        buttonCount={1}
        primaryText="확인"
        onPrimary={() => setShowNoModelModal(false)}
        closeOnOverlay={false}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <BanIcon className="text-iconMain" />
          </div>
        }
      />
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-800">
            {buildGreeting()}
          </h1>
          <p className="text-sm text-neutral-500">
            오늘은 무엇을 도와드릴까요?
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <div
            className={`flex flex-col gap-2 w-full border rounded-xl bg-white px-4 py-3 transition-colors ${
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
              className="w-full focus:outline-none text-sm resize-none max-h-60 leading-6 py-1 bg-transparent"
              placeholder="메시지를 입력하세요"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex flex-row items-center justify-between gap-5">
              <div className="flex items-center">
                {mode === "external" && model.startsWith("claude-") && (
                  <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => setExtendedThinking((v) => !v)}
                      title="확장 사고 모드"
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        extendedThinking
                          ? "bg-yellow-100 text-yellow-500"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                    >
                      <LightbulbIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-5">
                {mode === "external" && (
                  <ModelPicker value={model} onChange={setModel} />
                )}
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="w-9 h-9 shrink-0 bg-textMain flex items-center justify-center rounded-lg disabled:bg-textMain/40"
                >
                  <SendIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-2 items-center justify-between flex-wrap">
            <div className="flex flex-row gap-1.5 p-1 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setMode("internal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${mode === "internal" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                <Building2Icon className="w-3.5 h-3.5" />
                내부용
              </button>
              <button
                onClick={() => setMode("external")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${mode === "external" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                외부용
              </button>
            </div>

            {mode === "internal" && (
              <div className="relative" ref={dropdownRef}>
                {approvedDirectories.length > 0 ? (
                  <>
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {selectedDirectory?.name ?? "디렉토리 선택"}
                      <ChevronDownIcon
                        className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg overflow-hidden min-w-[160px] z-10">
                        {approvedDirectories.map((dir) => (
                          <button
                            key={dir.id}
                            onClick={() => {
                              setDirectoryId(dir.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors
                              ${
                                dir.id === directoryId
                                  ? "bg-neutral-100 text-neutral-900 font-medium"
                                  : "text-neutral-600 hover:bg-neutral-50"
                              }`}
                          >
                            {dir.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-neutral-400">
                    승인된 디렉토리가 없습니다
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
