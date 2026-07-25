import Checkbox from "@/component/common/form/checkbox";
import InputBox from "@/component/common/form/inputbox";
import { useGet, usePost } from "@/hooks/common/useAPI";
import { DirectoryProps } from "@/types/admin/directory";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { useState } from "react";
import Button from "@/component/common/form/button";
import Loading from "@/component/common/loading";
import DepartmentSelectBox from "@/component/common/form/departmentTreeSelect";
import { DepartmentProps } from "@/types/client/department";

const RegisterModal = ({ setRegister, setRegisterSuccess }) => {
  // 이메일
  const [email, setEmail] = useState("");

  // 이메일 사용 가능 / 중복 / 형식 오류
  const [confirmEmail, setConfirmEmail] = useState<boolean>(false);
  const [emailConflict, setEmailConflict] = useState<boolean>(false);
  const [invalidate, setInvalidate] = useState<boolean>(false);

  const [retry, setRetry] = useState<boolean>(false);
  // 이메일 형식은 백엔드에서 검증
  const validateEmailMutation = usePost("api/auth/validate_email");
  const validateEmail = () => {
    validateEmailMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          setConfirmEmail(true);
          if (data == "retry") setRetry(true);
        },
        onError: (data) => {
          if (data.status == 409) {
            setEmailConflict(true);
          }
          if (data.status == 400) {
            setInvalidate(true);
          }
        },
      },
    );
  };

  // 비밀번호
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 형식 / 불일치
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [passwordEyes, setPasswordEyes] = useState<boolean>(false);
  const [confirmPasswordEyes, setConfirmPasswordEyes] =
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
      if (confirmPassword == password) {
        setConfirmed(true);
      } else {
        setConfirmed(false);
      }
    } else {
      setConfirmed(true);
    }
  };

  const [name, setName] = useState<string>("");
  const [department, setDepartment] = useState<number | null>(null);

  // 전체 디렉토리 데이터 불러오기
  const { data: directories, isLoading } = useGet<DirectoryProps[]>(
    "api/directory/user_directory_list",
    ["directories"],
  );

  // 전체 조직 데이터 불러오기
  const { data: departments, isLoading: isDepartmentLoading } = useGet<
    DepartmentProps[]
  >("api/department/department_list", ["departments"]);

  // 요청보낼 디렉토리 선택
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const handleToggle = (directory_id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(directory_id)) {
        newSet.delete(directory_id);
      } else {
        newSet.add(directory_id);
      }

      return newSet;
    });
  };

  // 회원 가입 요청 여부
  const isDisabled =
    !email ||
    !confirmEmail ||
    !password ||
    !name ||
    !department ||
    !confirmed ||
    passwordError;

  // 회원 가입
  const registerMutation = usePost("api/auth/register");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      {
        email: email,
        password: password,
        name: name,
        department: department,
        selectedIds: Array.from(selectedIds),
        retry: retry,
      },
      {
        onSuccess: () => {
          setRegister(false);
          setRegisterSuccess(true);
        },
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
        <div className="w-full lg:w-[600px] lg:h-[90%] h-full 2xl:h-fit overflow-y-auto relative bg-white lg:rounded-2xl flex flex-col shadow-sm border border-neutral-200/80">
          {(isLoading || isDepartmentLoading) && <Loading />}
          <>
            <div className="flex items-center justify-center h-[60px] border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-800">회원가입</span>
            </div>
            <XIcon
              className="absolute top-3 right-3 w-4 h-4 cursor-pointer"
              onClick={() => setRegister(false)}
            />
            <form
              onSubmit={onSubmit}
              className="flex flex-col h-[calc(100%-30px)] overflow-y-auto items-start gap-3 w-full justify-between p-5 pt-0"
            >
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col gap-5 w-full rounded-2xl bg-white border border-neutral-200/80 shadow-sm p-5">
                  <div className="flex flex-row gap-1 items-center">
                    <span className="text-sm font-semibold text-neutral-800">기본 정보 입력</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-xs font-medium text-neutral-600">이메일</span>
                      <InputBox
                        type="email"
                        value={email}
                        className=""
                        placeholder="이메일을 입력해주세요"
                        onChange={(val) => {
                          setEmail(val);
                          setConfirmEmail(false);
                          setInvalidate(false);
                          setEmailConflict(false);
                        }}
                        size="md"
                        full={true}
                        iconWidth={
                          confirmEmail
                            ? 4
                            : emailConflict
                              ? 4
                              : invalidate
                                ? 4
                                : 16
                        }
                        error={emailConflict || invalidate}
                        success={confirmEmail}
                        errorMessage={
                          emailConflict
                            ? "해당 이메일로 가입된 계정이 있습니다."
                            : "올바른 이메일 형식이 아닙니다."
                        }
                        rightIcon={
                          confirmEmail ? (
                            <div className="w-4 h-4 bg-green-600 rounded-xl flex items-center justify-center">
                              <CheckIcon className="text-white w-3 h-3" />
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="sub2"
                              size="sm"
                              className="text-xs"
                              onClick={validateEmail}
                            >
                              <span>중복 확인</span>
                            </Button>
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-neutral-600">비밀번호</span>
                      <InputBox
                        type={passwordEyes ? "text" : "password"}
                        value={password}
                        placeholder="비밀번호를 입력해주세요"
                        onChange={(val) => setPassword(val)}
                        onBlur={() => {
                          validatePassword(password);
                          confirmPasswords();
                        }}
                        size="md"
                        error={passwordError}
                        errorMessage="비밀번호는 8~16자여야 합니다."
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
                        full={true}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-neutral-600">
                        비밀번호 확인
                      </span>
                      <InputBox
                        type={confirmPasswordEyes ? "text" : "password"}
                        value={confirmPassword}
                        placeholder="비밀번호를 다시 입력해주세요"
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
                        full={true}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-neutral-600">이름</span>
                      <InputBox
                        type="text"
                        value={name}
                        placeholder="이름을 입력해주세요"
                        onChange={(val) => setName(val)}
                        size="md"
                        full={true}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-neutral-600">
                        소속 조직
                      </span>
                      <DepartmentSelectBox
                        placeholder="본인 소속 조직을 선택하세요"
                        value={department}
                        onChange={(department: number) =>
                          setDepartment(department)
                        }
                        options={departments}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full rounded-2xl bg-white border border-neutral-200/80 shadow-sm p-5">
                  <div className="flex flex-col gap-0.5 w-full">
                    <span className="text-sm font-semibold text-neutral-800">접근 디렉토리 선택</span>
                    <span className="text-xs text-neutral-500">
                      업무에 필요한 디렉토리를 선택해주세요
                    </span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 text-sm max-h-[84px] md:max-h-[90px] overflow-y-auto border p-3 px-5 rounded-xl">
                    {directories &&
                      directories
                        .filter((directory) => directory.id !== 1)
                        .map((directory) => (
                          <div
                            key={directory.id}
                            className="flex items-center gap-1 h-8"
                          >
                            <Checkbox
                              checked={selectedIds.has(directory.id)}
                              onChange={() => handleToggle(directory.id)}
                            />
                            {directory.name}
                          </div>
                        ))}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-400 text-xs">
                      * 선택한 카테고리는 관리자 승인 후 적용됩니다.
                    </span>
                    <span className="text-neutral-400 text-xs">
                      * 전사 공통 데이터는 기본으로 제공됩니다.
                    </span>
                  </div>
                </div>
              </div>
              {/* 버튼 */}
              <Button
                full={true}
                variant="main"
                className="px-8 text-sm"
                onClick={onSubmit}
                disabled={isDisabled}
              >
                가입 신청하기
              </Button>
            </form>
          </>
        </div>
      </div>
    </>
  );
};

export default RegisterModal;
