import Modal from "@/component/common/feedback/modal";
import { usePost } from "@/hooks/common/useAPI";
import { useAuth } from "@/hooks/common/useAuth";
import { CheckIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChangePasswordSuccessModal = ({ changePasswordSuccess }) => {
  const { setUser } = useAuth();
  const logoutMutation = usePost<void, void>("api/auth/logout");
  const navigate = useNavigate();
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        navigate("/login");
      },
    });
  };

  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={changePasswordSuccess}
          title="비밀번호 변경 완료"
          description={
            <div className="flex flex-col">
              <span>비밀번호가 변경되었습니다.</span>
              <span>보안을 위해 자동으로 로그아웃 됩니다.</span>
              <span>변경된 비밀번호로 다시 로그인해 주세요.</span>
            </div>
          }
          onClose={() => handleLogout()}
          icon={
            <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
              <CheckIcon className="text-iconMain" />
            </div>
          }
        />
      </div>
    </>
  );
};

export default ChangePasswordSuccessModal;
