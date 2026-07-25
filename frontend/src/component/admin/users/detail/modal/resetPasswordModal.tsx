import Button from "@/component/common/form/button";

const ResetPasswordModal = ({ resetPassword, setResetPasswordModal }) => {
  return (
    <div className="fixed w-full h-full inset-0 z-50 flex items-center justify-center bg-black/30 font-medium">
      <div className="w-[440px] bg-white rounded-xl">
        <div className="h-[50px]  flex items-center p-3 px-5 bg-[#FBFBFB] font-semibold rounded-t-xl">
          <span>비밀번호 초기화</span>
        </div>
        <div className="border-t border-b px-5 p-5 flex flex-col justify-center items-center gap-2">
          <span>임시 비밀번호 발급</span>
          <div className="flex flex-col items-center justify-center font-normal text-sm">
            <span>발급된 임시 번호는 1회만 표시됩니다.</span>
            <span>확인 후 안전한 곳에 보관해주세요.</span>
            <span>발급된 비밀번호를 입력하면 로그인할 수 있습니다.</span>
          </div>
        </div>
        <div className="h-[50px] flex items-center gap-3 p-3 px-5 bg-[#FBFBFB] font-medium rounded-b-xl justify-end">
          <Button
            variant="sub2"
            size="sm"
            onClick={() => setResetPasswordModal(false)}
          >
            <span>취소</span>
          </Button>
          <Button size="sm" onClick={() => resetPassword()}>
            <span>임시 비밀번호 발급하기</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
