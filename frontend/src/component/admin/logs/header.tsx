import Button from "@/component/common/form/button";
import Calendar from "@/component/common/form/calendar";
import InputBox from "@/component/common/form/inputbox";
import SelectBox from "@/component/common/form/selectBox";
import { useGet } from "@/hooks/common/useAPI";
import { DirectoryProps } from "@/types/admin/directory";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

const LogsHeader = ({
  logSearch,
  setLogSearch,
  directory,
  setDirectory,
  llm,
  setLLM,
  range,
  setRange,
}) => {
  const { data: directories } = useGet<DirectoryProps[]>(
    "api/directory/directory_list",
    ["directories"],
  );

  const [directoryDict, setDirectoryDict] = useState<DirectoryProps[]>([]);

  useEffect(() => {
    if (directories) setDirectoryDict(directories);
  }, [directories]);

  const directory_options = [
    { label: "전체", value: "all" },
    ...directoryDict.map((directory) => ({
      label: directory.name,
      value: directory.id,
    })),
  ];

  const llm_options = [
    { label: "전체", value: "all" },
    { label: "내부용", value: "internal" },
    { label: "외부용", value: "external" },
    { label: "이미지", value: "image" },
  ];

  return (
    <>
      <div className="w-full p-5 flex flex-row gap-3 justify-end">
        <Calendar value={range} onChange={(v) => setRange(v)} />
          <SelectBox
            placeholder="사용 유형"
            value={llm}
            onChange={(v) => { setLLM(String(v)); if (v !== "internal") setDirectory("all"); }}
            options={llm_options}
            className="!w-[160px]"
          />
        <SelectBox
          placeholder="디렉토리"
          value={directory}
          onChange={(directory: string) => setDirectory(directory)}
          options={directory_options}
          className="!w-[160px]"
          disabled={llm !== "internal"}
        />
        <InputBox
          leftIcon={<SearchIcon className="text-[#A3A3A3]" />}
          placeholder="이름 또는 이메일로 검색"
          value={logSearch}
          onChange={(value) => setLogSearch(value)}
          className="!w-[320px]"
        />
        <Button>
          <div className="text-xs">
            <span>검색</span>
          </div>
        </Button>
      </div>
    </>
  );
};

export default LogsHeader;
