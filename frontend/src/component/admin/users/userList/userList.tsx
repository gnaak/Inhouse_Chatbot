import UsersHeader from "./header";
import UsersTable from "./table";

const UserList = ({
  userDatas,
  status,
  setStatus,
  departments,
  department,
  setDepartment,
  userSearch,
  setUserSearch,
  userPage,
  setUserPage,
  setIsDetailPage,
  setTargetUserId,
  total,
}) => {
  return (
    <>
      <UsersHeader
        status={status}
        setStatus={setStatus}
        departments={departments}
        department={department}
        setDepartment={setDepartment}
        userSearch={userSearch}
        setUserSearch={setUserSearch}
      />
      <UsersTable
        userDatas={userDatas}
        total={total}
        userPage={userPage}
        setUserPage={setUserPage}
        setIsDetailPage={setIsDetailPage}
        setTargetUserId={setTargetUserId}
      />
    </>
  );
};
export default UserList;
