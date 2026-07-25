import Button from "@/component/common/form/button";
import InputBox from "@/component/common/form/inputbox";
import SelectBox from "@/component/common/form/selectBox";
import { user_options } from "@/options/admin/options";
import { SearchIcon } from "lucide-react";
import DepartmentSelectBox from "../../common/departmentTreeSelect";

const UsersHeader = ({
  status,
  setStatus,
  departments,
  department,
  setDepartment,
  userSearch,
  setUserSearch,
}) => {
  return (
    <>
      <div className="w-full p-5 flex flex-row gap-3 justify-end">
        <SelectBox
          placeholder="계정 상태"
          value={status}
          onChange={(status: string) => setStatus(status)}
          options={user_options}
          className="!w-[160px]"
        />
        <DepartmentSelectBox
          placeholder="조직"
          value={department}
          onChange={(department: number) => setDepartment(department)}
          options={departments}
          className="!w-[240px]"
        />
        <InputBox
          leftIcon={<SearchIcon className="text-[#A3A3A3]" />}
          placeholder="이름 또는 이메일로 검색"
          value={userSearch}
          onChange={(value) => setUserSearch(value)}
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
export default UsersHeader;
