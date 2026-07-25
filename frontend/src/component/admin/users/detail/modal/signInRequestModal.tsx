import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";
import Checkbox from "@/component/common/form/checkbox";
import { useState } from "react";
import { usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";

const SignInRequestModal = ({
  signInRequest,
  signInRequestModal,
  setSignInRequestModal,
  user_id,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      return newSet;
    });
  };

  const handleSignInRequestMutation = usePost(
    "api/auth/update_user_sign_in_request",
  );
  const handleSignInRequest = () => {
    handleSignInRequestMutation.mutate(
      {
        user_id: user_id,
        requestId: signInRequest.request_id,
        selectedIds: Array.from(selectedIds),
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["userDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestDatas"] });
          queryClient.invalidateQueries({ queryKey: ["requestNumber"] });
          setSignInRequestModal(false);
        },
      },
    );
  };
  return (
    <>
      <Modal
        buttonCount={1}
        open={signInRequestModal}
        title="계정 생성 요청"
        closeOnOverlay={false}
        description={
          <div className="flex flex-col">
            <span>
              해당 사용자의 <strong>계정 생성 요청</strong>이 접수되어 있습니다.
            </span>
            <span>디렉토리 권한을 설정한 뒤 확인을 누르면</span>
            <span>계정이 생성되며 요청이 처리됩니다.</span>
            <div className="flex border border-neutral-200 mt-4 p-3 rounded-xl flex-col gap-2 max-h-[156px] overflow-y-auto text-sm bg-neutral-50">
              {signInRequest?.directory &&
                signInRequest?.directory.length > 0 &&
                signInRequest?.directory.map((directory) => {
                  return (
                    <div
                      key={directory.id}
                      className="flex flex-row gap-3 items-center font-normal"
                    >
                      <Checkbox
                        checked={selectedIds.has(directory.id)}
                        onChange={() => handleToggle(directory.id)}
                      />
                      <div>
                        <span>{directory.name}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        }
        onPrimary={() => handleSignInRequest()}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <img src={warningIcon} alt="" />
          </div>
        }
      />
    </>
  );
};

export default SignInRequestModal;
