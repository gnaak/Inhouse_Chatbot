import Modal from "@/component/common/feedback/modal";

const LoginErrorModal = ({ errorModal, setErrorModal, warningIcon }) => {
  return (
    <>
      <Modal
        buttonCount={1}
        open={errorModal}
        title="로그인 오류"
        description="이메일 또는 비밀번호 정보가 일치하지 않습니다."
        onClose={() => setErrorModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <img src={warningIcon} alt="" />
          </div>
        }
      />
    </>
  );
};

export default LoginErrorModal;
