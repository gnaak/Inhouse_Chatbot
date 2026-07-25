import Modal from "@/component/common/feedback/modal";

const RequestExistsModal = ({
  requestExists,
  setRequestExists,
  warningIcon,
}) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={requestExists}
          title="요청 중복"
          description={
            <div className="flex flex-col">
              <span>비밀번호 초기화 요청이 이미 접수되었습니다.</span>
              <span>처리 후 이용해주세요.</span>
            </div>
          }
          onClose={() => setRequestExists(false)}
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

export default RequestExistsModal;
