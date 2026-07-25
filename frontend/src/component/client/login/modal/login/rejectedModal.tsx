import Modal from "@/component/common/feedback/modal";

const RejectedModal = ({ rejected, setRejected, warningIcon }) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={rejected}
          title="계정 승인 반려"
          description={
            <div className="flex flex-col">
              <span className="text-sm">회원 가입 신청이 반려되었습니다.</span>
              <span className="text-sm">다시 신청해주세요.</span>
            </div>
          }
          onClose={() => setRejected(false)}
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

export default RejectedModal;
