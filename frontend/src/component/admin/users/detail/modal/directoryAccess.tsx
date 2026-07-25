import Modal from "@/component/common/feedback/modal";
import Checkbox from "@/component/common/form/checkbox";
import Loading from "@/component/common/loading";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { DirectoryProps } from "@/types/admin/directory";
import { useQueryClient } from "@tanstack/react-query";
import { FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";

const DirectoryAccessModal = ({
  targetInfo,
  directoryAccessModal,
  setDirectoryAccessModal,
}) => {
  const { data: directories, isLoading } = useGet<DirectoryProps[]>(
    "api/directory/directory_list",
    ["directories"],
  );
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialApprovedIds, setInitialApprovedIds] = useState<Set<number>>(
    new Set(),
  );
  const isWaiting = targetInfo.status == "waiting";
  useEffect(() => {
    if (!directories || !targetInfo?.directory_list) return;

    const initialApproved = new Set<number>(
      targetInfo.directory_list
        .filter((r) => r.status === "approved")
        .map((r) => r.directory_id),
    );

    setInitialApprovedIds(initialApproved);
    setSelectedIds(initialApproved);
  }, [directories, targetInfo]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      return newSet;
    });
  };

  const requestedIds = new Set(
    targetInfo?.directory_list
      ?.filter((r) => r.status === "waiting")
      .map((r) => r.directory_id),
  );

  const saveUserDirectoryMutation = usePost("api/auth/update_user_directory");
  const saveUserDirectory = () => {
    saveUserDirectoryMutation.mutate(
      {
        user_id: targetInfo.id,
        selectedIds: Array.from(selectedIds),
        requestedIds: Array.from(requestedIds),
        waiting: isWaiting,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["userDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestNumber"] });
          setDirectoryAccessModal(false);
        },
      },
    );
  };
  return (
    <>
      {isLoading && <Loading />}
      <Modal
        buttonCount={2}
        open={directoryAccessModal}
        title="디렉토리 접근 권한 설정"
        description={
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-row text-neutral-600">
              <span>사용자:</span>
              <span>&nbsp;{targetInfo?.name}</span>
              <span className="font-normal">&nbsp;({targetInfo?.email})</span>
            </div>
            <span>
              해당 사용자에게 접근 권한을 부여할 디렉토리를 선택해주세요.
            </span>
            <div className="flex border border-neutral-200 p-3 rounded-xl flex-col gap-2 max-h-[156px] overflow-y-auto text-sm bg-neutral-50">
              <div className="flex flex-row gap-3 items-center font-normal">
                <Checkbox checked={true} />
                <div className="flex flex-row items-center">
                  <span>공용</span>
                  <span className="text-sm font-bold">&nbsp;(필수)</span>
                </div>
              </div>
              {directories &&
                directories
                  .filter((directory) => directory.id != 1)
                  .sort((a, b) => {
                    const aRequested = requestedIds.has(a.id);
                    const bRequested = requestedIds.has(b.id);

                    // 요청된 것 먼저
                    if (aRequested && !bRequested) return -1;
                    if (!aRequested && bRequested) return 1;

                    return 0;
                  })
                  .map((directory) => {
                    const isRequested = requestedIds.has(directory.id);
                    return (
                      <div
                        key={directory.id}
                        className="flex flex-row gap-3 items-center font-normal"
                      >
                        <Checkbox
                          checked={selectedIds.has(directory.id)}
                          onChange={() => handleToggle(directory.id)}
                        />{" "}
                        <div>
                          <span>{directory.name}</span>
                          {isRequested && (
                            <span className="text-sm font-bold text-red-500">
                              &nbsp;(요청)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
            {isWaiting && (
              <div className="flex flex-col text-xs items-start text-errorColor">
                <span>
                  * 해당 사용자 계정은 <strong>승인 대기</strong>
                  &nbsp;상태입니다.
                </span>
                <span>
                  * 접근 권한을 부여하면 자동으로 <strong>승인 완료</strong>
                  &nbsp;상태로 변경됩니다.
                </span>
              </div>
            )}
          </div>
        }
        onPrimary={() => saveUserDirectory()}
        onClose={() => setDirectoryAccessModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <FolderIcon className="text-iconMain" />
          </div>
        }
      />
    </>
  );
};

export default DirectoryAccessModal;
