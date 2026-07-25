import { usePost } from "@/hooks/common/useAPI";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ResetPassWordModal from "./modal/resetPassword";
import NewPasswordModal from "./modal/newPassword";
import { USER_STATUSMAP } from "@/mapping/admin/map";
import { UserIcon } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  waiting: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  disabled: "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

const DetailUserInfo = ({ targetInfo }) => {
  const queryClient = useQueryClient();

  const [newPassword, setNewPassword] = useState<string>("");
  const resetMutation = usePost<{ user_id: number }, string>(
    "api/auth/reset_password",
  );
  const [isPassword, setIsPassword] = useState<boolean>(false);

  useEffect(() => {
    setIsPassword(targetInfo?.type === "password");
  }, [targetInfo?.type]);

  const [resetPasswordModal, setResetPasswordModal] = useState<boolean>(false);
  const [newPasswordModal, setNewPasswordModal] = useState<boolean>(false);
  const resetPassword = () => {
    resetMutation.mutate(
      { user_id: targetInfo.user_id },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["requestDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestNumber"] });
          setNewPassword(data);
          setNewPasswordModal(true);
          setResetPasswordModal(false);
          setIsPassword(false);
        },
      },
    );
  };

  const status = targetInfo?.user_status as string | undefined;

  return (
    <>
      <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <UserIcon className="w-4 h-4 text-neutral-600" />
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
            {status ? (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  STATUS_BADGE[status] ??
                  "bg-neutral-100 text-neutral-500 border border-neutral-200"
                }`}
              >
                {USER_STATUSMAP[status] ?? status}
              </span>
            ) : (
              <span className="text-sm text-neutral-400">-</span>
            )}
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
    </>
  );
};

export default DetailUserInfo;
