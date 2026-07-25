import Modal from "@/component/common/feedback/modal";
import copyIcon from "@/assets/admin/copy.svg";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import CopyPasswordModal from "./copyPassword";

const NewPasswordModal = ({
  newPassword,
  newPasswordModal,
  setNewPasswordModal,
}) => {
  const [copyPassword, setCopyPassword] = useState<boolean>(false);
  const copyNewPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopyPassword(true);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };
  return (
    <>
      <Modal
        buttonCount={1}
        open={newPasswordModal}
        title="임시 비밀번호 발급 완료"
        closeOnOverlay={false}
        description={
          <div className="flex flex-col gap-2 font-medium items-start">
            <span className="font-normal">임시 비밀번호</span>
            <div className="flex border bg-[#FBFBFB] w-[320px] p-2 px-3 justify-between rounded-xl items-center">
              <span>{newPassword}</span>
              <button
                className="flex flex-row gap-1 bg-[#E2E2E2] text-sm font-normal px-3 p-1 items-center rounded-md"
                onClick={() => copyNewPassword()}
              >
                <img src={copyIcon} alt="" className="w-4 h-4" />
                <span>복사</span>
              </button>
            </div>
            <div className="flex flex-col items-start text-errorColor text-xs pt-3">
              <span>해당 비밀번호는 현재 화면에서만 확인할 수 있으며 </span>
              <span>화면을 닫으면 다시 확인하실 수 없습니다.</span>
            </div>
          </div>
        }
        onClose={() => setNewPasswordModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <CheckIcon className="text-iconMain" />
          </div>
        }
      />
      <CopyPasswordModal
        copyPassword={copyPassword}
        setCopyPassword={setCopyPassword}
        setNewPasswordModal={setNewPasswordModal}
      />
    </>
  );
};

export default NewPasswordModal;
