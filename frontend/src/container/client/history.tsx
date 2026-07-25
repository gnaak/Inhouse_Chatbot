import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import Calendar, { RangeValue } from "@/component/common/form/calendar";
import {
  Building2Icon,
  CheckIcon,
  ImageIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Search,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";
import { RecentLog } from "@/component/client/sideBar/recentLogItem";

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "방금 전";
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;

  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ClientHistory = () => {
  const navigate = useNavigate();
  const params = useParams<{ sessionId?: string }>();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(200);
  const [category, setCategory] = useState<
    "all" | "internal" | "external" | "image"
  >("all");
  const [range, setRange] = useState<RangeValue>({ start: null, end: null });

  const categoryOf = (
    log: RecentLog,
  ): "internal" | "external" | "image" => {
    if (log.log_type === "image") return "image";
    if (log.directory_id == null) return "external";
    return "internal";
  };

  const renameMutation = usePost<
    { log_id: number; title: string },
    { id: number; title: string }
  >("api/log/my_rename");
  const deleteMutation = usePost<{ log_id: number }, { id: number }>(
    "api/log/my_delete",
  );

  const dateParams = useMemo(() => {
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const p = new URLSearchParams({ limit: String(fetchLimit) });
    if (range.start) p.set("start_date", fmt(range.start));
    if (range.end) p.set("end_date", fmt(range.end));
    return p.toString();
  }, [fetchLimit, range]);

  const { data: recentLogs, isFetching } = useGet<RecentLog[]>(
    `api/log/my_recent?${dateParams}`,
    ["recentLogs", fetchLimit, range.start?.toISOString() ?? "", range.end?.toISOString() ?? ""],
  );

  const filtered = useMemo(() => {
    if (!recentLogs) return [];
    const q = query.trim().toLowerCase();
    return recentLogs.filter((log) => {
      if (category !== "all" && categoryOf(log) !== category) return false;
      if (!q) return true;
      return (
        log.title.toLowerCase().includes(q) ||
        (log.directory_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [recentLogs, query, category]);

  const counts = useMemo(() => {
    const acc = { all: 0, internal: 0, external: 0, image: 0 };
    if (recentLogs) {
      acc.all = recentLogs.length;
      for (const log of recentLogs) acc[categoryOf(log)] += 1;
    }
    return acc;
  }, [recentLogs]);

  const hasMore = (recentLogs?.length ?? 0) >= fetchLimit;
  const displayed = filtered;

  const groupedLogs = useMemo(() => {
    if (!displayed.length) return [] as { label: string; items: RecentLog[] }[];
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7d = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOf30d = startOfToday - 30 * 24 * 60 * 60 * 1000;

    const buckets: { label: string; items: RecentLog[] }[] = [
      { label: "오늘", items: [] },
      { label: "어제", items: [] },
      { label: "지난 7일", items: [] },
      { label: "지난 30일", items: [] },
      { label: "이전", items: [] },
    ];

    for (const log of displayed) {
      const ts = new Date(log.updated_at).getTime();
      if (ts >= startOfToday) buckets[0].items.push(log);
      else if (ts >= startOfYesterday) buckets[1].items.push(log);
      else if (ts >= startOf7d) buckets[2].items.push(log);
      else if (ts >= startOf30d) buckets[3].items.push(log);
      else buckets[4].items.push(log);
    }

    return buckets.filter((b) => b.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    setFetchLimit(200);
  }, [query, category, range]);

  const visibleIds = useMemo(() => displayed.map((l) => l.id), [displayed]);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve) =>
            deleteMutation.mutate(
              { log_id: id },
              { onSettled: () => resolve() },
            ),
          ),
      ),
    );
    queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  return (
    <div className="flex flex-col w-full h-full text-textMain overflow-y-auto">
      <div className="w-full h-full max-w-3xl mx-auto px-6 md:px-10 py-6 flex flex-col gap-5">
        {/* 헤더 */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-neutral-800">
              최근 채팅
            </h1>
            <p className="hidden md:inline text-xs text-neutral-500">
              지금까지 나눈 대화를 한곳에서 확인하고 관리할 수 있어요.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-main hover:bg-main-hover active:bg-main-active text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:active:bg-neutral-300 dark:text-neutral-900 text-xs font-medium transition-colors shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />새 채팅
          </button>
        </div>

        {/* 검색바 / 선택 액션바 */}
        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-neutral-300 bg-neutral-50">
            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium text-neutral-700">
                {selectedIds.size}개 선택됨
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                {allSelected ? "전체 해제" : "전체 선택"}
              </button>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
              >
                <Trash2Icon className="w-3.5 h-3.5" />
                삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 border rounded-xl bg-white focus-within:border-neutral-500 transition-colors">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="채팅 검색"
                className="flex-1 text-xs outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            {/* 날짜 범위 + 카테고리 필터 */}
            <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="flex flex-row gap-1.5 flex-wrap">
              {(
                [
                  { key: "all", label: "전체", icon: MessageSquareIcon },
                  { key: "internal", label: "내부용", icon: Building2Icon },
                  { key: "external", label: "외부용", icon: SparklesIcon },
                  { key: "image", label: "이미지", icon: ImageIcon },
                ] as const
              ).map((c) => {
                const active = category === c.key;
                const count = counts[c.key];
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${active
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-200 dark:text-neutral-900 dark:border-neutral-200"
                        : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {c.label}
                    <span
                      className={`text-[10px] ${active ? "text-white/70 dark:text-neutral-500" : "text-neutral-400"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              </div>
              <Calendar
                value={range}
                onChange={(v) => setRange(v)}
                size="sm"
                position="bottom"
              />
            </div>
          </div>
        )}

        {/* 본문 */}
        {!recentLogs ? (
          <div className="flex flex-col items-center gap-2 py-16 text-xs text-neutral-400">
            불러오는 중...
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <MessageSquareIcon className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500">
              {query.trim()
                ? "검색 결과가 없어요."
                : "아직 채팅 기록이 없어요."}
            </p>
          </div>
        ) : (
          <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex-1 overflow-y-auto">
              {groupedLogs.map((group, idx) => (
                <div key={group.label}>
                  {idx > 0 && <div className="border-t border-neutral-100" />}
                  <div className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    {group.label}
                  </div>
                  <div className="flex flex-col pb-2">
                    {group.items.map((log) => (
                      <HistoryRow
                        key={log.id}
                        log={log}
                        isActive={params.sessionId === log.session}
                        isSelected={selectedIds.has(log.id)}
                        hasSelection={selectedIds.size > 0}
                        onToggleSelect={() => toggleSelect(log.id)}
                        onOpen={() => navigate(`/c/${log.session}`)}
                        renameMutation={renameMutation}
                        deleteMutation={deleteMutation}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="border-t border-neutral-100 px-5 py-3">
                <button
                  onClick={() => setFetchLimit((prev) => prev + 200)}
                  disabled={isFetching}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-50 transition-colors"
                >
                  {isFetching ? "불러오는 중..." : "더보기"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {bulkDeleteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40"
            onClick={() => setBulkDeleteOpen(false)}
          >
            <div
              className="w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2 flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-neutral-900">
                  선택한 채팅을 삭제할까요?
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  <span className="font-medium text-neutral-700">
                    {selectedIds.size}개
                  </span>
                  의 채팅이 영구적으로 삭제돼요. 이 작업은 되돌릴 수 없어요.
                </p>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => setBulkDeleteOpen(false)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

interface HistoryRowProps {
  log: RecentLog;
  isActive: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  renameMutation: ReturnType<
    typeof usePost<
      { log_id: number; title: string },
      { id: number; title: string }
    >
  >;
  deleteMutation: ReturnType<
    typeof usePost<{ log_id: number }, { id: number }>
  >;
}

const HistoryRow = ({
  log,
  isActive,
  isSelected,
  hasSelection,
  onToggleSelect,
  onOpen,
  renameMutation,
  deleteMutation,
}: HistoryRowProps) => {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(log.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMenu = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
    setMenuOpen(true);
  };

  const commitRename = () => {
    const next = titleInput.trim();
    if (!next || next === log.title) {
      setRenaming(false);
      setTitleInput(log.title);
      return;
    }
    renameMutation.mutate(
      { log_id: log.id, title: next },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
          setRenaming(false);
        },
      },
    );
  };

  const cancelRename = () => {
    setRenaming(false);
    setTitleInput(log.title);
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { log_id: log.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["recentLogs"] });
          setConfirmDelete(false);
        },
      },
    );
  };

  const handleRowClick = () => {
    if (hasSelection) {
      onToggleSelect();
    } else {
      onOpen();
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-3 pl-5 pr-3 py-2.5 cursor-pointer transition-colors
        ${
          isSelected
            ? "bg-neutral-100"
            : isActive
              ? "bg-neutral-50"
              : "hover:bg-neutral-50"
        }`}
      onClick={handleRowClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all
          ${
            isSelected
              ? "bg-neutral-900 border-neutral-900"
              : `border-neutral-300 bg-white ${hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`
          }`}
      >
        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5" title={log.title}>
        <span
          className={`truncate text-xs ${isActive ? "font-medium text-neutral-900" : "text-neutral-800"}`}
        >
          {log.title}
        </span>
        <span className="text-[11px] text-neutral-400">
          {formatRelative(log.updated_at)}
        </span>
      </div>

      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 max-w-[110px] truncate group-hover:opacity-0 transition-opacity">
        {log.log_type === "image" ? "이미지" : log.directory_id == null ? "외부" : log.directory_name}
      </span>

      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (menuOpen) setMenuOpen(false);
          else openMenu();
        }}
        className={`absolute right-3 w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-opacity
          ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <MoreHorizontalIcon className="w-3.5 h-3.5" />
      </button>

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed bg-white border rounded-lg shadow-lg overflow-hidden min-w-[140px] z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                setTitleInput(log.title);
                setRenaming(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left"
            >
              <PencilIcon className="w-3.5 h-3.5 shrink-0" />
              <span>이름 변경</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 text-left"
            >
              <Trash2Icon className="w-3.5 h-3.5 shrink-0" />
              <span>삭제</span>
            </button>
          </div>,
          document.body,
        )}

      {renaming &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40"
            onClick={cancelRename}
          >
            <div
              className="w-[400px] max-w-[92vw] bg-white rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2 flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-neutral-900">
                  채팅 이름 변경
                </h3>
                <p className="text-sm text-neutral-500">
                  이 채팅에 표시될 이름을 입력해주세요.
                </p>
              </div>
              <div className="px-6 py-3">
                <input
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value.slice(0, 200))}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      cancelRename();
                    }
                  }}
                  placeholder="채팅 이름"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-transparent focus:outline-none focus:border-neutral-500 text-neutral-800"
                />
                <div className="mt-1 text-[11px] text-neutral-400 text-right">
                  {titleInput.length}/200
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={cancelRename}
                  disabled={renameMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={commitRename}
                  disabled={
                    renameMutation.isPending ||
                    !titleInput.trim() ||
                    titleInput.trim() === log.title
                  }
                  className="px-4 py-2 rounded-lg bg-main hover:bg-main-hover active:bg-main-active text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:active:bg-neutral-300 dark:text-neutral-900 text-xs font-medium disabled:opacity-60 transition-colors"
                >
                  {renameMutation.isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {confirmDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40"
            onClick={() => setConfirmDelete(false)}
          >
            <div
              className="w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2 flex flex-col gap-1.5">
                <h3 className="text-base font-semibold text-neutral-900">
                  채팅을 삭제할까요?
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  <span className="font-medium text-neutral-700">
                    {log.title}
                  </span>{" "}
                  채팅의 모든 메시지가 영구적으로 삭제돼요. 이 작업은 되돌릴 수
                  없어요.
                </p>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ClientHistory;
