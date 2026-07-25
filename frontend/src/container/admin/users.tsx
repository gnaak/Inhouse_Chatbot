import UserList from "@/component/admin/users/userList/userList";
import { useGet } from "@/hooks/common/useAPI";
import { UserDatas } from "@/types/admin/user";
import { useEffect, useState } from "react";
import UsersDetail from "@/component/admin/users/detail/detail";
import { DepartmentProps } from "@/types/client/department";

const AdminUsers = () => {
  const [status, setStatus] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userPage, setUserPage] = useState<number>(1);

  useEffect(() => {
    setUserPage(1);
  }, [status, department, userSearch]);

  const user_search_params = new URLSearchParams();
  user_search_params.set("page", String(userPage));
  user_search_params.set("row_count", "12");
  if (status && status != "total") {
    user_search_params.set("search_type", status);
  }
  if (department && department != "total") {
    user_search_params.set("department_type", department);
  }
  const userTrimmed = userSearch.trim();
  if (userTrimmed) user_search_params.set("search_value", userTrimmed);
  const userDatasURL = `api/user/user_list?${user_search_params.toString()}`;

  const { data: userDatas } = useGet<UserDatas>(userDatasURL, [
    "userDatas",
    userDatasURL,
  ]);

  const [isDetailPage, setIsDetailPage] = useState<boolean>(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const targetInfo = userDatas?.user_list.find((u) => u.id === targetUserId);

  const { data: departments } = useGet<DepartmentProps[]>(
    "api/department/department_list",
    ["departments"],
  );

  return (
    <>
      <div className="flex flex-row w-full items-center h-full gap-5 px-5">
        <div className="w-full border relative rounded-xl bg-white shadow-md h-full">
          {isDetailPage ? (
            <UsersDetail
              setIsDetailPage={setIsDetailPage}
              targetInfo={targetInfo}
            />
          ) : (
            <UserList
              userDatas={userDatas}
              total={userDatas?.total}
              status={status}
              setStatus={setStatus}
              departments={departments}
              department={department}
              setDepartment={setDepartment}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              userPage={userPage}
              setUserPage={setUserPage}
              setIsDetailPage={setIsDetailPage}
              setTargetUserId={setTargetUserId}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
