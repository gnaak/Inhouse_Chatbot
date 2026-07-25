import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";

export type RecentLog = {
  id: number;
  session: string;
  directory_id: number | null;
  directory_name: string;
  title: string;
  log_type: string;
  updated_at: string;
};

interface Props {
  log: RecentLog;
}

const RecentLogItem = ({ log }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ sessionId?: string; imageSessionId?: string }>();
  const isActive = params.sessionId === log.session || params.imageSessionId === log.session;
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(log.title);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const renameMutation = usePost<
    { log_id: number; title: string },
    { id: number; title: string }
  >("api/log/my_rename");
  const deleteMutation = usePost<{ log_id: number }, { id: number }>(
    "api/log/my_delete",
  );

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
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 120 });
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
          if (isActive) navigate("/");
        },
      },
    );
  };

  return (
    <div className="group relative">
      <button
        onClick={() => navigate(log.log_type === "image" ? `/image/${log.session}` : `/c/${log.session}`)}
        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 min-w-0
          ${isActive
            ? "bg-neutral-100 text-neutral-900"
            : "hover:bg-neutral-50"
          }`}
        title={log.title}
      >
        <span className={`flex-1 min-w-0 truncate text-xs ${isActive ? "text-neutral-900 font-medium" : "text-neutral-700"}`}>
          {log.title}
        </span>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 max-w-[80px] truncate group-hover:opacity-0 transition-opacity">
          {log.log_type === 'image' ? '이미지' : (log.directory_id == null ? "외부" : log.directory_name)}
        </span>
      </button>

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen) setMenuOpen(false);
            else openMenu();
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-opacity
            ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <MoreHorizontalIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed bg-white border rounded-lg shadow-lg overflow-hidden min-w-[120px] z-[100]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
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
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
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
                  채팅의 모든 메시지가 영구적으로 삭제돼요. 이 작업은 되돌릴
                  수 없어요.
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

export default RecentLogItem;
