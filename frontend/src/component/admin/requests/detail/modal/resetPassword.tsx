import Modal from "@/component/common/feedback/modal";

import { KeyRoundIcon } from "lucide-react";

const ResetPassWordModal = ({
  resetPassword,
  resetPasswordModal,
  setResetPasswordModal,
}) => {
  return (
    <>
      <Modal
        buttonCount={2}
        open={resetPasswordModal}
        title="임시 비밀번호 발급"
        description={
          <div className="flex flex-col items-center justify-center font-normal text-sm">
            <span>발급된 임시 번호는 1회만 표시됩니다.</span>
            <span>확인 후 안전한 곳에 보관해주세요.</span>
            <span>발급된 비밀번호를 입력하면 로그인할 수 있습니다.</span>
          </div>
        }
        onPrimary={() => resetPassword()}
        onClose={() => setResetPasswordModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <KeyRoundIcon className="text-iconMain" />
          </div>
        }
      />
    </>
  );
};

export default ResetPassWordModal;
