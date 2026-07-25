import Modal from "@/component/common/feedback/modal";

const EmailNotFoundModal = ({
  notFoundEmail,
  setNotFoundEmail,
  warningIcon,
}) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={notFoundEmail}
          title="이메일 오류"
          description="입력하신 이메일 정보를 찾을 수 없습니다."
          onClose={() => setNotFoundEmail(false)}
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

export default EmailNotFoundModal;
