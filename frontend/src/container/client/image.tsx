import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BanIcon, DownloadIcon, ImageIcon, RefreshCwIcon, SendIcon, SquareIcon } from "lucide-react";
import { formatDateTimeWithSeconds } from "@/utils/format/date";
import ImageModelPicker from "@/component/common/imageModelPicker";
import TypingDots from "@/component/client/directory/typingAnimation";
import { baseURL, useGet, useRefreshToken } from "@/hooks/common/useAPI";
import Modal from "@/component/common/feedback/modal";

type ImageMessage = {
  type: "user" | "bot" | "model_change";
  message: string;
  imageUrl?: string;
  created_at: string | null;
  isLoading?: boolean;
  version?: string;
};

const ClientImage = () => {
  const navigate = useNavigate();
  const { imageSessionId } = useParams<{ imageSessionId?: string }>();
  const queryClient = useQueryClient();
  const [session, setSession] = useState(
    () => imageSessionId ?? crypto.randomUUID(),
  );
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [model, setModel] = useState<string>("");

  const { data: imageModels, isLoading: modelsLoading } = useGet<
    { value: string; label: string }[]
  >("api/models/image", ["models-image"]);
  const noAccess =
    !modelsLoading && imageModels !== undefined && imageModels.length === 0;

  const { data: settingsData } = useGet<{ image_model: string }>(
    "api/user/settings",
    ["userSettings"],
  );

  useEffect(() => {
    if (imageSessionId) return; // 기존 세션은 logData에서 복원
    if (userChangedModelRef.current) return;
    if (!settingsData?.image_model || !imageModels?.length) return;
    if (settingsData.image_model === model) return;
    if (imageModels.find((m) => m.value === settingsData.image_model)) {
      setModel(settingsData.image_model);
    }
  }, [settingsData, imageModels, imageSessionId, model]);

  const { data: logData } = useGet<{
    session: string;
    version: string | null;
    messages: ImageMessage[];
  }>(
    `api/log/my_log_detail?session=${imageSessionId}`,
    ["logDetail", imageSessionId ?? ""],
    !!imageSessionId,
  );

  const userChangedModelRef = useRef(false);

  useEffect(() => {
    if (!logData) return;
    if (logData.version) {
      lastSentModelRef.current = logData.version;
      if (!userChangedModelRef.current && logData.version !== model) {
        setModel(logData.version);
      }
    }
    if (logData.messages?.length) {
      setChatList(logData.messages.map((m) => ({
        ...m,
        imageUrl: m.imageUrl || undefined,
      })));
    }
  }, [logData]);

  const [chatList, setChatList] = useState<ImageMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const navigatedRef = useRef(!!imageSessionId);
  const lastSentModelRef = useRef<string>("");
  const prevSessionIdRef = useRef<string | undefined>(imageSessionId);
  const isDisabled = text.trim() === "";
  const refreshToken = useRefreshToken();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatList]);

  // /image/<id> 에서 /image (새 채팅) 로 전환 시 상태 초기화
  useEffect(() => {
    if (prevSessionIdRef.current === imageSessionId) return;
    const wasInSession = !!prevSessionIdRef.current;
    prevSessionIdRef.current = imageSessionId;

    if (!imageSessionId && wasInSession) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setIsStreaming(false);
      setSession(crypto.randomUUID());
      setChatList([]);
      setText("");
      setModel("");
      navigatedRef.current = false;
      lastSentModelRef.current = "";
      userChangedModelRef.current = false;
    }
  }, [imageSessionId]);

  const handleSend = async (prompt: string, modelOverride?: string) => {
    if (isStreaming) return;
    if (!prompt.trim()) return;

    const activeModel = modelOverride ?? model;
    setIsStreaming(true);
    setText("");

    if (lastSentModelRef.current && lastSentModelRef.current !== activeModel) {
      setChatList((prev) => [
        ...prev,
        {
          type: "model_change",
          message: model,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    lastSentModelRef.current = activeModel;

    setChatList((prev) => [
      ...prev,
      { type: "user", message: prompt, created_at: new Date().toISOString() },
      { type: "bot", message: "", created_at: null, isLoading: true, version: activeModel },
    ]);

    if (model === "nano-banana") {
      setChatList((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type: "bot",
          message: "Nano Banana 모델은 준비 중이에요.",
          created_at: new Date().toISOString(),
          isLoading: false,
        };
        return updated;
      });
      setIsStreaming(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    let generated = false;

    try {
      const makeRequest = () =>
        fetch(`${baseURL}/api/image/generate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, session, model: activeModel }),
          signal: controller.signal,
        });

      let response = await makeRequest();

      if (response.status === 401) {
        await refreshToken();
        response = await makeRequest();
      }

      if (!response.ok) throw new Error("이미지 생성 실패");
      if (!response.body) throw new Error("No stream body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const { data, error, saved } = JSON.parse(line);
            if (saved) {
              queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
              queryClient.invalidateQueries({ queryKey: ["myImages"] });
              queryClient.invalidateQueries({ queryKey: ["logDetail", session] });
            } else if (error) {
              setChatList((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  type: "bot",
                  message: error,
                  created_at: new Date().toISOString(),
                  isLoading: false,
                };
                return updated;
              });
            } else if (data) {
              generated = true;
              setChatList((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  type: "bot",
                  message: "",
                  imageUrl: `data:image/png;base64,${data}`,
                  created_at: new Date().toISOString(),
                  isLoading: true, // 스트림 끝날 때까지 partial 상태 유지
                };
                return updated;
              });
            }
          } catch {
            // 불완전한 JSON 라인 무시
          }
        }
      }

      if (generated) {
        // 스트림 완료 → 마지막 이미지의 isLoading 해제 (재생성/저장 버튼 노출)
        setChatList((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === "bot" && last.imageUrl) {
            updated[updated.length - 1] = { ...last, isLoading: false };
          }
          return updated;
        });
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          navigate(`/image/${session}`, { replace: true });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setChatList((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type: "bot",
          message: "이미지 생성에 실패했어요. 다시 시도해주세요.",
          created_at: new Date().toISOString(),
          isLoading: false,
        };
        return updated;
      });
    } finally {
      controllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      let blob: Blob;
      if (imageUrl.startsWith("data:")) {
        blob = await (await fetch(imageUrl)).blob();
      } else {
        const res = await fetch(
          `${baseURL}/api/image/download?path=${encodeURIComponent(imageUrl)}&filename=image.png`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "image.png";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("[image] download failed", e);
    }
  };

  const handleAbort = () => {
    controllerRef.current?.abort();
    let hadImage = false;
    setChatList((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.isLoading) {
        hadImage = !!last.imageUrl;
        updated[updated.length - 1] = {
          ...last,
          message: last.imageUrl
            ? "이미지를 생성했어요."
            : "생성이 취소됐어요.",
          isLoading: false,
          created_at: new Date().toISOString(),
        };
      }
      return updated;
    });
    setIsStreaming(false);
    if (hadImage) {
      [1000, 3000, 6000].forEach((delay) => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
          queryClient.invalidateQueries({ queryKey: ["logDetail", session] });
        }, delay);
      });
    }
  };

  return (
    <div className="flex flex-col w-full h-full items-center relative text-textMain">
      <Modal
        open={noAccess}
        onClose={() => navigate("/")}
        title="접근 권한 없음"
        description={
          <div className="flex flex-col">
            <span>이미지 생성 모델에 대한 접근 권한이 없습니다.</span>
            <span>관리자에게 문의해주세요.</span>
          </div>
        }
        buttonCount={1}
        primaryText="확인"
        onPrimary={() => navigate("/")}
        closeOnOverlay={false}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <BanIcon className="text-iconMain" />
          </div>
        }
      />
      <div className="w-full xl:w-4/5 h-full relative">
        {/* 채팅 영역 */}
        <div className="w-full py-5 pb-16 p-3 h-[calc(100%-64px)]">
          <div className="w-full h-full pt-12 px-2 md:px-5 flex flex-col gap-3 overflow-y-auto">
            {chatList.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-neutral-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-neutral-800">
                    이미지 생성
                  </h2>
                  <p className="text-sm text-neutral-400">
                    원하는 이미지를 설명해 보세요.
                  </p>
                </div>
              </div>
            ) : (
              chatList.map((chat, idx) => {
                if (chat.type === "model_change") {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 py-1"
                    >
                      <div className="flex-1 h-px bg-neutral-200" />
                      <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                        {chat.message} 변경
                      </span>
                      <div className="flex-1 h-px bg-neutral-200" />
                    </div>
                  );
                }
                return (
                <div
                  key={idx}
                  className={`w-full flex flex-row gap-3 items-start
                  ${chat.type === "bot" ? "justify-start" : "justify-end"}`}
                >
                  {chat.type === "bot" && (
                    <div className="hidden md:flex items-center justify-center rounded-full h-8 w-8 shrink-0 bg-textMain">
                      <ImageIcon className="text-white w-5 h-5" />
                    </div>
                  )}
                  <div
                    className={`flex flex-col gap-1 w-full md:max-w-[90%]
                    ${chat.type === "bot" ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`flex flex-col border rounded-xl p-3 w-fit text-sm
                      ${chat.type === "bot" ? "bg-white" : "bg-textMain text-white"}`}
                    >
                      {chat.isLoading && !chat.imageUrl ? (
                        <TypingDots />
                      ) : (
                        <>
                          {chat.imageUrl ? (
                            <div className="flex flex-col gap-1.5">
                              <img
                                src={chat.imageUrl.startsWith("data:") || chat.imageUrl.startsWith("http") ? chat.imageUrl : `${chat.imageUrl}`}
                                alt=""
                                className="rounded-lg max-w-sm w-full"
                                onLoad={() =>
                                  bottomRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "end",
                                  })
                                }
                              />
                              {!chat.isLoading && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      const prevUser = chatList[idx - 1];
                                      if (prevUser) handleSend(prevUser.message, chat.version);
                                    }}
                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors"
                                  >
                                    <RefreshCwIcon className="w-3.5 h-3.5" />
                                    재생성
                                  </button>
                                  <button
                                    onClick={() => handleDownload(chat.imageUrl!)}
                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors"
                                  >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    저장
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            chat.message
                          )}
                        </>
                      )}
                    </div>
                    <div
                      className={`w-full flex flex-col
                      ${chat.type === "user" ? "items-end" : "items-start"}`}
                    >
                      <span className="px-3 text-xs text-iconMain">
                        {chat.created_at &&
                          formatDateTimeWithSeconds(chat.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="absolute bottom-3 py-2 px-5 md:px-8 w-full items-end justify-center flex">
          <div
            className={`flex flex-col gap-2 w-full border rounded-xl bg-white px-3 py-3 hover:border-gray-500
              ${focused ? "border-gray-700" : " border-gray-300"}`}
          >
            <textarea
              rows={1}
              className="w-full focus:outline-none text-sm resize-none max-h-60 leading-6 py-1 bg-transparent"
              placeholder="생성할 이미지를 설명해주세요"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(text);
                }
              }}
            />
            <div className="flex flex-row items-center justify-end gap-5">
              <ImageModelPicker
                value={model}
                onChange={(v) => {
                  // picker가 빈 값일 때 자동 선택하는 케이스는 사용자 변경으로 보지 않음
                  if (model) userChangedModelRef.current = true;
                  setModel(v);
                }}
              />
              {isStreaming ? (
                <button className="w-8 h-8 bg-textMain/70 flex items-center justify-center rounded-full">
                  <SquareIcon
                    className="w-4 h-4 text-white"
                    onClick={handleAbort}
                  />
                </button>
              ) : (
                <button
                  className="w-8 h-8 bg-textMain flex items-center justify-center rounded-lg disabled:bg-textMain/40"
                  disabled={isDisabled}
                  onClick={() => handleSend(text)}
                >
                  <SendIcon className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientImage;
