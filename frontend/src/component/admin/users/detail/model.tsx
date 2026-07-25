import { useState } from "react";
import ModelAccessModal from "./modal/modelAccess";
import { MessageSquareIcon, ImageIcon } from "lucide-react";

const DetailModel = ({ targetInfo }) => {
  const [modelAccessModal, setModelAccessModal] = useState<boolean>(false);

  const chatModels = targetInfo?.model_list?.filter((m) => m.type === "chat") ?? [];
  const imageModels = targetInfo?.model_list?.filter((m) => m.type === "image") ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-row gap-4 flex-1 min-h-0">
          {/* 채팅 모델 */}
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <MessageSquareIcon className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                채팅 모델
              </span>
            </div>
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="text-sm text-neutral-500 bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 shrink-0 font-medium">
                모델명
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatModels.length > 0 ? (
                  chatModels.map((m, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 text-sm font-medium text-neutral-800 border-b border-neutral-100 last:border-0"
                    >
                      {m.label}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                    사용 가능한 채팅 모델이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 이미지 모델 */}
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                이미지 모델
              </span>
            </div>
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="text-sm text-neutral-500 bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 shrink-0 font-medium">
                모델명
              </div>
              <div className="flex-1 overflow-y-auto">
                {imageModels.length > 0 ? (
                  imageModels.map((m, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 text-sm font-medium text-neutral-800 border-b border-neutral-100 last:border-0"
                    >
                      {m.label}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                    사용 가능한 이미지 모델이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex justify-end border-t border-neutral-100 pt-3">
          <button
            className="text-sm px-4 py-2 rounded-lg bg-adminBlue text-white hover:opacity-90 font-medium transition-opacity"
            onClick={() => setModelAccessModal(true)}
          >
            모델 관리
          </button>
        </div>
      </div>
      <ModelAccessModal
        targetInfo={targetInfo}
        modelAccessModal={modelAccessModal}
        setModelAccessModal={setModelAccessModal}
      />
    </>
  );
};

export default DetailModel;
