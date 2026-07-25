import Modal from "@/component/common/feedback/modal";
import { CheckIcon } from "lucide-react";

const CopyPasswordModal = ({
  copyPassword,
  setCopyPassword,
  setNewPasswordModal,
}) => {
  return (
    <>
      <Modal
        buttonCount={1}
        open={copyPassword}
        title="복사 성공"
        description={
          <div className="flex flex-col gap-2 font-medium">
            <span>임시 비밀번호를 복사했습니다.</span>
          </div>
        }
        onClose={() => {
          setCopyPassword(false);
          setNewPasswordModal(false);
        }}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <CheckIcon className="text-iconMain" />
          </div>
        }
      />
    </>
  );
};

export default CopyPasswordModal;
