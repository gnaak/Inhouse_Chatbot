import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CpuIcon,
  ImageIcon,
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useGet, usePost } from "@/hooks/common/useAPI";

type ModelKind = "chat" | "image";

interface Pricing {
  input?: number;
  output?: number;
  per_image?: number;
}

interface DiscoveredModel {
  id: number;
  value: string;
  label: string;
  pricing: Pricing | null;
  registered: boolean;
}

interface ProviderBlock {
  provider: string;
  label: string;
  chat: DiscoveredModel[];
  image: DiscoveredModel[];
  error?: string;
}

const formatChatPricing = (p: Pricing | null) => {
  if (!p || p.input == null || p.output == null) return "—";
  return `$${p.input.toFixed(2)} / $${p.output.toFixed(2)} (1M tokens)`;
};

const formatImagePricing = (p: Pricing | null) => {
  if (!p || p.per_image == null) return "—";
  return `$${p.per_image.toFixed(3)} / image`;
};

const AdminModels = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGet<ProviderBlock[]>(
    "api/models/catalog",
    ["models-catalog"],
  );

  const refreshMutation = usePost<void, { added: number; updated: number; catalog: ProviderBlock[] }>(
    "api/models/refresh",
  );
  const setActiveMutation = usePost<
    { value: string; active: boolean },
    { value: string; active: boolean }
  >("api/models/set_active");

  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [refreshModal, setRefreshModal] = useState<{
    added: number;
    updated: number;
    catalog: ProviderBlock[];
  } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapsed = (provider: string) => {
    setCollapsed((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const patchRegistered = (value: string, registered: boolean) => {
    queryClient.setQueryData<ProviderBlock[]>(["models-catalog"], (old) =>
      old?.map((p) => ({
        ...p,
        chat: p.chat.map((m) =>
          m.value === value ? { ...m, registered } : m,
        ),
        image: p.image.map((m) =>
          m.value === value ? { ...m, registered } : m,
        ),
      })),
    );
  };

  const handleToggle = (m: DiscoveredModel) => {
    setPendingValue(m.value);
    const next = !m.registered;
    setActiveMutation.mutate(
      { value: m.value, active: next },
      {
        onSuccess: () => {
          patchRegistered(m.value, next);
          queryClient.invalidateQueries({ queryKey: ["models-chat"] });
          queryClient.invalidateQueries({ queryKey: ["models-image"] });
        },
        onSettled: () => setPendingValue(null),
      },
    );
  };

  const handleRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: (res) => {
        setRefreshModal({ added: res.added, updated: res.updated, catalog: res.catalog });
      },
    });
  };

  const totals = useMemo(() => {
    if (!data) return { chat: 0, image: 0, registered: 0 };
    let chat = 0;
    let image = 0;
    let registered = 0;
    for (const p of data) {
      chat += p.chat.length;
      image += p.image.length;
      registered +=
        p.chat.filter((m) => m.registered).length +
        p.image.filter((m) => m.registered).length;
    }
    return { chat, image, registered };
  }, [data]);

  const isRefreshing = refreshMutation.isPending;

  return (
    <div className="flex flex-col w-full h-full text-textMain">
      <div className="w-full max-w-5xl mx-auto px-2 py-4 flex flex-col gap-5 flex-1 min-h-0">
        {/* 헤더 */}
        <div className="flex items-end justify-between gap-3 shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-neutral-800">
              AI 모델 관리
            </h1>
            <p className="text-xs text-neutral-500">
              저장된 모델 카탈로그를 보여줍니다. 새 모델이 출시됐는지 확인하려면
              우측의 새로고침 버튼을 누르세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span className="text-[11px] text-neutral-400">
                chat {totals.chat} · image {totals.image} · 등록{" "}
                {totals.registered}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-neutral-50 text-xs text-neutral-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCwIcon
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "조회 중..." : "새로고침"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-xs text-neutral-400">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              카탈로그를 불러오는 중...
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <CpuIcon className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500">
                카탈로그가 비어있어요. 우측 상단의{" "}
                <span className="font-medium">새로고침</span> 버튼을 눌러
                모델을 가져오세요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {data.map((provider) => (
                <ProviderSection
                  key={provider.provider}
                  provider={provider}
                  onToggle={handleToggle}
                  pendingValue={pendingValue}
                  collapsed={!!collapsed[provider.provider]}
                  onToggleCollapsed={() => toggleCollapsed(provider.provider)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 새로고침 결과 모달 */}
      {refreshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[680px] bg-white rounded-2xl shadow-sm border border-neutral-200/80 flex flex-col">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-neutral-800">
                  모델 조회 결과
                </span>
                <span className="text-xs text-neutral-500">
                  새 모델 {refreshModal.added}개 추가 · 기존 {refreshModal.updated}개 정보 갱신
                </span>
              </div>
              <button
                onClick={() => setRefreshModal(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto py-4 px-5 space-y-4">
              {refreshModal.catalog.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-10">
                  조회된 모델이 없습니다.
                </p>
              ) : (
                refreshModal.catalog.map((provider) => (
                  <ReadOnlyProviderSection key={provider.provider} provider={provider} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── 읽기 전용 프로바이더 섹션 (모달용) ── */
const ReadOnlyProviderSection = ({ provider }: { provider: ProviderBlock }) => {
  const [collapsed, setCollapsed] = useState(false);
  const total = provider.chat.length + provider.image.length;
  if (total === 0) return null;
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={`shrink-0 w-full px-4 py-3 bg-neutral-50 flex items-center justify-between gap-2 hover:bg-neutral-100 transition-colors ${collapsed ? "" : "border-b border-neutral-100"}`}
      >
        <div className="flex items-center gap-2">
          <CpuIcon className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-xs font-semibold text-neutral-700">{provider.label}</span>
          <span className="text-[11px] text-neutral-400">{total}개</span>
        </div>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>
      {!collapsed && (
        <>
          {provider.chat.length > 0 && (
            <ReadOnlyModelGroup kind="chat" models={provider.chat} />
          )}
          {provider.image.length > 0 && (
            <ReadOnlyModelGroup kind="image" models={provider.image} />
          )}
        </>
      )}
    </div>
  );
};

const ReadOnlyModelGroup = ({ kind, models }: { kind: ModelKind; models: DiscoveredModel[] }) => (
  <div>
    <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
      {kind === "chat" ? <MessageSquareIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
      {kind}
    </div>
    {models.map((m) => (
      <div key={m.value} className="px-4 py-2.5 flex items-center gap-3 border-t border-neutral-100">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-800 truncate">{m.label}</span>
            {m.registered && (
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                <CheckCircle2Icon className="w-3 h-3" />
                사용 중
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-400 font-mono truncate">{m.value}</span>
        </div>
      </div>
    ))}
  </div>
);

/* ── 기존 토글 가능한 섹션 (메인 페이지용) ── */
interface ProviderSectionProps {
  provider: ProviderBlock;
  onToggle: (m: DiscoveredModel) => void;
  pendingValue: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const ProviderSection = ({
  provider,
  onToggle,
  pendingValue,
  collapsed,
  onToggleCollapsed,
}: ProviderSectionProps) => {
  const total = provider.chat.length + provider.image.length;
  const registered =
    provider.chat.filter((m) => m.registered).length +
    provider.image.filter((m) => m.registered).length;

  return (
    <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={`w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors ${collapsed ? "" : "border-b border-neutral-100"}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <CpuIcon className="w-4 h-4 text-neutral-600" />
          </div>
          <h2 className="text-sm font-semibold text-neutral-800">
            {provider.label}
          </h2>
          <span className="text-[11px] text-neutral-400">
            {total}개 · 등록 {registered}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {provider.error && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-500">
              <AlertCircleIcon className="w-3.5 h-3.5" />
              {provider.error}
            </div>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          />
        </div>
      </button>

      {!collapsed && (
        <>
          <ModelGroup
            kind="chat"
            models={provider.chat}
            onToggle={onToggle}
            pendingValue={pendingValue}
          />
          {provider.image.length > 0 && (
            <ModelGroup
              kind="image"
              models={provider.image}
              onToggle={onToggle}
              pendingValue={pendingValue}
            />
          )}
        </>
      )}
    </section>
  );
};

interface ModelGroupProps {
  kind: ModelKind;
  models: DiscoveredModel[];
  onToggle: (m: DiscoveredModel) => void;
  pendingValue: string | null;
}

const ModelGroup = ({ kind, models, onToggle, pendingValue }: ModelGroupProps) => {
  if (models.length === 0) return null;
  return (
    <div>
      <div className="px-5 pt-4 pb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {kind === "chat" ? (
          <MessageSquareIcon className="w-3 h-3" />
        ) : (
          <ImageIcon className="w-3 h-3" />
        )}
        {kind}
      </div>
      <div className="flex flex-col">
        {models.map((m) => (
          <ModelRow
            key={m.value}
            model={m}
            kind={kind}
            onToggle={onToggle}
            pending={pendingValue === m.value}
          />
        ))}
      </div>
    </div>
  );
};

interface ModelRowProps {
  model: DiscoveredModel;
  kind: ModelKind;
  onToggle: (m: DiscoveredModel) => void;
  pending: boolean;
}

const ModelRow = ({ model, kind, onToggle, pending }: ModelRowProps) => {
  const pricing =
    kind === "chat"
      ? formatChatPricing(model.pricing)
      : formatImagePricing(model.pricing);

  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3 border-t border-neutral-100">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-800 truncate">
            {model.label}
          </span>
          {model.registered && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
              <CheckCircle2Icon className="w-3 h-3" />
              사용 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="font-mono truncate">{model.value}</span>
          <span className="text-neutral-300">·</span>
          <span>{pricing}</span>
        </div>
      </div>
      <button
        onClick={() => onToggle(model)}
        disabled={pending}
        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60
          ${model.registered
            ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            : "bg-main hover:bg-main-hover active:bg-main-active text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:text-neutral-900"
          }`}
      >
        {pending ? "처리 중..." : model.registered ? "사용 해제" : "사용 설정"}
      </button>
    </div>
  );
};

export default AdminModels;
