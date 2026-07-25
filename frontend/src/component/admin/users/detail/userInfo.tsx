import { usePost } from "@/hooks/common/useAPI";
import { useEffect, useState } from "react";
import { user_detail_options } from "@/options/admin/options";
import SelectBox from "./selectbox";
import { useQueryClient } from "@tanstack/react-query";
import ResetPassWordModal from "./modal/resetPassword";
import NewPasswordModal from "./modal/newPassword";
import SignInRequestModal from "./modal/signInRequestModal";
import { RequestDetail } from "@/types/admin/user";
import { UserIcon } from "lucide-react";

const DetailUserInfo = ({ targetInfo }) => {
  const queryClient = useQueryClient();
  const [isPassword, setIsPassword] = useState<boolean>(false);
  const [isSignIn, setIsSignIn] = useState<boolean>(false);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [signInRequest, setSignInRequest] = useState<RequestDetail | null>(
    null,
  );

  useEffect(() => {
    const passwordRequest = targetInfo?.request_list?.find(
      (req) => req.type === "password",
    );

    const signinRequest = targetInfo?.request_list?.find(
      (req) => req.type === "signin",
    );

    setIsPassword(!!passwordRequest);
    setIsSignIn(!!signinRequest);
    setSignInRequest(signinRequest || null);
    setOriginalStatus(targetInfo?.status);
  }, [targetInfo]);

  const [newPassword, setNewPassword] = useState<string>("");
  const resetMutation = usePost<{ user_id: number }, string>(
    "api/auth/reset_password",
  );
  const [resetPasswordModal, setResetPasswordModal] = useState<boolean>(false);
  const [newPasswordModal, setNewPasswordModal] = useState<boolean>(false);
  const resetPassword = () => {
    resetMutation.mutate(
      {
        user_id: targetInfo.id,
      },
      {
        onSuccess: (data) => {
          setNewPassword(data);
          setNewPasswordModal(true);
          setResetPasswordModal(false);
          setIsPassword(false);
          queryClient.invalidateQueries({ queryKey: ["userDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestNumber"] });
        },
      },
    );
  };

  const [signInRequestModal, setSignInRequestModal] = useState<boolean>(false);

  const userStatusMutation = usePost("api/auth/update_user_status");
  const handleUserStatus = (value: string | number) => {
    if (isSignIn && originalStatus == "waiting" && value == "approved") {
      setSignInRequestModal(true);
      return;
    }
    userStatusMutation.mutate(
      {
        user_id: targetInfo.id,
        status: value,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["userDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestNumber"] });
        },
      },
    );
  };

  return (
    <>
      <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <UserIcon className="w-4.5 h-4.5 text-neutral-600" />
          </div>
          <div className="flex-1 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-neutral-800">
              기본 정보
            </h2>
            {isPassword && (
              <button
                className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                onClick={() => setResetPasswordModal(true)}
              >
                비밀번호 초기화
              </button>
            )}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center py-3 border-b border-neutral-100">
            <span className="w-24 text-sm text-neutral-500 shrink-0">
              사용자
            </span>
            <span className="text-sm font-medium text-neutral-800">
              {targetInfo?.name}
            </span>
          </div>
          <div className="flex items-center py-3 border-b border-neutral-100">
            <span className="w-24 text-sm text-neutral-500 shrink-0">
              이메일
            </span>
            <span className="text-sm font-medium text-neutral-800">
              {targetInfo?.email}
            </span>
          </div>
          <div className="flex items-center py-3 border-b border-neutral-100">
            <span className="w-24 text-sm text-neutral-500 shrink-0">조직</span>
            <span className="text-sm font-medium text-neutral-800">
              {targetInfo?.department_full_name}
            </span>
          </div>
          <div className="flex items-center py-3">
            <span className="w-24 text-sm text-neutral-500 shrink-0">
              계정 상태
            </span>
            <SelectBox
              options={user_detail_options}
              value={targetInfo?.status}
              onChange={(val) => handleUserStatus(val)}
              className="!w-[140px]"
            />
          </div>
        </div>
      </section>
      <ResetPassWordModal
        resetPassword={resetPassword}
        resetPasswordModal={resetPasswordModal}
        setResetPasswordModal={setResetPasswordModal}
      />
      <NewPasswordModal
        newPassword={newPassword}
        newPasswordModal={newPasswordModal}
        setNewPasswordModal={setNewPasswordModal}
      />
      <SignInRequestModal
        signInRequest={signInRequest}
        signInRequestModal={signInRequestModal}
        setSignInRequestModal={setSignInRequestModal}
        user_id={targetInfo?.id}
      />
    </>
  );
};

export default DetailUserInfo;
