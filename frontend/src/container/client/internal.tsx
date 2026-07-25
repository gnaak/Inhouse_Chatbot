import ClientInternalChatArea from "@/component/client/internal/chatArea";
import ClientInternalInputArea from "@/component/client/internal/inputArea";
import ClientExternalChatArea from "@/component/client/external/chatArea";
import ClientExternalInputArea from "@/component/client/external/inputArea";
import UnapprovedUserModal from "@/component/client/internal/modal/approvedUserModal";
import NewAlertModal from "@/component/client/internal/modal/newAlertModal";
import { useChatStream, useGet, baseURL } from "@/hooks/common/useAPI";
import { useAuth } from "@/hooks/common/useAuth";
import { MessageProps, UserDirectoryProps } from "@/types/client/directory";
import { ClientLayoutContext } from "@/types/client/user";
import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type LogDetailResponse = {
  id: number;
  session: string;
  directory_id: number | null;
  directory_name: string;
  log_type: string;
  version: string | null;
  messages: MessageProps[];
};

const ClientInternal = () => {
  const { user } = useAuth();
  const { directoryId, setDirectoryId, userDirectoryDatas } = useOutletContext<ClientLayoutContext>();
  const params = useParams<{ directoryId?: string; sessionId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlDirectoryId = params.directoryId ? Number(params.directoryId) : null;
  const urlSessionId = params.sessionId ?? null;

  const [externalMode, setExternalMode] = useState(() => !urlDirectoryId);
  const [isImageMode, setIsImageMode] = useState(false);
  const [model, setModel] = useState<string>(
    (location.state as { model?: string } | null)?.model ?? "gpt-5.5"
  );
  const [extendedThinking, setExtendedThinking] = useState(
    (location.state as { extendedThinking?: boolean } | null)?.extendedThinking ?? false
  );

  useEffect(() => {
    if (!urlDirectoryId) return;
    setExternalMode(false);
    if (urlDirectoryId !== directoryId) setDirectoryId(urlDirectoryId);
  }, [urlDirectoryId]);

  useEffect(() => {
    if (!model.startsWith("claude-")) setExtendedThinking(false);
  }, [model]);

  useEffect(() => {
    if (!userDirectoryDatas || !urlDirectoryId) return;
    const match = userDirectoryDatas.find((d) => d.id === urlDirectoryId && d.status === "approved");
    if (!match) navigate("/", { replace: true });
  }, [userDirectoryDatas, urlDirectoryId]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: userStatus } = useGet("api/auth/check_status", ["userStatus"]);
  const [unapprovedUser, setUnapprovedUser] = useState(false);

  useEffect(() => {
    if (userStatus && userStatus !== "approved") setUnapprovedUser(true);
  }, [userStatus, user?.id]);

  const [session, setSession] = useState<string>(() => crypto.randomUUID());
  const [clientText, setClientText] = useState("");
  const [chatList, setChatList] = useState<MessageProps[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [rejected, setRejected] = useState<UserDirectoryProps[] | null>(null);
  const [revoked, setRevoked] = useState<UserDirectoryProps[] | null>(null);
  const [newAlertModal, setNewAlertModal] = useState(false);

  const skipSessionResetRef = useRef(false);
  const prevChatKeyRef = useRef<string | null>(null);
  const lastSentModelRef = useRef<string>("");
  const userChangedModelRef = useRef(false);
  const chatKey = externalMode ? "external" : directoryId != null ? `dir-${directoryId}` : null;

  useEffect(() => {
    const prev = prevChatKeyRef.current;
    prevChatKeyRef.current = chatKey;
    if (skipSessionResetRef.current) { skipSessionResetRef.current = false; return; }
    if (prev === null || prev === chatKey) return;
    if (isStreaming) { abort(); setIsStreaming(false); }
    userChangedModelRef.current = false;
    const newSession = crypto.randomUUID();
    setSession(newSession);
    setChatList([]);
    if (urlSessionId) {
      if (externalMode) navigate("/chatbot", { replace: true });
      else if (directoryId != null) navigate(`/internal/${directoryId}`, { replace: true });
    }
  }, [chatKey]);

  const { data: logData } = useGet<LogDetailResponse>(
    `api/log/my_log_detail?session=${urlSessionId}`,
    ["logDetail", urlSessionId ?? ""],
    !!urlSessionId,
  );

  useEffect(() => {
    if (!logData) return;
    skipSessionResetRef.current = true;
    setSession(logData.session);
    setChatList(logData.messages);
    setExternalMode(logData.directory_id === null);
    setDirectoryId(logData.directory_id as number);
    setIsImageMode(logData.log_type === "image");
    if (logData.version) {
      // 새로고침 후 첫 메시지에서도 모델 변경 구분선이 표시되도록
      // 직전 세션의 마지막 모델을 ref에 채워둠
      lastSentModelRef.current = logData.version;
      if (!userChangedModelRef.current) {
        setModel(logData.version);
      }
    }
  }, [logData]);

  useEffect(() => {
    if (!userDirectoryDatas) return;
    const rejectedList = userDirectoryDatas.filter((d) => d.id !== 1 && d.status === "rejected" && !d.checked);
    if (rejectedList.length > 0) setRejected(rejectedList);
    const revokedList = userDirectoryDatas.filter((d) => d.id !== 1 && d.status === "revoked" && !d.checked);
    if (revokedList.length > 0) setRevoked(revokedList);
  }, [userDirectoryDatas]);

  useEffect(() => {
    if (rejected || revoked) setNewAlertModal(true);
  }, [rejected, revoked]);

  const selectedLabel = userDirectoryDatas?.find((d) => d.id === directoryId)?.name;

  const { sendMessage, abort } = useChatStream<{
    message: string;
    directoryId?: number | null;
    session: string;
    model?: string;
    extended_thinking?: boolean;
    image_base64?: string;
    image_media_type?: string;
    pdf_base64?: string;
  }>("api/chat/stream");

  const charQueueRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const chunkBufferRef = useRef<string>("");
  const inThinkingRef = useRef(false);
  const pendingThinkRef = useRef("");

  const BUILD_ON = "<!--JT_BUILD_ON-->";
  const BUILD_OFF = "<!--JT_BUILD_OFF-->";
  const THINK_ON = "<!--JT_THINK_ON-->";
  const THINK_OFF = "<!--JT_THINK_OFF-->";

  const setBuildingFile = (building: boolean) => {
    setChatList((prev) => {
      const updated = [...prev];
      if (updated.length > 0) updated[updated.length - 1].isBuildingFile = building;
      return updated;
    });
  };

  const flushPendingThink = () => {
    const text = pendingThinkRef.current;
    if (!text) return;
    pendingThinkRef.current = "";
    setChatList((prev) => {
      const updated = [...prev];
      if (updated.length > 0)
        updated[updated.length - 1].thinking = (updated[updated.length - 1].thinking ?? "") + text;
      return updated;
    });
  };

  const processIncomingChunk = (chunk: string) => {
    chunkBufferRef.current += chunk;
    let buf = chunkBufferRef.current;

    while (buf.length > 0) {
      const candidates = [
        { idx: buf.indexOf(THINK_ON), len: THINK_ON.length, kind: "think_on" as const },
        { idx: buf.indexOf(THINK_OFF), len: THINK_OFF.length, kind: "think_off" as const },
        { idx: buf.indexOf(BUILD_ON), len: BUILD_ON.length, kind: "build_on" as const },
        { idx: buf.indexOf(BUILD_OFF), len: BUILD_OFF.length, kind: "build_off" as const },
      ].filter((m) => m.idx >= 0).sort((a, b) => a.idx - b.idx);

      const first = candidates[0];

      if (!first) {
        const tailRisk = Math.max(THINK_ON.length, THINK_OFF.length, BUILD_ON.length, BUILD_OFF.length) - 1;
        const safeLen = Math.max(0, buf.length - tailRisk);
        if (safeLen > 0) {
          const safe = buf.slice(0, safeLen);
          buf = buf.slice(safeLen);
          if (inThinkingRef.current) {
            pendingThinkRef.current += safe;
          } else {
            charQueueRef.current.push(...safe.split(""));
            if (!rafRef.current) rafRef.current = requestAnimationFrame(drainQueue);
          }
        }
        break;
      }

      const pre = buf.slice(0, first.idx);
      if (pre) {
        if (inThinkingRef.current) {
          pendingThinkRef.current += pre;
        } else {
          charQueueRef.current.push(...pre.split(""));
          if (!rafRef.current) rafRef.current = requestAnimationFrame(drainQueue);
        }
      }
      buf = buf.slice(first.idx + first.len);

      if (first.kind === "think_on") {
        inThinkingRef.current = true;
        setChatList((prev) => {
          const updated = [...prev];
          if (updated.length > 0) updated[updated.length - 1].isThinking = true;
          return updated;
        });
      } else if (first.kind === "think_off") {
        inThinkingRef.current = false;
        flushPendingThink();
        setChatList((prev) => {
          const updated = [...prev];
          if (updated.length > 0) updated[updated.length - 1].isThinking = false;
          return updated;
        });
      } else if (first.kind === "build_on") {
        setBuildingFile(true);
      } else if (first.kind === "build_off") {
        setBuildingFile(false);
      }
    }

    if (pendingThinkRef.current) flushPendingThink();
    chunkBufferRef.current = buf;
  };

  const drainQueue = useCallback(() => {
    if (!charQueueRef.current.length) {
      rafRef.current = null;
      return;
    }
    const chars = charQueueRef.current.splice(0).join("");
    setChatList((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].message += chars;
      return updated;
    });
    rafRef.current = requestAnimationFrame(drainQueue);
  }, []);

  const handleSend = async (text: string, files?: File[]) => {
    const imageFiles = files?.filter(f => f.type.startsWith("image/")) ?? [];
    const pdfFiles = files?.filter(f => f.type === "application/pdf") ?? [];
    const docFiles = files?.filter(f => !f.type.startsWith("image/") && f.type !== "application/pdf") ?? [];

    if (isStreaming) handleAbort();
    charQueueRef.current = [];
    chunkBufferRef.current = "";
    inThinkingRef.current = false;
    pendingThinkRef.current = "";
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (externalMode && lastSentModelRef.current && lastSentModelRef.current !== model) {
      setChatList((prev) => [...prev, { type: "model_change", message: model, created_at: new Date().toISOString() }]);
    }
    if (externalMode) lastSentModelRef.current = model;
    setIsStreaming(true);

    const imageDataList: { data: string; media_type: string }[] = [];
    const pdfDataList: { data: string; name: string }[] = [];
    let firstImageDataUrl: string | undefined;
    const fileIds: string[] = [];
    const fileMeta: { s3_key: string; filename: string; content_type: string }[] = [];

    if (externalMode && imageFiles.length > 0) {
      for (const imgFile of imageFiles) {
        const dataUrl = await readFileAsDataURL(imgFile);
        if (!firstImageDataUrl) firstImageDataUrl = dataUrl;
        imageDataList.push({ data: dataUrl.split(",")[1], media_type: imgFile.type });
      }
    }
    if (externalMode && pdfFiles.length > 0) {
      for (const pdfFile of pdfFiles) {
        const dataUrl = await readFileAsDataURL(pdfFile);
        pdfDataList.push({ data: dataUrl.split(",")[1], name: pdfFile.name });
      }
    }

    if (externalMode && docFiles.length > 0) {
      for (const docFile of docFiles) {
        try {
          const formData = new FormData();
          formData.append("file", docFile);
          const res = await fetch(`${baseURL}/api/chat/upload-file`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          const json = await res.json();
          if (json.data?.file_id) {
            fileIds.push(json.data.file_id);
            if (json.data.s3_key) {
              fileMeta.push({
                s3_key: json.data.s3_key,
                filename: json.data.filename || docFile.name,
                content_type: json.data.content_type || docFile.type,
              });
            }
          }
        } catch {
          // 업로드 실패한 파일은 무시
        }
      }
    }

    const attachedFileNames = [
      ...imageFiles.map(f => f.name),
      ...pdfFiles.map(f => f.name),
      ...docFiles.map(f => f.name),
    ];

    const sentAt = new Date().toISOString();
    setChatList((prev) => [
      ...prev,
      {
        type: "user",
        message: text,
        created_at: sentAt,
        ...(firstImageDataUrl && { imageUrl: firstImageDataUrl }),
        ...(pdfDataList.length > 0 && { pdfNames: pdfDataList.map(p => p.name) }),
        ...(attachedFileNames.length > 0 && { fileNames: attachedFileNames }),
        ...(fileMeta.length > 0 && { docFiles: fileMeta.map(m => ({ name: m.filename, url: `${baseURL}/api/chat/file?key=${m.s3_key}` })) }),
      },
      { type: "bot", message: "", created_at: null, isLoading: true, ...(externalMode && extendedThinking && { thinking: "" }) },
    ]);
    setClientText("");
    try {
      const sendPayload = externalMode
        ? {
            message: text,
            session,
            model,
            ...(imageDataList.length > 0 && { images: imageDataList }),
            ...(pdfDataList.length > 0 && { pdfs: pdfDataList }),
            ...(fileIds.length > 0 && { file_ids: fileIds }),
            ...(fileMeta.length > 0 && { file_meta: fileMeta }),
            ...(extendedThinking && { extended_thinking: true }),
          }
        : { message: text, directoryId, session };

      await sendMessage(
        sendPayload,
        (chunk) => {
          setChatList((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].isLoading = false;
            return updated;
          });
          if (externalMode) {
            processIncomingChunk(chunk);
          } else {
            charQueueRef.current.push(...chunk.split(""));
            if (!rafRef.current) rafRef.current = requestAnimationFrame(drainQueue);
          }
        },
      );
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (pendingThinkRef.current) flushPendingThink();
      const remaining = chunkBufferRef.current;
      chunkBufferRef.current = "";
      if (remaining) {
        const cleaned = remaining
          .replace(/<!--JT_THINK_ON-->/g, "")
          .replace(/<!--JT_THINK_OFF-->/g, "")
          .replace(/<!--JT_BUILD_ON-->/g, "")
          .replace(/<!--JT_BUILD_OFF-->/g, "");
        if (cleaned) charQueueRef.current.push(...cleaned.split(""));
      }
      const allChars = charQueueRef.current.splice(0).join("");
      charQueueRef.current = [];
      const now = new Date().toISOString();
      setChatList((prev) => {
        const updated = [...prev];
        if (allChars) updated[updated.length - 1].message += allChars;
        updated[updated.length - 1].created_at = now;
        updated[updated.length - 1].isBuildingFile = false;
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
      [1000, 3000, 6000].forEach((delay) => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
          queryClient.invalidateQueries({ queryKey: ["logDetail", session] });
        }, delay);
      });
      if (!urlSessionId) {
        skipSessionResetRef.current = true;
        navigate(`/c/${session}`, { replace: true });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const pendingMessageRef = useRef<string | null>(
    (location.state as { pendingMessage?: string } | null)?.pendingMessage ?? null,
  );

  const pendingFilesRef = useRef<File[]>(
    (location.state as { attachedFiles?: File[] } | null)?.attachedFiles ?? [],
  );

  useEffect(() => {
    if (!pendingMessageRef.current && pendingFilesRef.current.length === 0) return;
    if (!externalMode && !directoryId) return;
    const message = pendingMessageRef.current ?? "";
    const filesArg = pendingFilesRef.current;
    pendingMessageRef.current = null;
    pendingFilesRef.current = [];
    navigate(location.pathname, { replace: true, state: {} });
    handleSend(message, filesArg.length > 0 ? filesArg : undefined);
  }, [directoryId, externalMode]);

  const handleAbort = () => {
    abort();
    setIsStreaming(false);
    inThinkingRef.current = false;
    pendingThinkRef.current = "";
    let hadResponse = false;
    setChatList((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        hadResponse = last.type === "bot" && !!last.message;
        last.isLoading = false;
        last.isBuildingFile = false;
        last.created_at = new Date().toISOString();
      }
      return updated;
    });
    if (hadResponse) {
      [1000, 3000, 6000].forEach((delay) => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
          queryClient.invalidateQueries({ queryKey: ["logDetail", session] });
        }, delay);
      });
    }
  };

  return (
    <>
      <div className="flex flex-col w-full h-full items-center relative text-textMain">
        {!externalMode && selectedLabel && (
          <div className="absolute top-5 right-5 md:right-8 z-10" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {selectedLabel}
              <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                {userDirectoryDatas
                  ?.filter((d) => d.id !== 1 && d.status === "approved")
                  .map((dir) => (
                    <button
                      key={dir.id}
                      onClick={() => { setDirectoryId(dir.id); setDropdownOpen(false); navigate(`/internal/${dir.id}`); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${dir.id === directoryId ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}
                    >
                      {dir.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        <div className="w-full xl:w-4/5 h-full relative">
          {externalMode
            ? <ClientExternalChatArea chatList={chatList} isStreaming={isStreaming} />
            : <ClientInternalChatArea chatList={chatList} />
          }
          {externalMode
            ? <ClientExternalInputArea clientText={clientText} setClientText={setClientText} isStreaming={isStreaming} handleSend={handleSend} handleAbort={handleAbort} model={model} setModel={(v) => { userChangedModelRef.current = true; setModel(v); }} isImageMode={isImageMode} extendedThinking={extendedThinking} setExtendedThinking={setExtendedThinking} />
            : <ClientInternalInputArea clientText={clientText} setClientText={setClientText} isStreaming={isStreaming} handleSend={handleSend} handleAbort={handleAbort} />
          }
        </div>
      </div>
      <NewAlertModal rejected={rejected} revoked={revoked} newAlertModal={newAlertModal} setNewAlertModal={setNewAlertModal} />
      <UnapprovedUserModal unapprovedUser={unapprovedUser} />
    </>
  );
};

export default ClientInternal;
