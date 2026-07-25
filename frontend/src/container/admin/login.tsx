import InputBox from "@/component/common/form/inputbox";
import { useEffect, useState } from "react";
import { usePost } from "@/hooks/common/useAPI";
import { useNavigate } from "react-router-dom";
import Modal from "@/component/common/feedback/modal";
import { LoginRequest, LoginResponse } from "@/types/login";
import shieldIcon from "@/assets/admin/shield.svg";
import idIcon from "@/assets/admin/id.svg";
import passwordIcon from "@/assets/admin/password.svg";
import warningIcon from "@/assets/admin/warning.svg";
import Button from "@/component/common/form/button";
import { parseUserInfo, refreshExp } from "@/hooks/common/getCookie";

const AdminLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = parseUserInfo("admin");
    if (user || refreshExp("admin")) navigate("/admin", { replace: true });
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorModal, setErrorModal] = useState(false);

  const loginMutation = usePost<LoginRequest, LoginResponse>("api/auth/login");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { email, password, type: "admin" },
      {
        onSuccess: () => {
          navigate("/admin");
        },
        onError: () => {
          setErrorModal(true);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-adminMain text-textMain flex items-center justify-center px-4">
      {/* 카드 */}
      <div className="flex items-center justify-center flex-col rounded-lg bg-white border py-10 px-12 shadow-xl gap-3">
        <div className="bg-iconMain rounded-md w-16 h-16 flex items-center justify-center">
          <img src={shieldIcon} alt="" />
        </div>
        <div className="flex flex-col items-center ">
          <span>관리자 로그인</span>
          <span className="text-iconMain text-sm">
            관리자 계정으로 로그인하세요
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-inputHeader">아이디</span>
            {/* 이메일 */}
            <InputBox
              type="text"
              value={email}
              placeholder="관리자 아이디를 입력하세요"
              onChange={(val) => setEmail(val)}
              size="md"
              full={false}
              width={320}
              rightIcon={<img src={idIcon} alt="" />}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-inputHeader">비밀번호</span>
            {/* 비밀번호 */}
            <InputBox
              type="password"
              value={password}
              placeholder="비밀번호를 입력하세요"
              onChange={(val) => setPassword(val)}
              size="md"
              rightIcon={<img src={passwordIcon} alt="" />}
              full={false}
              width={320}
            />
          </div>

          {/* 버튼 */}
          <Button
            full={true}
            variant="main"
            className="px-8 text-sm"
            onClick={onSubmit}
            disabled={!email || !password}
          >
            로그인
          </Button>
        </form>
      </div>
      <Modal
        buttonCount={1}
        open={errorModal}
        title="로그인 오류"
        description="아이디 또는 비밀번호 정보가 일치하지 않습니다."
        onClose={() => setErrorModal(false)}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <img src={warningIcon} alt="" />
          </div>
        }
      />
    </div>
  );
};

export default AdminLogin;
