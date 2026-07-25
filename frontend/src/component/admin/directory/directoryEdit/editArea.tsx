import gpt from "@/assets/admin/GPT.png";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePost } from "@/hooks/common/useAPI";
import LearningData from "./learning";
import Button from "@/component/common/form/button";
import DirectoryExistModal from "../modal/directoryExistModal";

interface SaveChatbotResponse {
  status: number;
  message: string;
}

const DirectoryEditArea = ({
  savedDirectory,
  setSavedDirectory,
  setEditTarget,
  setIsEdit,
  setIsNew,
  setIsLoading,
  total,
}) => {
  const queryClient = useQueryClient();
  const gpt_versions = ["gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4", "gpt-5.5"];
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 챗봇 변경 시 맨 위로 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [savedDirectory?.id]);

  // 학습 데이터(파일) 제외하고 기존 값 변경
  const handleChange = (target: string, value: string | number) => {
    setSavedDirectory((prev) => ({
      ...prev,
      [target]: value,
    }));
  };

  // 삭제 파일
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);

  // 추가 파일
  const [addedFiles, setAddedFiles] = useState<File[]>([]);

  // 검증
  const isValid = useMemo(() => {
    // 기본 필수 정보 (디렉토리 명칭, 인사메시지, 지침데이터)
    if (
      !savedDirectory.name.trim() ||
      !savedDirectory.instructions.trim() ||
      !savedDirectory.greeting_message.trim()
    )
      return false;

    // 텍스트 데이터 사용 시 텍스트 데이터가 없는 경우
    if (
      savedDirectory.learning_type == "text" &&
      !savedDirectory.learning_text?.trim()
    )
      return false;

    // 파일 데이터 사용 시 기존 파일 데이터가 없고, 추가된 파일 데이터도 없는 경우
    if (savedDirectory.learning_type == "file") {
      const hasExisting = (savedDirectory.learning_files?.length ?? 0) > 0;
      const hasNew = (addedFiles?.length ?? 0) > 0;
      if (!hasExisting && !hasNew) return false;
    }

    return true;
  }, [savedDirectory, addedFiles]);

  const { mutate: saveChatbot } = usePost<FormData, SaveChatbotResponse>(
    "api/directory/save_directory",
  );

  const [directoryExist, setDirectoryExist] = useState<boolean>(false);

  // 저장
  const handleSave = () => {
    setIsLoading(true);
    const formData = new FormData();

    // 기본 챗봇 정보
    formData.append("name", savedDirectory.name);
    formData.append("gpt_version", savedDirectory.gpt_version);
    formData.append("instructions", savedDirectory.instructions);
    formData.append("greeting_message", savedDirectory.greeting_message);
    formData.append("fallback_message", savedDirectory.fallback_message);
    // 학습 데이터 (텍스트 / 파일 구분)
    formData.append("learning_type", String(savedDirectory.learning_type));

    // 텍스트
    formData.append("learning_text", savedDirectory.learning_text);

    // 삭제된 파일
    deletedFiles.forEach((file) => {
      formData.append("deleted_files", file);
    });

    // 추가된 파일
    addedFiles.forEach((file) => {
      formData.append("new_files", file);
    });

    // id (새 챗봇이면 0, 기존이면 실제 id)
    formData.append("id", String(savedDirectory.id));

    formData.append("order", String(total));
    // 저장 API 호출
    saveChatbot(formData, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["directories"] });
        setEditTarget(-1);
        setIsEdit(false);
        setIsNew(false);
        setIsLoading(false);
      },
      onError: (data) => {
        if (data.status == 409) {
          setIsLoading(false);
          setDirectoryExist(true);
        }
      },
    });
  };

  return (
    <>
      <div className="flex flex-col h-full w-[calc(75%-20px)] bg-white border rounded-xl text-sm shadow-md">
        <div className="flex flex-col h-full relative">
          <div className="p-4 pb-16 h-full relative">
            <div
              ref={containerRef}
              className="overflow-y-auto flex flex-col h-full gap-6"
            >
              {/* 챗봇명 */}
              <div className="flex flex-col w-full gap-2">
                <div className="flex flex-row gap-1 items-center font-semibold">
                  <span>디렉토리 명칭</span>
                  <span className="text-errorColor">*</span>
                </div>
                <input
                  name="name"
                  type="text"
                  readOnly={savedDirectory.id == 1}
                  value={savedDirectory?.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="디렉토리 명칭을 입력하세요."
                  className="w-full font-normal border hover:border-gray-400 marker:focus:outline-1 focus:outline-none flex-1 rounded-lg p-2"
                />
              </div>

              {/* GPT 버전 */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center">
                  <div className="flex flex-row gap-1 items-center font-semibold">
                    <span>GPT 버전</span>
                    <span className="text-red-500">*</span>
                  </div>
                </div>
                <div className="flex flex-row gap-3 text-sm">
                  {gpt_versions.map((version, idx) => (
                    <div
                      key={idx}
                      className={`cursor-pointer flex flex-row gap-1 items-center border h-[40px] px-3 rounded-lg
                  ${
                    savedDirectory?.gpt_version == version
                      ? "border-gray-400"
                      : ""
                  }`}
                      onClick={() => handleChange("gpt_version", version)}
                    >
                      <img src={gpt} alt="" className="h-4 w-4" />
                      <span>{version}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 학습 데이터 */}
              <LearningData
                savedDirectory={savedDirectory}
                setSavedDirectory={setSavedDirectory}
                handleChange={handleChange}
                addedFiles={addedFiles}
                setAddedFiles={setAddedFiles}
                setDeletedFiles={setDeletedFiles}
              />

              {/* 인사 메시지 */}
              <div className="flex flex-col gap-2 justify-center">
                <div className="flex flex-row gap-1 items-center font-semibold">
                  <span>인사 메시지</span>
                  <span className="text-errorColor">*</span>
                </div>
                <input
                  name="greeting_message"
                  type="text"
                  value={savedDirectory?.greeting_message}
                  onChange={(e) =>
                    handleChange("greeting_message", e.target.value)
                  }
                  placeholder="AI 인사메시지를 설정해주세요. Ex) 만나서 반갑습니다! 무엇이든 물어보세요."
                  className="font-normal border hover:border-gray-400 marker:focus:outline-1 focus:outline-none flex-1 rounded-lg p-2"
                />
              </div>

              {/* 챗봇 지침 */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1 items-center font-semibold">
                  <span>지침 데이터</span>
                  <span className="text-red-500">*</span>
                </div>
                <textarea
                  name="instructions"
                  value={savedDirectory?.instructions}
                  onChange={(e) => handleChange("instructions", e.target.value)}
                  placeholder="AI 챗봇에게 전달할 지침 데이터를 입력하세요."
                  className="h-[128px] font-normal border hover:border-gray-400 marker:focus:outline-1 focus:outline-none  rounded-lg p-2 resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1 items-center font-semibold">
                  <span>데이터 찾기 실패 시 메시지</span>
                </div>
                <textarea
                  name="fallback_message"
                  value={savedDirectory?.fallback_message}
                  onChange={(e) =>
                    handleChange("fallback_message", e.target.value)
                  }
                  placeholder="데이터를 찾지 못했을 경우 사용자에게 안내할 메시지를 입력하세요."
                  className="h-[128px] font-normal border hover:border-gray-400 marker:focus:outline-1 focus:outline-none  rounded-lg p-2 resize-none"
                ></textarea>
              </div>
            </div>
          </div>
          <div className="w-full rounded-b-xl bg-white h-12 absolute bottom-0 flex items-center border-t px-5 justify-end">
            <Button size="sm" disabled={!isValid} onClick={() => handleSave()}>
              <span className="text-xs">저장</span>
            </Button>
          </div>
        </div>
      </div>
      <DirectoryExistModal
        directoryExist={directoryExist}
        setDirectoryExist={setDirectoryExist}
      />
    </>
  );
};
export default DirectoryEditArea;
