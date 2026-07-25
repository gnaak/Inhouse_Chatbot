import { useEffect, useState } from "react";
import {
  ImageIcon,
  MessageSquareIcon,
  ScrollTextIcon,
  SparklesIcon,
} from "lucide-react";
import Button from "@/component/common/form/button";
import Dropdown from "@/component/common/dropdown";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "chat" | "image";

interface UserSettings {
  chat_instructions: string;
  chat_model: string;
  chat_tone: string;
  chat_length: string;
  chat_language: string;
  image_instructions: string;
  image_model: string;
}

interface ModelOption {
  value: string;
  label: string;
}

const ClientSetting = () => {
  const [tab, setTab] = useState<Tab>("chat");

  const [chatInstructions, setChatInstructions] = useState("");
  const [chatModel, setChatModel] = useState("gpt-5.5");
  const [tone, setTone] = useState("neutral");
  const [length, setLength] = useState("normal");
  const [language, setLanguage] = useState("ko");

  const [imageInstructions, setImageInstructions] = useState("");
  const [imageModel, setImageModel] = useState("gpt-image");

  const queryClient = useQueryClient();
  const { data } = useGet<UserSettings>("api/user/settings", ["userSettings"]);
  const { data: chatModels = [] } = useGet<ModelOption[]>("api/models/chat", [
    "models-chat",
  ]);
  const { data: imageModels = [] } = useGet<ModelOption[]>("api/models/image", [
    "models-image",
  ]);
  const saveSettings = usePost<UserSettings, void>("api/user/settings");

  useEffect(() => {
    if (!data) return;
    setChatInstructions(data.chat_instructions);
    setChatModel(data.chat_model);
    setTone(data.chat_tone);
    setLength(data.chat_length);
    setLanguage(data.chat_language);
    setImageInstructions(data.image_instructions);
    setImageModel(data.image_model);
  }, [data]);

  const charLimit = 2000;

  const handleSave = () => {
    saveSettings.mutate(
      {
        chat_instructions: chatInstructions,
        chat_model: chatModel,
        chat_tone: tone,
        chat_length: length,
        chat_language: language,
        image_instructions: imageInstructions,
        image_model: imageModel,
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["userSettings"] }),
      },
    );
  };

  return (
    <div className="flex flex-col w-full h-full text-textMain overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto px-4 md:px-10 py-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-neutral-800">설정</h1>
          <p className="text-xs text-neutral-500">
            챗봇 모델, 응답 스타일 등을 한곳에서 조정할 수 있어요.
          </p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
          <button
            onClick={() => setTab("chat")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === "chat" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            <MessageSquareIcon className="w-3.5 h-3.5" />
            채팅
          </button>
          <button
            onClick={() => setTab("image")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === "image" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            이미지
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {tab === "chat" && (
            <>
              {/* 지침 */}
              <section className="flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
                <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center md:items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <ScrollTextIcon className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-neutral-800">
                        지침
                      </h2>
                      <p className="md:block hidden text-xs text-neutral-500 mt-0.5">
                        챗봇이 답변할 때 따라야 할 규칙·톤·형식을 자유롭게
                        적어주세요.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-400 shrink-0 mt-1">
                    {chatInstructions.length}/{charLimit}
                  </span>
                </div>
                <div className="px-4 pb-6">
                  <textarea
                    value={chatInstructions}
                    onChange={(e) =>
                      setChatInstructions(e.target.value.slice(0, charLimit))
                    }
                    placeholder={`예시)\n- 답변은 항상 존댓말로 해주세요.\n- 답변 끝에 출처 디렉토리를 표시해주세요.\n- 불확실하면 "확인이 필요해요"라고 답변해주세요.`}
                    className="resize-none w-full min-h-[180px] p-4 rounded-xl bg-neutral-50 border border-transparent text-xs focus:outline-none focus:bg-white focus:border-neutral-300 transition-colors leading-relaxed placeholder:text-neutral-400"
                  />
                </div>
              </section>

              {/* 기본 모델 */}
              <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
                <div className="px-4 py-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <SparklesIcon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-neutral-800">
                        기본 모델
                      </h2>
                      <p className="md:block hidden text-xs text-neutral-500 mt-0.5">
                        새 외부용 채팅의 기본 모델
                      </p>
                    </div>
                    <div className="w-44">
                      <Dropdown
                        value={chatModel}
                        onChange={setChatModel}
                        options={chatModels}
                        align="right"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === "image" && (
            <>
              {/* 이미지 지침 */}
              <section className="flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
                <div className="px-4 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center md:items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <ScrollTextIcon className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-neutral-800">
                        지침
                      </h2>
                      <p className="md:block hidden text-xs text-neutral-500 mt-0.5">
                        이미지 생성 시 항상 적용할 스타일·분위기·제약을
                        적어주세요.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-400 shrink-0 mt-1">
                    {imageInstructions.length}/{charLimit}
                  </span>
                </div>
                <div className="px-4 pb-6">
                  <textarea
                    value={imageInstructions}
                    onChange={(e) =>
                      setImageInstructions(e.target.value.slice(0, charLimit))
                    }
                    placeholder={`예시)\n- 항상 사실적인 사진 스타일로 생성해주세요.\n- 배경은 깔끔한 단색으로 해주세요.\n- 밝고 따뜻한 색감을 유지해주세요.`}
                    className="resize-none w-full min-h-[180px] p-4 rounded-xl bg-neutral-50 border border-transparent text-xs focus:outline-none focus:bg-white focus:border-neutral-300 transition-colors leading-relaxed placeholder:text-neutral-400"
                  />
                </div>
              </section>

              {/* 이미지 모델 */}
              <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
                <div className="px-4 py-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <SparklesIcon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-neutral-800">
                        기본 모델
                      </h2>
                      <p className="md:block hidden text-xs text-neutral-500 mt-0.5">
                        이미지 생성에 사용할 기본 모델
                      </p>
                    </div>
                    <div className="w-44">
                      <Dropdown
                        value={imageModel}
                        onChange={setImageModel}
                        options={imageModels}
                        align="right"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* 저장 */}
        <div className="flex items-center justify-end pb-2">
          <Button
            size="sm"
            disabled={saveSettings.isPending}
            onClick={handleSave}
          >
            <span className="text-xs">
              {saveSettings.isPending ? "저장 중..." : "변경사항 저장"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientSetting;
