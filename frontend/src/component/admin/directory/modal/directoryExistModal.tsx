import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";

const DirectoryExistModal = ({ directoryExist, setDirectoryExist }) => {
  return (
    <>
      <div className="z-50">
        <Modal
          buttonCount={1}
          open={directoryExist}
          title="디렉토리명 중복"
          description={
            <div className="flex flex-col">
              <span className="text-sm">이미 사용중인 디렉토리명입니다.</span>
              <span className="text-sm">다른 디렉토리명으로 생성해주세요.</span>
            </div>
          }
          onClose={() => setDirectoryExist(false)}
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

export default DirectoryExistModal;
