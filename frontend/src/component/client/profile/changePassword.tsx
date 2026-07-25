import Button from "@/component/common/form/button";
import InputBox from "@/component/common/form/inputbox";
import { usePost } from "@/hooks/common/useAPI";
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import ChangePasswordSuccessModal from "./modal/changePasswordSuccessModal";
import ChangePasswordErrorModal from "./modal/changePasswordErrorModal";

const ChangePassword = () => {
  const [hasSubmit, setHasSubmit] = useState<boolean>(false);

  // 비밀번호
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 형식 / 불일치
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [passwordEyes, setPasswordEyes] = useState<boolean>(false);
  const [newPasswordEyes, setNewPasswordEyes] = useState<boolean>(false);
  const [confirmPasswordEyes, setConfirmPasswordEyes] =
    useState<boolean>(false);

  const [changePasswordSuccess, setChangePasswordSuccess] =
    useState<boolean>(false);
  const [changePasswordError, setChangePasswordError] =
    useState<boolean>(false);

  // 비밀번호 형식 검증
  const validatePassword = (value: string) => {
    if (value.trim() != "") {
      if (value.length < 8 || value.length > 16) {
        setPasswordError(true);
      } else {
        setPasswordError(false);
      }
    } else {
      setPasswordError(false);
    }
  };

  // 비밀번호 일치 검증
  const confirmPasswords = () => {
    if (confirmPassword.trim() != "") {
      if (confirmPassword == newPassword) {
        setConfirmed(true);
      } else {
        setConfirmed(false);
      }
    } else {
      setConfirmed(true);
    }
  };

  const changePasswordMutation = usePost<
    { password: string; newPassword: string },
    void
  >("api/auth/change_password");

  const isDisabled =
    !password ||
    !newPassword ||
    !confirmPassword ||
    !confirmed ||
    passwordError ||
    hasSubmit;

  const handleChangePassword = () => {
    changePasswordMutation.mutate(
      {
        password: password,
        newPassword: newPassword,
      },
      {
        onSuccess: () => {
          setChangePasswordSuccess(true);
          setHasSubmit(true);
        },
        onError: () => setChangePasswordError(true),
      },
    );
  };
  return (
    <>
      <section className="flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
        <div className="px-4 pt-5 pb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <KeyRoundIcon className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-neutral-800">
              비밀번호 변경
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              8~16자의 안전한 비밀번호를 사용해주세요.
            </p>
          </div>
        </div>
        <div className="relative flex flex-col gap-4 px-4 pb-6 text-sm text-neutral-600">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">
              현재 비밀번호
            </span>
            <InputBox
              type={passwordEyes ? "text" : "password"}
              value={password}
              placeholder="현재 비밀번호를 입력해주세요"
              onChange={(val) => {
                setPassword(val);
                setHasSubmit(false);
              }}
              size="md"
              rightIcon={
                <div className="text-[#6A6A6A]">
                  {passwordEyes ? (
                    <EyeIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setPasswordEyes(false)}
                    />
                  ) : (
                    <EyeOffIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setPasswordEyes(true)}
                    />
                  )}
                </div>
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">
              새 비밀번호
            </span>
            <InputBox
              type={newPasswordEyes ? "text" : "password"}
              value={newPassword}
              placeholder="새 비밀번호를 입력해주세요"
              onChange={(val) => setNewPassword(val)}
              onBlur={() => {
                validatePassword(newPassword);
                confirmPasswords();
              }}
              size="md"
              error={passwordError}
              errorMessage="비밀번호는 8~16자여야 합니다."
              rightIcon={
                <div className="text-[#6A6A6A]">
                  {newPasswordEyes ? (
                    <EyeIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setNewPasswordEyes(false)}
                    />
                  ) : (
                    <EyeOffIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setNewPasswordEyes(true)}
                    />
                  )}
                </div>
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">
              새 비밀번호 확인
            </span>
            <InputBox
              type={confirmPasswordEyes ? "text" : "password"}
              value={confirmPassword}
              placeholder="새 비밀번호를 다시 입력해주세요"
              onChange={(val) => setConfirmPassword(val)}
              onBlur={() => confirmPasswords()}
              size="md"
              error={!confirmed}
              errorMessage="비밀번호가 일치하지 않습니다."
              rightIcon={
                <div className="text-[#6A6A6A]">
                  {confirmPasswordEyes ? (
                    <EyeIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setConfirmPasswordEyes(false)}
                    />
                  ) : (
                    <EyeOffIcon
                      className="w-4 h-4 cursor-pointer"
                      onClick={() => setConfirmPasswordEyes(true)}
                    />
                  )}
                </div>
              }
            />
          </div>
          <div className="w-full flex flex-row items-center mt-2 justify-end">
            <Button
              size="sm"
              disabled={isDisabled}
              onClick={() => handleChangePassword()}
            >
              <span className="text-xs">변경하기</span>
            </Button>
          </div>
        </div>
      </section>
      <ChangePasswordSuccessModal
        changePasswordSuccess={changePasswordSuccess}
      />
      <ChangePasswordErrorModal
        changePasswordError={changePasswordError}
        setChangePasswordError={setChangePasswordError}
      />
    </>
  );
};

export default ChangePassword;
