import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DownloadIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  Search,
  SendIcon,
  XIcon,
} from "lucide-react";
import { baseURL, useGet } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";

interface GalleryItem {
  id: number;
  log_id: number;
  session: string;
  prompt: string;
  image_url: string;
  version: string | null;
  created_at: string;
}

interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 30;

const ClientGallery = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [editText, setEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editImageSrc, setEditImageSrc] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useGet<GalleryResponse>(
    `api/log/my_images?limit=${limit}&offset=0`,
    ["myImages", limit],
  );

  const items = useMemo(() => {
    if (!data?.items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter(
      (it) =>
        it.prompt.toLowerCase().includes(q) ||
        (it.version ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  const total = data?.total ?? 0;
  const hasMore = (data?.items?.length ?? 0) < total;

  const handleDownload = async (imageUrl: string, filename = "image.png") => {
    try {
      let blob: Blob;
      if (imageUrl.startsWith("data:")) {
        blob = await (await fetch(imageUrl)).blob();
      } else {
        // /media 경로는 StaticFiles 라 CORS 미적용 → 다운로드 전용 엔드포인트 사용
        const res = await fetch(
          `${baseURL}/api/image/download?path=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("[gallery] download failed", e);
    }
  };

  const handleEdit = async () => {
    if (!previewItem || !editText.trim() || isEditing) return;
    setIsEditing(true);
    setEditImageSrc(null);
    try {
      const res = await fetch(`${baseURL}/api/image/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          image_url: previewItem.image_url,
          prompt: editText.trim(),
          session: previewItem.session,
          model: previewItem.version ?? "gpt-image-1",
        }),
      });
      if (!res.ok || !res.body) throw new Error("edit request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.data) setEditImageSrc(`data:image/png;base64,${event.data}`);
            if (event.error) console.error("[edit error]", event.error);
            if (event.saved) queryClient.invalidateQueries({ queryKey: ["myImages"] });
          } catch {}
        }
      }
      setEditText("");
    } catch (e) {
      console.error("[gallery] edit failed", e);
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query]);

  useEffect(() => {
    if (previewItem) {
      setEditImageSrc(null);
      setEditText("");
    }
  }, [previewItem]);

  return (
    <div className="flex flex-col w-full h-full text-textMain">
      <div className="w-full h-full max-w-5xl mx-auto px-6 md:px-10 py-6 flex flex-col gap-5 min-h-0">
        {/* 헤더 */}
        <div className="flex items-end justify-between gap-3 shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-neutral-800">
              이미지 갤러리
            </h1>
            <p className="hidden md:inline text-xs text-neutral-500">
              지금까지 생성한 이미지 {total > 0 && `(${total}장)`}을 한눈에 모아
              볼 수 있어요.
            </p>
          </div>
          <button
            onClick={() => navigate("/image")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-main hover:bg-main-hover active:bg-main-active text-white dark:bg-neutral-200 dark:hover:bg-neutral-100 dark:active:bg-neutral-300 dark:text-neutral-900 text-xs font-medium transition-colors shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />새 이미지
          </button>
        </div>

        {/* 검색 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border rounded-xl bg-white focus-within:border-neutral-500 transition-colors shrink-0">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프롬프트 또는 모델로 검색"
            className="flex-1 text-xs outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400"
          />
        </div>

        {/* 본문 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-xs text-neutral-400">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500">
                {query.trim()
                  ? "검색 결과가 없어요."
                  : "아직 생성한 이미지가 없어요."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setPreviewItem(it)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 hover:opacity-95 transition-opacity"
                    title={it.prompt}
                  >
                    <img
                      src={
                        it.image_url.startsWith("data:")
                          ? it.image_url
                          : `${it.image_url}`
                      }
                      alt={it.prompt}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="line-clamp-2 text-[11px] text-white">
                        {it.prompt}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-6 pb-2">
                  <button
                    onClick={() => setLimit((v) => v + PAGE_SIZE)}
                    disabled={isFetching}
                    className="px-4 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-xs text-neutral-700 disabled:opacity-60 transition-colors"
                  >
                    {isFetching ? "불러오는 중..." : "더 보기"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 프리뷰 모달 */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setPreviewItem(null);
            setEditImageSrc(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단: 프롬프트 + 액션 */}
            <div className="px-5 py-4 border-b border-neutral-100 flex flex-col gap-2 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-neutral-800 leading-relaxed flex-1 min-w-0">
                  {previewItem.prompt}
                </p>
                <button
                  onClick={() => {
                    setPreviewItem(null);
                    setEditImageSrc(null);
                  }}
                  className="shrink-0 w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-neutral-400">
                  {previewItem.version ?? "—"} ·{" "}
                  {new Date(previewItem.created_at).toLocaleString("ko-KR")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleDownload(
                        previewItem.image_url,
                        `image_${previewItem.id}.png`,
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-neutral-50 text-xs text-neutral-700 transition-colors"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    다운로드
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/image/${previewItem.session}`);
                      setPreviewItem(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-main hover:bg-main-hover text-white text-xs font-medium transition-colors"
                  >
                    세션 열기
                  </button>
                </div>
              </div>
            </div>

            {/* 이미지 */}
            <div className="flex-1 min-h-0 bg-neutral-50 flex items-center justify-center p-5 overflow-hidden relative">
              <img
                src={
                  editImageSrc ??
                  (previewItem.image_url.startsWith("data:")
                    ? previewItem.image_url
                    : previewItem.image_url)
                }
                alt={previewItem.prompt}
                className={`max-w-full max-h-full object-contain transition-opacity ${
                  isEditing ? "opacity-40" : "opacity-100"
                }`}
              />
              {isEditing && (
                <div className="absolute flex flex-col items-center gap-2 text-neutral-500">
                  <Loader2Icon className="w-6 h-6 animate-spin" />
                  <span className="text-xs">편집 중...</span>
                </div>
              )}
            </div>

            {/* 하단: 편집 입력 */}
            <div className="px-4 py-3 border-t border-neutral-100 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-xl bg-white focus-within:border-neutral-500 transition-colors">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit();
                    }
                  }}
                  placeholder="이미지를 어떻게 바꿀까요?"
                  disabled={isEditing}
                  className="flex-1 text-xs outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400 disabled:opacity-50"
                />
                <button
                  onClick={handleEdit}
                  disabled={isEditing || !editText.trim()}
                  className="shrink-0 w-7 h-7 bg-main hover:bg-main-hover disabled:bg-neutral-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  {isEditing ? (
                    <Loader2Icon className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <SendIcon className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGallery;
