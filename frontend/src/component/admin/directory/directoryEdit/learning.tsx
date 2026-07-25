import fileData from "@/assets/admin/file_data.png";
import textData from "@/assets/admin/text_data.png";
import { baseURL } from "@/hooks/common/useAPI";
import { LearningFilesProps } from "@/types/admin/directory";
import { DownloadIcon, Trash2Icon, FileTextIcon } from "lucide-react";
import { useEffect, useRef } from "react";

const LearningData = ({
  savedDirectory,
  setSavedDirectory,
  handleChange,
  addedFiles,
  setAddedFiles,
  setDeletedFiles,
}) => {
  const addFileRef = useRef<HTMLDivElement | null>(null);

  // 추가된 파일 추가
  const handleAddFile = (files: FileList | null) => {
    if (!files) return;
    setAddedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  // 기존 파일 삭제
  const handleDeleteOriginalFile = (fileId: string) => {
    setDeletedFiles((prev) => [...prev, fileId]);
    setSavedDirectory((prev) => ({
      ...prev,
      learning_files: prev.learning_files.filter(
        (file) => file.file_id !== fileId,
      ),
    }));
  };

  // 추가된 파일 삭제
  const handleDeleteFile = (idx: number) => {
    setAddedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // 파일 추가, 삭제 시 스크롤
  useEffect(() => {
    if (addedFiles.length > 0) {
      addFileRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [addedFiles]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center">
          <div className="flex flex-row gap-1 items-center font-semibold">
            <span>학습 데이터 입력</span>
            <span className="text-errorColor">*</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-3">
            <div
              className={`cursor-pointer flex flex-row gap-1 items-center border h-[40px] px-3 rounded-lg
                    ${
                      savedDirectory?.learning_type == "text"
                        ? "border-gray-400"
                        : ""
                    }
                    }`}
              onClick={() => {
                handleChange("learning_type", "text");
              }}
            >
              <img src={textData} alt="" className="h-4 w-4" />
              <span>텍스트 입력</span>
            </div>
            <div
              className={`cursor-pointer flex flex-row gap-1 items-center border py-1 px-3 rounded-lg
                    ${
                      savedDirectory?.learning_type == "file"
                        ? "border-gray-400"
                        : ""
                    }
                  }`}
              onClick={() => handleChange("learning_type", "file")}
            >
              <img src={fileData} alt="" className="h-4 w-4" />
              <span>파일 업로드</span>
            </div>
          </div>
          {savedDirectory?.learning_type == "text" ? (
            <textarea
              name="learning_text"
              value={savedDirectory?.learning_text || ""}
              onChange={(e) => handleChange("learning_text", e.target.value)}
              placeholder="AI 챗봇 학습에 필요한 지침(시스템 요청)을 입력하세요."
              className="h-[128px] font-normal border hover:border-gray-400 marker:focus:outline-1 focus:outline-none  rounded-lg p-2 resize-none"
            ></textarea>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span>저장된 파일</span>
                <div className="flex flex-col gap-2">
                  {savedDirectory?.learning_files &&
                  savedDirectory?.learning_files.length > 0 ? (
                    savedDirectory?.learning_files.map(
                      (learning_file: LearningFilesProps, idx: number) => (
                        <div
                          key={idx}
                          className="w-full border border-gray-300 h-[40px] pl-3 pr-1.5 rounded-lg flex flex-row gap-2 items-center justify-between hover:border-gray-400 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileTextIcon className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate text-sm text-gray-700">
                              {learning_file.file_name}
                            </span>
                          </div>
                          <div className="flex flex-row gap-1 items-center shrink-0">
                            {learning_file.s3_key && (
                              <a
                                href={`${baseURL}/api/directory/file_download?file_id=${learning_file.file_id}`}
                                target="_blank"
                                rel="noreferrer"
                                title="원본 다운로드"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <DownloadIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              title="제거"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => {
                                handleDeleteOriginalFile(learning_file.file_id);
                              }}
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <span className="text-gray-500">
                      저장된 파일이 없습니다.
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span>추가된 파일</span>
                <div className="flex flex-col gap-2">
                  {addedFiles?.length > 0 ? (
                    addedFiles.map((file: File, idx: number) => (
                      <div
                        key={idx}
                        className="w-full border border-blue-200 bg-blue-50/30 h-[40px] pl-3 pr-1.5 rounded-lg flex flex-row gap-2 items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileTextIcon className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate text-sm text-gray-700">
                            {file.name}
                          </span>
                        </div>
                        <button
                          title="제거"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                          onClick={() => {
                            handleDeleteFile(idx);
                          }}
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500">
                      추가된 파일이 없습니다.
                    </span>
                  )}
                </div>
              </div>
              <div
                ref={addFileRef}
                className="border border-gray-300 h-[40px] px-2 rounded-lg flex flex-row gap-2 w-fit items-center cursor-pointer"
              >
                <img src={fileData} alt="" className="w-4 h-4" />
                <label className="cursor-pointer flex items-center gap-2">
                  <span>+ 파일 추가</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt, .pdf, .doc, .docx"
                    className="hidden"
                    onChange={(e) => {
                      handleAddFile(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {addedFiles?.length <= 0 &&
                savedDirectory?.learning_files?.length <= 0 && (
                  <span className="text-red-500">
                    ⚠ 최소 1개 이상의 파일을 추가해야 저장할 수 있어요.
                  </span>
                )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LearningData;
