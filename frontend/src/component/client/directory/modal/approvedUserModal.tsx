import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";
import { usePost } from "@/hooks/common/useAPI";
import { useNavigate } from "react-router-dom";

const UnapprovedUserModal = ({ unapprovedUser }) => {
  const navigate = useNavigate();
  const logoutMutation = usePost<void, void>("api/auth/logout");
  const handleUnapproved = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };
  return (
    <>
      <div className="z-20">
        <Modal
          buttonCount={1}
          open={unapprovedUser}
          title="계정 상태 변경"
          description={
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span>계정 상태가 변경되어 현재 서비스 이용이 제한됩니다.</span>
                <span>자세한 사항은 관리자에게 문의해 주세요.</span>
              </div>
            </div>
          }
          onPrimary={() => handleUnapproved()}
          icon={
            <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
              <img src={warningIcon} alt="" />
            </div>
          }
        />
      </div>
    </>
  );
};

export default UnapprovedUserModal;
