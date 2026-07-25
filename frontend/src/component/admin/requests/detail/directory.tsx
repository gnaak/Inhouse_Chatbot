import { formatDateTime } from "@/utils/format/date";
import { useState } from "react";
import DirectoryAccessModal from "./modal/directoryAccess";
import { FolderCheckIcon, FolderIcon } from "lucide-react";

const DetailDirectory = ({ targetInfo }) => {
  const [directoryAccessModal, setDirectoryAccessModal] =
    useState<boolean>(false);
  const [isHandled, setIsHandled] = useState<boolean>(false);

  const requestList = !isHandled ? targetInfo?.directories ?? [] : [];
  const approvedList = (targetInfo?.user_directories ?? []).slice().sort(
    (a: any, b: any) => {
      if (a.directory_id === 1) return -1;
      if (b.directory_id === 1) return 1;
      return 0;
    },
  );

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-row gap-4 flex-1 min-h-0">
          {/* 요청 디렉토리 */}
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <FolderIcon className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                요청 디렉토리
              </span>
            </div>
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="flex flex-row text-sm text-neutral-500 bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 shrink-0 font-medium">
                <div className="w-1/3">디렉토리명</div>
                <div className="w-1/3">상태</div>
                <div className="w-1/3">요청 시간</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {requestList.length > 0 ? (
                  requestList.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-row px-4 py-3 text-sm border-b border-neutral-100 last:border-0"
                    >
                      <div className="w-1/3 font-medium text-neutral-800 truncate">
                        {r.directory_name}
                      </div>
                      <div className="w-1/3 text-neutral-600">처리 대기</div>
                      <div className="w-1/3 text-neutral-500">
                        {formatDateTime(targetInfo.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                    요청한 디렉토리가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 접근 가능 디렉토리 */}
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <FolderCheckIcon className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">
                접근 가능 디렉토리
              </span>
            </div>
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-neutral-200 overflow-hidden">
              <div className="flex flex-row text-sm text-neutral-500 bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 shrink-0 font-medium">
                <div className="w-1/3">디렉토리명</div>
                <div className="w-1/3">상태</div>
                <div className="w-1/3">적용 시간</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {approvedList.length > 0 ? (
                  approvedList.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-row px-4 py-3 text-sm border-b border-neutral-100 last:border-0"
                    >
                      <div className="w-1/3 font-medium text-neutral-800 truncate">
                        {r.directory_name}
                      </div>
                      <div className="w-1/3 text-neutral-600">처리 완료</div>
                      <div className="w-1/3 text-neutral-500">
                        {formatDateTime(r.approved_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-neutral-400">
                    사용 가능한 디렉토리가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {targetInfo?.type !== "password" && (
          <div className="shrink-0 flex justify-end border-t border-neutral-100 pt-3">
            <button
              className="text-sm px-4 py-2 rounded-lg bg-adminBlue text-white hover:opacity-90 font-medium transition-opacity"
              onClick={() => setDirectoryAccessModal(true)}
            >
              요청 관리
            </button>
          </div>
        )}
      </div>
      <DirectoryAccessModal
        targetInfo={targetInfo}
        directoryAccessModal={directoryAccessModal}
        setDirectoryAccessModal={setDirectoryAccessModal}
        setIsHandled={setIsHandled}
      />
    </>
  );
};

export default DetailDirectory;
