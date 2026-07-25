import Modal from "@/component/common/feedback/modal";
import InputBox from "@/component/common/form/inputbox";
import { usePost } from "@/hooks/common/useAPI";
import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";

const ResetPasswordModal = ({
  resetPassword,
  setResetPassword,
  setNotFoundEmail,
  setRequestExists,
  setResetSuccess,
}) => {
  const [email, setEmail] = useState<string>("");
  const resetMutation = usePost("api/user/request_reset_password");

  const handleReset = () => {
    resetMutation.mutate(
      {
        email: email,
      },
      {
        onSuccess: () => {
          setResetSuccess(true);
          setResetPassword(false);
        },
        onError: (data) => {
          if (data.status == 404) {
            setNotFoundEmail(true);
          } else if (data.status == 409) {
            setRequestExists(true);
          }
        },
      },
    );
  };

  return (
    <>
      <Modal
        buttonCount={1}
        open={resetPassword}
        title="비밀번호 재설정 요청"
        primaryFull={true}
        primaryText="비밀번호 초기화"
        onPrimary={handleReset}
        primaryDisabled={!email}
        description={
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-sm">비밀번호를 잊으신 경우</span>
                <span className="text-sm">
                  이메일을 입력 후 비밀번호 초기화를 눌러주세요.
                </span>
                <span className="text-sm">
                  관리자에게 임시 비밀번호 발급 요청이 전송됩니다.
                </span>
              </div>
              <div className="flex flex-col gap-1 items-start mt-2">
                <span className="text-sm text-inputHeader">이메일</span>
                <InputBox
                  type="email"
                  className="text-textMain"
                  value={email}
                  placeholder="이메일을 입력해주세요"
                  onChange={(value) => setEmail(value)}
                />
              </div>
            </div>
          </>
        }
        onClose={() => setResetPassword(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <KeyRoundIcon className="text-iconMain" />
          </div>
        }
      />
    </>
  );
};

export default ResetPasswordModal;
