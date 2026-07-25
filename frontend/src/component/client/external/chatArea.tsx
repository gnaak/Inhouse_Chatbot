import { baseURL } from "@/hooks/common/useAPI";
import { convertThinkMarkers, normalizeToolBlocks } from "@/utils/format/markdown";

const resolveBackendLinks = (text: string) =>
  text.replace(/__BACKEND__/g, baseURL);
import { MessageProps } from "@/types/client/directory";
import { formatDateTimeWithSeconds } from "@/utils/format/date";
import { SparklesIcon, FileIcon, ArrowDownIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, BrainCircuitIcon, DownloadIcon, Maximize2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import TypingDots from "@/component/client/internal/typingAnimation";
import { normalizeEmphasis } from "@/utils/format/markdown";

const downloadImage = async (url: string) => {
  try {
    if (url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = "image";
      a.click();
      return;
    }
    const res = await fetch(url, { credentials: "include" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const ext = blob.type.split("/")[1]?.split(";")[0] || "jpg";
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `image.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // silent
  }
};

const ThinkingBlock = ({ thinking, isThinking }: { thinking: string; isThinking: boolean }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2 rounded-lg border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <BrainCircuitIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="text-xs text-neutral-500">
            {isThinking ? "사고 중..." : "사고 과정"}
          </span>
          {isThinking && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 py-2 text-neutral-300 bg-white leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap" style={{ fontSize: "11px" }}>
          {thinking || <span className="animate-pulse">▊</span>}
        </div>
      )}
    </div>
  );
};

const MultiImageView = ({ urls, onZoom }: { urls: string[]; onZoom: (url: string) => void }) => {
  const [idx, setIdx] = useState(0);
  const [landscape, setLandscape] = useState<boolean | null>(null);

  useEffect(() => { setLandscape(null); }, [idx]);

  if (urls.length === 0) return null;

  const resolvedUrl = resolveBackendLinks(urls[idx]);

  return (
    <div className="mb-2 relative group">
      <div className="w-72 h-56 flex items-center justify-center bg-neutral-100/40 rounded-lg overflow-hidden">
        <img
          src={resolvedUrl}
          alt=""
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setLandscape(naturalWidth >= naturalHeight);
          }}
          className={
            landscape === null
              ? "max-w-full max-h-full"
              : landscape
              ? "w-full h-auto"
              : "h-full w-auto"
          }
        />
      </div>

      {/* 오버레이 버튼 — 모바일은 항상 표시, 데스크탑은 hover 시 표시 */}
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => downloadImage(resolvedUrl)}
          className="p-1.5 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
          title="다운로드"
        >
          <DownloadIcon className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          onClick={() => onZoom(resolvedUrl)}
          className="p-1.5 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
          title="전체화면"
        >
          <Maximize2Icon className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {urls.length > 1 && (
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 transition-opacity"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-xs opacity-60">{idx + 1} / {urls.length}</span>
          <button
            onClick={() => setIdx((i) => Math.min(urls.length - 1, i + 1))}
            disabled={idx === urls.length - 1}
            className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 transition-opacity"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const ClientExternalChatArea = ({
  chatList,
  isStreaming,
}: {
  chatList: MessageProps[];
  isStreaming: boolean;
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  const scrollToBottom = (smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (smooth) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  };

  useEffect(() => {
    if (isStreaming) scrollToBottom(false);
  }, [isStreaming]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [chatList]);

  useEffect(() => {
    if (!fullscreenImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreenImage(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenImage]);

  return (
    <div className="w-full py-5 pb-16 p-3 h-[calc(100%-64px)] relative">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full h-full pt-12 px-2 md:px-5 flex flex-col gap-3 overflow-y-auto"
      >
        {chatList.map((chat, idx) => {
          if (chat.type === "model_change") {
            return (
              <div key={idx} className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                  {chat.message} 변경
                </span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>
            );
          }
          const imageUrls = chat.imageUrls ?? (chat.imageUrl ? [chat.imageUrl] : []);
          return (
            <div
              key={idx}
              className={`w-full flex flex-row gap-3 items-start ${chat.type == "bot" ? "justify-start" : "justify-end"}`}
            >
              {chat.type == "bot" && (
                <div className="hidden md:flex items-center justify-center rounded-full h-8 w-8 shrink-0 bg-textMain">
                  <SparklesIcon className="text-white w-5 h-5" />
                </div>
              )}
              <div
                className={`flex flex-col gap-1.5 w-full md:max-w-[90%] ${chat.type == "bot" ? "items-start" : "items-end"}`}
              >
                {/* 첨부 파일 칩 — 버블 바깥 위쪽 (PDF + 문서) */}
                {((chat.pdfNames && chat.pdfNames.length > 0) || (chat.docFiles && chat.docFiles.length > 0)) && (
                  <div className="flex flex-row flex-wrap gap-1.5 justify-end w-full">
                    {chat.pdfNames?.map((name, i) => (
                      <div key={`pdf-${i}`} className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white border border-neutral-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                        <FileIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate max-w-[180px]">{name}</span>
                      </div>
                    ))}
                    {chat.docFiles?.map((f, i) => (
                      <a
                        key={`doc-${i}`}
                        href={resolveBackendLinks(f.url)}
                        download={f.name}
                        className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white border border-neutral-200 px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
                      >
                        <FileIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate max-w-[180px]">{f.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                <div
                  className={`flex flex-col border rounded-xl p-3 w-fit max-w-full text-sm markdown-body ${chat.type == "bot" ? "bg-white" : "bg-textMain text-white"}`}
                >
                  {chat.isLoading && !chat.message ? (
                    <TypingDots />
                  ) : (
                    <>
                      {chat.thinking !== undefined && (
                        <ThinkingBlock thinking={chat.thinking} isThinking={chat.isThinking ?? false} />
                      )}
                      <MultiImageView urls={imageUrls} onZoom={setFullscreenImage} />
                      {chat.message && (
                        <ReactMarkdown
                          remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaks]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            table: ({ children, ...props }) => (
                              <div className="overflow-x-auto">
                                <table {...props}>{children}</table>
                              </div>
                            ),
                            pre: ({ children, ...props }) => (
                              <div className="overflow-x-auto">
                                <pre {...props}>{children}</pre>
                              </div>
                            ),
                          }}
                        >
                          {resolveBackendLinks(normalizeToolBlocks(convertThinkMarkers(normalizeEmphasis(chat.message))))}
                        </ReactMarkdown>
                      )}
                      {chat.isBuildingFile && <TypingDots />}
                    </>
                  )}
                </div>
                <div
                  className={`w-full flex flex-col ${chat.type == "user" ? "items-end" : "items-start"}`}
                >
                  <span className="px-3 text-xs text-iconMain">
                    {chat.created_at && formatDateTimeWithSeconds(chat.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-full p-2.5 shadow-md transition-colors"
        >
          <ArrowDownIcon className="w-4 h-4 text-neutral-700" />
        </button>
      )}

      {/* 전체화면 이미지 뷰어 */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-3 right-3 p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <XIcon className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadImage(fullscreenImage); }}
            className="absolute top-3 right-11 p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title="다운로드"
          >
            <DownloadIcon className="w-4 h-4 text-white" />
          </button>
          <img
            src={fullscreenImage}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ClientExternalChatArea;
