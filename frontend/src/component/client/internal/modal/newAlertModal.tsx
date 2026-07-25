import Modal from "@/component/common/feedback/modal";
import warningIcon from "@/assets/admin/warning.svg";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePost } from "@/hooks/common/useAPI";
import { useQueryClient } from "@tanstack/react-query";

const NewAlertModal = ({
  newAlertModal,
  setNewAlertModal,
  rejected,
  revoked,
}) => {
  const queryClient = useQueryClient();
  const checkMutation = usePost("api/user/check_user_alert");
  const handleNewAlert = () => {
    checkMutation.mutate(
      {},
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["userDirectoryDatas"] });
          setNewAlertModal(false);
        },
      },
    );
  };

  const rejectedRef = useRef<HTMLSpanElement | null>(null);
  const [isRejectedTruncated, setIsRejectedTruncated] = useState(false);
  const revokedRef = useRef<HTMLSpanElement | null>(null);
  const [isRevokedTruncated, setIsRevokedTruncated] = useState(false);

  useEffect(() => {
    if (!newAlertModal) return;

    const timer = setTimeout(() => {
      const el = rejectedRef.current;
      if (!el) return;

      const el2 = revokedRef.current;
      if (!el2) return;

      setIsRejectedTruncated(el.scrollWidth > el.clientWidth);
      setIsRevokedTruncated(el2.scrollWidth > el2.clientWidth);
    }, 0);

    return () => clearTimeout(timer);
  }, [rejected, newAlertModal]);

  const [isRejectedExpanded, setIsRejectedExpanded] = useState(false);
  const [isRevokedExpanded, setIsRevokedExpanded] = useState(false);

  const toggleRejected = () => {
    setIsRejectedExpanded((prev) => !prev);
  };

  const toggleRevoked = () => {
    setIsRevokedExpanded((prev) => !prev);
  };

  return (
    <>
      <div className="z-20">
        <Modal
          buttonCount={1}
          open={newAlertModal}
          title="디렉토리 변경"
          description={
            <div className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span>디렉토리 접근 요청이 반려되었거나,</span>
                <span>권한이 회수된 디렉토리가 존재합니다.</span>
                <span>
                  아래 디렉토리를 확인하신 후, 다시 요청 부탁드립니다.
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex w-full relative flex-row items-center">
                    <span className="font-semibold">요청 반려된 디렉토리:</span>
                    {isRejectedTruncated && (
                      <button
                        onClick={toggleRejected}
                        className="absolute top-[34px] -translate-y-1/2 right-0"
                      >
                        {isRejectedExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="max-w-[320px]">
                    <span
                      ref={rejectedRef}
                      className={`block pr-5 ${
                        isRejectedExpanded
                          ? "whitespace-normal text-start max-h-[60px] overflow-y-auto"
                          : "overflow-hidden whitespace-nowrap text-ellipsis"
                      }`}
                    >
                      {rejected?.map((r) => r.name).join(", ")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex w-full relative flex-row items-center">
                    <span className="font-semibold">권한 회수된 디렉토리:</span>
                    {isRevokedTruncated && (
                      <button
                        onClick={toggleRevoked}
                        className="absolute top-[34px] -translate-y-1/2 right-0"
                      >
                        {isRevokedExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="max-w-[320px]">
                    <span
                      ref={revokedRef}
                      className={`block pr-5 ${
                        isRevokedExpanded
                          ? "whitespace-normal text-start max-h-[60px] overflow-y-auto"
                          : "overflow-hidden whitespace-nowrap text-ellipsis"
                      }`}
                    >
                      {revoked?.map((r) => r.name).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
          onPrimary={() => handleNewAlert()}
          icon={
            <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
              <img src={warningIcon} alt="" />
            </div>
          }
        />
      </div>
    </>
  );
};

export default NewAlertModal;
