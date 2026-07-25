import Button from "@/component/common/form/button";
import { baseURL } from "@/hooks/common/useAPI";
import { formatDateTimeWithSeconds } from "@/utils/format/date";
import {
  CalendarIcon,
  FolderIcon,
  SparklesIcon,
  UserIcon,
  FileIcon,
} from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  normalizeEmphasis,
  convertThinkMarkers,
  normalizeToolBlocks,
} from "@/utils/format/markdown";

const TYPE_LABEL: Record<string, string> = {
  외부: "외부용",
  이미지: "이미지",
};

const getTypeLabel = (directoryName: string) =>
  TYPE_LABEL[directoryName] ?? "내부용";

const isModelType = (directoryName: string) =>
  directoryName === "외부" || directoryName === "이미지";

const LogDetailModal = ({ detailTarget, detailData, setIsDetailModal }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[720px] max-h-[85vh] bg-white rounded-2xl shadow-sm border border-neutral-200/80 flex flex-col">
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-neutral-100 shrink-0">
          <span className="text-sm font-semibold text-neutral-800">
            상세 기록
          </span>
        </div>

        {/* 메타 정보 */}
        <div className="px-5 py-4 border-b border-neutral-100 flex flex-col gap-3 shrink-0">
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-28 shrink-0">
              <CalendarIcon className="text-neutral-400 w-4 h-4" />
              <span className="text-sm text-neutral-500">일시</span>
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {formatDateTimeWithSeconds(detailTarget.created_at)}
            </span>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-28 shrink-0">
              <UserIcon className="text-neutral-400 w-4 h-4" />
              <span className="text-sm text-neutral-500">사용자</span>
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {detailTarget.user_name}
            </span>
            <span className="text-sm text-neutral-400 ml-1.5">
              ({detailTarget.user_email})
            </span>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-28 shrink-0">
              <FolderIcon className="text-neutral-400 w-4 h-4" />
              <span className="text-sm text-neutral-500">사용 유형</span>
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {getTypeLabel(detailTarget.directory_name)}
            </span>
          </div>
          {isModelType(detailTarget.directory_name) ? (
            <div className="flex items-center">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <SparklesIcon className="text-neutral-400 w-4 h-4" />
                <span className="text-sm text-neutral-500">모델</span>
              </div>
              <span className="text-sm font-medium text-neutral-800">
                {detailTarget.version}
              </span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <FolderIcon className="text-neutral-400 w-4 h-4" />
                <span className="text-sm text-neutral-500">디렉토리</span>
              </div>
              <span className="text-sm font-medium text-neutral-800">
                {detailTarget.directory_name}
              </span>
            </div>
          )}
        </div>

        {/* 대화 내용 */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
          {detailData &&
            detailData.map((detail, idx) => {
              if (detail.type === "model_change") {
                return (
                  <div key={idx} className="px-5">
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-neutral-200" />
                      <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                        {detail.version} 변경
                      </span>
                      <div className="flex-1 h-px bg-neutral-200" />
                    </div>
                  </div>
                );
              }
              const isImage = detailTarget.directory_name === "이미지";
              return (
                <div key={idx} className="px-5">
                  {isImage ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 overflow-hidden px-3 py-3">
                      <div className="flex flex-col gap-1.5 ">
                        <span className="text-sm font-medium text-neutral-400">
                          프롬프트
                        </span>
                        <div className="p-2 bg-iconCircle rounded-md w-full flex items-center border">
                          <span className="text-sm text-neutral-700">
                            {detail.question}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 border w-full rounded-md text-xs text-neutral-700 markdown-log-body">
                        <img
                          src={`${detail.answer}`}
                          alt=""
                          className="w-full rounded-md"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="flex gap-3">
                        <div className="flex py-2">
                          <span className="text-sm font-medium text-neutral-500 shrink-0 w-8">
                            질문
                          </span>
                        </div>
                        <div className="p-2 bg-iconCircle rounded-md w-full flex flex-col gap-2 border">
                          {(() => {
                            const parseList = (s?: string) => {
                              if (!s) return [];
                              try { const p = JSON.parse(s); return Array.isArray(p) ? p.map(String) : [String(p)]; } catch { return [s]; }
                            };
                            if (detail.image_key) {
                              const keys = parseList(detail.image_key);
                              const types = parseList(detail.image_media_type);
                              const imageItems: React.ReactNode[] = [];
                              const chipItems: React.ReactNode[] = [];
                              keys.forEach((key, i) => {
                                const mt = types[i] ?? "image/jpeg";
                                if (mt.startsWith("image/")) {
                                  imageItems.push(
                                    <div key={i} className="h-40 flex items-center justify-center bg-neutral-100 rounded-lg overflow-hidden">
                                      <img src={`${baseURL}/api/chat/file?key=${key}`} alt="첨부 이미지" className="h-full w-auto object-contain" />
                                    </div>
                                  );
                                } else if (mt === "application/pdf") {
                                  chipItems.push(
                                    <div key={i} className="flex items-center gap-1.5 text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                      <FileIcon className="w-3 h-3 shrink-0" />
                                      <span>PDF 첨부</span>
                                    </div>
                                  );
                                } else {
                                  chipItems.push(
                                    <a key={i} href={`${baseURL}/api/chat/file?key=${key}`} download={key.split("/").pop()} className="flex items-center gap-1.5 text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full hover:bg-neutral-200 transition-colors">
                                      <FileIcon className="w-3 h-3 shrink-0" />
                                      <span className="truncate max-w-[200px]">{key.split("/").pop()}</span>
                                    </a>
                                  );
                                }
                              });
                              return (
                                <>
                                  {imageItems.length > 0 && <div className="flex flex-row flex-wrap gap-2">{imageItems}</div>}
                                  {chipItems.length > 0 && <div className="flex flex-row flex-wrap gap-1.5">{chipItems}</div>}
                                </>
                              );
                            }
                            if (detail.image_base64 && detail.image_media_type) {
                              return detail.image_media_type === "application/pdf" ? (
                                <div className="flex flex-row flex-wrap gap-1.5">
                                  <div className="flex items-center gap-1.5 text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                    <FileIcon className="w-3 h-3 shrink-0" />
                                    <span>PDF 첨부</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-row flex-wrap gap-2">
                                  <div className="h-40 flex items-center justify-center bg-neutral-100 rounded-lg overflow-hidden">
                                    <img src={`data:${detail.image_media_type};base64,${detail.image_base64}`} alt="첨부 이미지" className="h-full w-auto object-contain" />
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {detail.question && (
                            <span className="text-sm text-neutral-700">
                              {detail.question}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex py-2">
                          <span className="text-sm font-medium text-neutral-500 shrink-0 w-8">
                            답변
                          </span>
                        </div>
                        <div className="p-2 border w-full rounded-md text-sm text-neutral-700 markdown-log-body">
                          <ReactMarkdown
                            remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {normalizeToolBlocks(
                              convertThinkMarkers(
                                normalizeEmphasis(detail.answer),
                              ),
                            ).replace(/__BACKEND__/g, baseURL)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end px-5 py-3 border-t border-neutral-100 shrink-0">
          <Button
            size="sm"
            variant="sub2"
            className="px-8"
            onClick={() => setIsDetailModal(false)}
          >
            <span>닫기</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal;
