import UnapprovedUserModal from "@/component/client/directory/modal/approvedUserModal";
import ChangePassword from "@/component/client/profile/changePassword";
import UserInfo from "@/component/client/profile/userInfo";
import { useGet } from "@/hooks/common/useAPI";
import { UserDetail } from "@/types/client/user";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type OutletContextType = {
  meData: UserDetail;
};

const ClientProfile = () => {
  const { meData } = useOutletContext<OutletContextType>();

  const { data: userStatus } = useGet("api/auth/check_status", ["userStatus"]);

  // 계정 상태 변경되서 사용 못하는 계정일 때,
  const [unapprovedUser, setUnapprovedUser] = useState<boolean>(false);

  useEffect(() => {
    if (userStatus && userStatus != "approved") {
      setUnapprovedUser(true);
    }
  }, [userStatus]);

  return (
    <>
      <div className="flex flex-col w-full h-full text-textMain overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-6 md:px-10 py-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-neutral-800">내 정보</h1>
            <p className="text-xs text-neutral-500">
              계정에 등록된 정보를 확인하고 비밀번호를 변경할 수 있어요.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <UserInfo meData={meData} />
            <ChangePassword />
          </div>
        </div>
      </div>
      <UnapprovedUserModal unapprovedUser={unapprovedUser} />
    </>
  );
};

export default ClientProfile;
