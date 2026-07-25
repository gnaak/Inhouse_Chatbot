import Button from "@/component/common/form/button";
import InputBox from "@/component/common/form/inputbox";
import SelectBox from "@/component/common/form/selectBox";
import { request_options } from "@/options/admin/options";
import { SearchIcon } from "lucide-react";
import DepartmentSelectBox from "../../common/departmentTreeSelect";

const RequestsHeader = ({
  requestStatus,
  setRequestStatus,
  departments,
  requestDepartment,
  setRequestDepartment,
  requestSearch,
  setRequestSearch,
}) => {
  return (
    <>
      <div className="w-full p-5 flex flex-row gap-3 justify-end">
        <SelectBox
          placeholder="요청 상태"
          value={requestStatus}
          onChange={(status: string) => setRequestStatus(status)}
          options={request_options}
          className="!w-[160px]"
        />
        <DepartmentSelectBox
          placeholder="조직"
          value={requestDepartment}
          onChange={(department: number) => setRequestDepartment(department)}
          options={departments}
          className="!w-[240px]"
        />
        <InputBox
          leftIcon={<SearchIcon className="text-[#A3A3A3]" />}
          placeholder="이름 또는 이메일로 검색"
          value={requestSearch}
          onChange={(value) => setRequestSearch(value)}
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
export default RequestsHeader;
