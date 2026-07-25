import copyIcon from "@/assets/admin/copy.svg";
import Button from "@/component/common/form/button";

const NewPasswordModal = ({ newPassword, setNewPasswordModal }) => {
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };
  return (
    <div className="fixed w-full h-full inset-0 z-50 flex items-center justify-center bg-black/30 font-medium">
      <div className="w-[440px] bg-white rounded-xl">
        <div className="h-[50px] flex items-center p-3 px-5 bg-[#FBFBFB] font-semibold rounded-t-xl">
          <span>임시 비밀번호 발급 완료</span>
        </div>
        <div className="border-t border-b px-5 p-3 flex flex-col gap-2 font-medium">
          <span>임시 비밀번호</span>
          <div className="flex border bg-[#FBFBFB] w-full p-2 px-3 justify-between rounded-xl items-center">
            <span>{newPassword}</span>
            <button
              className="flex flex-row gap-1 bg-[#E2E2E2] text-sm font-normal px-3 p-1 items-center rounded-md"
              onClick={() => copyPassword()}
            >
              <img src={copyIcon} alt="" className="w-4 h-4" />
              <span>복사</span>
            </button>
          </div>
          <div className="flex flex-col font-medium text-[#707070] text-sm py-3">
            <span>해당 비밀번호는 현재 화면에서만 확인할 수 있으며 </span>
            <span>화면을 닫으면 다시 확인할 수 없습니다.</span>
          </div>
        </div>
        <div className="h-[50px] flex items-center p-3 px-5 bg-[#FBFBFB] font-medium rounded-b-xl justify-end">
          <Button size="sm" onClick={() => setNewPasswordModal(false)}>
            <span>확인</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewPasswordModal;
