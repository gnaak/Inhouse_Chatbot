import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";

const ChangePasswordErrorModal = ({
  changePasswordError,
  setChangePasswordError,
}) => {
  return (
    <>
      <Modal
        buttonCount={1}
        open={changePasswordError}
        title="비밀번호 오류"
        description="비밀번호 정보가 일치하지 않습니다."
        onClose={() => setChangePasswordError(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <img src={warningIcon} alt="" />
          </div>
        }
      />
    </>
  );
};

export default ChangePasswordErrorModal;
