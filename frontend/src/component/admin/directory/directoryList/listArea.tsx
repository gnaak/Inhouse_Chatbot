import Button from "@/component/common/form/button";
import DirectoryList from "./list";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import Modal from "@/component/common/feedback/modal";
import Loading from "@/component/common/loading";

const DirectoryListArea = ({
  directories,
  editTarget,
  setEditTarget,
  setIsEdit,
  setSavedDirectory,
  isNew,
  setIsNew,
  setIsLoading,
  defaultProps,
}) => {
  const chatbotURL = typeof window !== "undefined" ? window.location.origin + "/" : "/";
  const [unsavedAddModalOpen, setUnsavedAddModalOpen] =
    useState<boolean>(false);

  const directoryList = directories
    ? isNew
      ? [...directories, { id: 0, name: "새 디렉토리" }]
      : directories
    : [];

  const addChatbot = () => {
    if (isNew) {
      setUnsavedAddModalOpen(true);
      return;
    }

    setEditTarget(0);
    setIsEdit(true);
    setIsNew(true);
    setSavedDirectory(defaultProps);
  };

  const openEditModal = (id: number) => {
    if (isNew && id !== 0) {
      setIsNew(false);
    }

    setIsEdit(true);
    setEditTarget(id);

    if (id === 0) setSavedDirectory(defaultProps);
  };

  if (!directories) {
    return (
      <div className="flex flex-col h-full w-1/4 border shadow-md rounded-xl py-4 px-4 gap-4 text-sm pb-0">
        <Loading />
      </div>
    );
  }
  return (
    <>
      <div className="shrink-0 flex flex-col h-full w-1/4 border shadow-md rounded-xl py-4 gap-4 text-sm pb-0">
        <div className="flex flex-col gap-3 px-4">
          <span className="font-semibold">챗봇 URL</span>
          <div className="flex flex-row justify-between gap-3 items-center">
            <div className="flex-1 border px-3 py-2 rounded-lg w-4/5">
              <span className="block truncate">{chatbotURL}</span>
            </div>
            <Button
              size="sm"
              className="h-[30px]"
              onClick={() => window.open(chatbotURL, "_blank")}
            >
              <span className="text-xs">이동</span>
            </Button>
          </div>
        </div>
        <DirectoryList
          directoryList={directoryList}
          openEditModal={openEditModal}
          editTarget={editTarget}
          setIsLoading={setIsLoading}
        />
        <div className="flex w-full items-center justify-end px-4">
          <Button
            size="sm"
            full={true}
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={() => addChatbot()}
            className="!py-3"
          >
            <span className="text-xs">추가</span>
          </Button>
        </div>
        {unsavedAddModalOpen && (
          <Modal
            open={unsavedAddModalOpen}
            buttonCount={1}
            title="새 디렉토리 추가 안내"
            description={
              "현재 편집 중인 임시 항목이 있습니다.\n저장을 완료하고 새로 추가해주세요."
            }
            primaryText="확인"
            onPrimary={() => setUnsavedAddModalOpen(false)}
            onClose={() => setUnsavedAddModalOpen(false)}
          />
        )}
      </div>
    </>
  );
};
export default DirectoryListArea;
