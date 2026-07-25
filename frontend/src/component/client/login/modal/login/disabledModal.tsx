import Modal from "@/component/common/feedback/modal";

const DisabledModal = ({ disabled, setDisabled, warningIcon }) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={disabled}
          title="비활성화된 계정"
          description={
            <div className="flex flex-col">
              <span className="text-sm">비활성화된 계정입니다.</span>
            </div>
          }
          onClose={() => setDisabled(false)}
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

export default DisabledModal;
