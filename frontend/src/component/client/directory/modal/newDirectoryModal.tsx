import Modal from "@/component/common/feedback/modal";
import Checkbox from "@/component/common/form/checkbox";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { DirectoryProps } from "@/types/admin/directory";
import { UserDirectoryProps } from "@/types/client/directory";
import { FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DirectorySuccessModal from "./directorySuccessModal";

const NewDirectoryModal = ({ newDirectory, setNewDirectory }) => {
  const queryClient = useQueryClient();
  const { data: directories } = useGet<DirectoryProps[]>(
    "api/directory/user_directory_list",
    ["directories"],
  );

  const { data: userDirectoryDatas } = useGet<UserDirectoryProps[]>(
    "api/user/get_user_directory",
    ["userDirectoryDatas"],
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (userDirectoryDatas) {
      const userIds = new Set(
        userDirectoryDatas
          .filter(
            (item) =>
              item.id !== 1 &&
              item.status != "rejected" &&
              item.status != "revoked",
          )
          .map((item) => item.id),
      );

      setInitialIds(userIds);
      setSelectedIds(new Set(userIds));
    }
  }, [userDirectoryDatas]);

  const handleToggle = (directory_id: number) => {
    if (initialIds.has(directory_id)) return;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(directory_id)) {
        newSet.delete(directory_id);
      } else {
        newSet.add(directory_id);
      }

      return newSet;
    });
  };

  const [requestSuccess, setRequestSuccess] = useState<boolean>(false);
  const requestDirectoryMutation = usePost("api/user/request_directory");
  const requestDirectory = () => {
    const newSelectedIds = Array.from(selectedIds).filter(
      (id) => !initialIds.has(id),
    );

    requestDirectoryMutation.mutate(
      {
        selectedIds: newSelectedIds,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["directories"] });
          queryClient.invalidateQueries({ queryKey: ["userDirectoryDatas"] });
          setRequestSuccess(true);
        },
      },
    );
  };
  return (
    <>
      <div className="z-20">
        <Modal
          buttonCount={2}
          open={newDirectory}
          title="디렉토리 추가 요청"
          description={
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span>업무에 필요한 디렉토리를 선택해주세요.</span>
                <span>관리자 승인 후 접근 가능합니다.</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-3 text-sm max-h-[84px] overflow-y-auto border p-3 px-3 rounded-xl">
                {directories &&
                  directories
                    .filter((directory) => directory.id !== 1)
                    .map((directory) => (
                      <div
                        key={directory.id}
                        className="flex items-center gap-3 h-8"
                      >
                        <Checkbox
                          checked={selectedIds.has(directory.id)}
                          disabled={initialIds.has(directory.id)}
                          onChange={() => handleToggle(directory.id)}
                        />
                        {directory.name}
                      </div>
                    ))}
              </div>
            </div>
          }
          onClose={() => setNewDirectory(false)}
          onPrimary={() => requestDirectory()}
          icon={
            <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
              <FolderIcon className="text-iconMain w-4 h-4" />
            </div>
          }
        />
      </div>
      <DirectorySuccessModal
        requestSuccess={requestSuccess}
        setRequestSuccess={setRequestSuccess}
        setNewDirectory={setNewDirectory}
      />
    </>
  );
};

export default NewDirectoryModal;
