import Modal from "@/component/common/feedback/modal";
import { CheckIcon } from "lucide-react";

const ResetSuccessModal = ({ resetSuccess, setResetSuccess }) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={resetSuccess}
          title="비밀번호 초기화 요청 완료"
          description={
            <div className="flex flex-col">
              <span>현재 관리자 승인 대기 중이며</span>
              <span>관리자 승인 후 임시 비밀번호를 받으실 수 있습니다.</span>
            </div>
          }
          onClose={() => setResetSuccess(false)}
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

export default ResetSuccessModal;
