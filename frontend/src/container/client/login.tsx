import InputBox from "@/component/common/form/inputbox";
import { useState } from "react";
import { usePost } from "@/hooks/common/useAPI";
import { useNavigate } from "react-router-dom";
import { LoginRequest, LoginResponse } from "@/types/login";
import shieldIcon from "@/assets/admin/shield.svg";
import idIcon from "@/assets/admin/id.svg";
import passwordIcon from "@/assets/admin/password.svg";
import warningIcon from "@/assets/admin/warning.svg";
import LoginErrorModal from "@/component/client/login/modal/login/loginErrorModal";
import RegisterModal from "@/component/client/login/modal/register/registerModal";
import EmailNotFoundModal from "@/component/client/login/modal/resetPassword/emailNotFoundModal";
import RequestExistsModal from "@/component/client/login/modal/resetPassword/requestExistModal";
import WaitingModal from "@/component/client/login/modal/login/waitingModal";
import RegisterSuccessModal from "@/component/client/login/modal/register/registerSuccessModal";
import ResetPasswordModal from "@/component/client/login/modal/resetPassword/resetPasswordModal";
import RejectedModal from "@/component/client/login/modal/login/rejectedModal";
import Button from "@/component/common/form/button";
import ResetSuccessModal from "@/component/client/login/modal/resetPassword/resetSuccessModal";
import DisabledModal from "@/component/client/login/modal/login/disabledModal";
import { parseUserInfo, refreshExp } from "@/hooks/common/getCookie";
import { useAuth } from "@/hooks/common/useAuth";
import ThemeToggle from "@/component/common/themeToggle";
import { useEffect } from "react";

const ClientLogin = () => {
  const { user, isLoading, setUser } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (user || refreshExp()) navigate("/", { replace: true });
  }, [isLoading, user]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [register, setRegister] = useState<boolean>(false);
  const [registerSuccess, setRegisterSuccess] = useState<boolean>(false);

  const [resetPassword, setResetPassword] = useState<boolean>(false);
  const [notFoundEmail, setNotFoundEmail] = useState<boolean>(false);
  const [requestExists, setRequestExists] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const [errorModal, setErrorModal] = useState(false);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [rejected, setRejected] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);

  const loginMutation = usePost<LoginRequest, LoginResponse>("api/auth/login");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { email, password, type: "user" },
      {
        onSuccess: () => {
          const userInfo = parseUserInfo();
          setUser(userInfo ?? null);
          navigate("/");
        },
        onError: (data) => {
          if (data.status == 404) {
            setErrorModal(true);
          } else if (data.status == 403) {
            if (data.message.includes("waiting")) {
              setWaiting(true);
            } else if (data.message.includes("rejected")) {
              setRejected(true);
            } else if (data.message.includes("disabled")) {
              setDisabled(true);
            }
          }
        },
      },
    );
  };

  return (
    <div className="h-[100dvh] bg-clientMain dark:bg-neutral-950 flex items-center justify-center text-textMain dark:text-neutral-100 relative">
      <div className="absolute top-4 right-4 md:top-5 md:right-8 z-10">
        <ThemeToggle />
      </div>
      {/* 카드 */}
      <div className="flex items-center justify-center flex-col md:rounded-lg bg-white dark:bg-neutral-900 md:border dark:border-neutral-700 py-5 w-full md:w-fit h-full md:h-fit md:py-10 px-6 md:px-12 shadow-md gap-3">
        <div className="flex flex-col gap-3 items-center justify-center">
          <div className="bg-iconMain rounded-md w-16 h-16 flex items-center justify-center">
            <img src={shieldIcon} alt="" />
          </div>
          <div className="flex flex-col items-center ">
            <span className="text-neutral-900 dark:text-neutral-100">로그인</span>
            <span className="text-iconMain dark:text-neutral-400 text-sm">
              직원 계정으로 로그인하세요
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-inputHeader dark:text-neutral-300">이메일</span>
            {/* 이메일 */}
            <InputBox
              type="email"
              value={email}
              placeholder="example@company.com"
              onChange={(val) => setEmail(val)}
              size="md"
              full={false}
              width={320}
              rightIcon={<img src={idIcon} alt="" />}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-inputHeader dark:text-neutral-300">비밀번호</span>
            {/* 비밀번호 */}
            <InputBox
              type="password"
              value={password}
              placeholder="********"
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
          <div className="flex flex-row w-full mt-3 text-xs text-neutral-700 dark:text-neutral-300">
            <button
              type="button"
              className="w-1/2 flex items-center justify-center border-r dark:border-neutral-700 cursor-pointer"
              onClick={() => setResetPassword(true)}
            >
              <span>비밀번호를 잊으셨나요?</span>
            </button>
            <div className="w-1/2 flex items-center justify-center cursor-pointer">
              <button type="button" onClick={() => setRegister(true)}>
                <span>회원가입</span>
              </button>
            </div>
          </div>
        </form>
      </div>
      <LoginErrorModal
        errorModal={errorModal}
        setErrorModal={setErrorModal}
        warningIcon={warningIcon}
      />
      <WaitingModal
        waiting={waiting}
        setWaiting={setWaiting}
        warningIcon={warningIcon}
      />
      <RejectedModal
        rejected={rejected}
        setRejected={setRejected}
        warningIcon={warningIcon}
      />
      <DisabledModal
        disabled={disabled}
        setDisabled={setDisabled}
        warningIcon={warningIcon}
      />
      {register && (
        <RegisterModal
          setRegister={setRegister}
          setRegisterSuccess={setRegisterSuccess}
        />
      )}
      <ResetPasswordModal
        resetPassword={resetPassword}
        setResetPassword={setResetPassword}
        setNotFoundEmail={setNotFoundEmail}
        setRequestExists={setRequestExists}
        setResetSuccess={setResetSuccess}
      />

      <EmailNotFoundModal
        notFoundEmail={notFoundEmail}
        setNotFoundEmail={setNotFoundEmail}
        warningIcon={warningIcon}
      />
      <RequestExistsModal
        requestExists={requestExists}
        setRequestExists={setRequestExists}
        warningIcon={warningIcon}
      />

      <ResetSuccessModal
        resetSuccess={resetSuccess}
        setResetSuccess={setResetSuccess}
      />
      <RegisterSuccessModal
        registerSuccess={registerSuccess}
        setRegisterSuccess={setRegisterSuccess}
      />
    </div>
  );
};

export default ClientLogin;
