import Checkbox from "@/component/common/form/checkbox";
import Button from "@/component/common/form/button";
import Loading from "@/component/common/loading";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ModelItem {
  id: number;
  value: string;
  label: string;
}

interface AllModelsResponse {
  chat: ModelItem[];
  image: ModelItem[];
}

type Provider = "OpenAI" | "Gemini" | "Claude" | "기타";

const PROVIDER_CONFIG: Record<Provider, { badge: string; dot: string }> = {
  OpenAI: { badge: "text-emerald-700 bg-emerald-50 border-emerald-100", dot: "bg-emerald-500" },
  Gemini: { badge: "text-blue-700 bg-blue-50 border-blue-100",           dot: "bg-blue-500" },
  Claude: { badge: "text-orange-700 bg-orange-50 border-orange-100",     dot: "bg-orange-500" },
  기타:   { badge: "text-neutral-600 bg-neutral-100 border-neutral-200",  dot: "bg-neutral-400" },
};

const getProvider = (value: string): Provider => {
  if (value.startsWith("gpt-") || value.startsWith("o1") || value.startsWith("o3")) return "OpenAI";
  if (value.startsWith("gemini")) return "Gemini";
  if (value.startsWith("claude")) return "Claude";
  return "기타";
};

const groupByProvider = (models: ModelItem[]): [Provider, ModelItem[]][] => {
  const map = new Map<Provider, ModelItem[]>();
  for (const m of models) {
    const p = getProvider(m.value);
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(m);
  }
  return Array.from(map.entries());
};

const ModelAccessModal = ({ targetInfo, modelAccessModal, setModelAccessModal }) => {
  const { data: allModels, isLoading } = useGet<AllModelsResponse>("api/models/all", ["models-all"]);
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [openProviders, setOpenProviders] = useState<Set<Provider>>(new Set());

  useEffect(() => {
    if (!targetInfo?.model_list) return;
    setSelectedIds(new Set(targetInfo.model_list.map((m) => m.model_id)));
  }, [targetInfo]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleProvider = (p: Provider) => {
    setOpenProviders((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const saveUserModelsMutation = usePost("api/models/update_user_models");
  const handleSave = () => {
    saveUserModelsMutation.mutate(
      { user_id: targetInfo.id, model_ids: Array.from(selectedIds) },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["userDatas"] });
          setModelAccessModal(false);
        },
      },
    );
  };

  if (!modelAccessModal) return null;

  const chatGroups = allModels ? groupByProvider(allModels.chat) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {isLoading && <Loading />}
      <div className="w-[420px] max-h-[85vh] bg-white rounded-2xl shadow-sm border border-neutral-200/80 flex flex-col">

        {/* 아이콘 + 타이틀 */}
        <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-2.5 border-b border-neutral-100 shrink-0">
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 flex items-center justify-center shrink-0">
            <SparklesIcon className="text-iconMain" />
          </div>
          <span className="text-sm font-semibold text-neutral-800">모델 접근 권한 설정</span>
          <span className="text-xs text-neutral-400">
            {targetInfo?.name}
            <span className="ml-1">({targetInfo?.email})</span>
          </span>
        </div>

        {/* 모델 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

          {/* 채팅 모델 */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide px-1">
              채팅 모델
            </span>
            <div className="flex flex-col gap-1.5">
              {chatGroups.map(([provider, models]) => {
                const cfg = PROVIDER_CONFIG[provider];
                const isOpen = openProviders.has(provider);
                const selectedCount = models.filter((m) => selectedIds.has(m.id)).length;

                return (
                  <div key={provider} className="rounded-xl border border-neutral-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleProvider(provider)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          {provider}
                        </span>
                        {selectedCount > 0 && (
                          <span className="text-[11px] text-neutral-400">
                            {selectedCount}개 선택됨
                          </span>
                        )}
                      </div>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-neutral-100 bg-neutral-50/60 px-3 py-2 flex flex-col gap-0.5">
                        {models.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedIds.has(m.id)}
                              onChange={() => handleToggle(m.id)}
                            />
                            <span className="text-xs text-neutral-700">{m.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 이미지 모델 */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide px-1">
              이미지 모델
            </span>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              {allModels?.image.map((m, i) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors
                    ${i < (allModels.image.length - 1) ? "border-b border-neutral-100" : ""}`}
                >
                  <Checkbox
                    checked={selectedIds.has(m.id)}
                    onChange={() => handleToggle(m.id)}
                  />
                  <span className="text-xs text-neutral-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-100 shrink-0">
          <Button size="sm" variant="sub2" className="px-5" onClick={() => setModelAccessModal(false)}>
            취소
          </Button>
          <Button size="sm" variant="main" className="px-5" onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModelAccessModal;
