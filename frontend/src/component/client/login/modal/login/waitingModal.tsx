import Modal from "@/component/common/feedback/modal";

const WaitingModal = ({ waiting, setWaiting, warningIcon }) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={waiting}
          title="계정 승인 대기중"
          description={
            <div className="flex flex-col">
              <span>입력하신 이메일 계정은 승인 대기 상태입니다.</span>
              <span>관리자 승인 후 로그인 가능합니다.</span>
            </div>
          }
          onClose={() => setWaiting(false)}
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

export default WaitingModal;
