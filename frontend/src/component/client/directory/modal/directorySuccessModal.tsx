import Modal from "@/component/common/feedback/modal";
import { CheckIcon } from "lucide-react";

const DirectorySuccessModal = ({
  requestSuccess,
  setRequestSuccess,
  setNewDirectory,
}) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={requestSuccess}
          title="디렉토리 권한 요청 완료"
          description={
            <div className="flex flex-col">
              <span>현재 관리자 승인 대기 중이며</span>
              <span>관리자 승인 후 서비스 이용이 가능합니다.</span>
            </div>
          }
          onClose={() => {
            setRequestSuccess(false);
            setNewDirectory(false);
          }}
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

export default DirectorySuccessModal;
