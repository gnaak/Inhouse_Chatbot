import { useGet } from "@/hooks/common/useAPI";
import { RequestDatas } from "@/types/admin/user";
import { useEffect, useState } from "react";
import RequestList from "@/component/admin/requests/requestList/requestList";
import RequestDetail from "@/component/admin/requests/detail/detail";
import { DepartmentProps } from "@/types/client/department";

const AdminRequests = () => {
  const [requestStatus, setRequestStatus] = useState<string>("");
  const [requestDepartment, setRequestDepartment] = useState<string>("");
  const [requestSearch, setRequestSearch] = useState<string>("");
  const [requestPage, setRequestPage] = useState<number>(1);

  useEffect(() => {
    setRequestPage(1);
  }, [requestStatus, requestDepartment, requestSearch]);

  const request_search_params = new URLSearchParams();
  request_search_params.set("page", String(requestPage));
  request_search_params.set("row_count", "12");
  if (requestStatus && requestStatus != "total") {
    request_search_params.set("search_type", requestStatus);
  }
  if (requestDepartment && requestDepartment != "total") {
    request_search_params.set("department_type", requestDepartment);
  }
  const requestTrimmed = requestSearch.trim();
  if (requestTrimmed) request_search_params.set("search_value", requestTrimmed);
  const requestDatasURL = `api/request/request_list?${request_search_params.toString()}`;

  const { data: requestDatas } = useGet<RequestDatas>(requestDatasURL, [
    "requestDatas",
    requestDatasURL,
  ]);

  const [isDetailPage, setIsDetailPage] = useState<boolean>(false);
  const [targetRequestId, setTargetRequestId] = useState<number | null>(null);
  const targetInfo = requestDatas?.request_list.find(
    (u) => u.id === targetRequestId,
  );

  const { data: departments } = useGet<DepartmentProps[]>(
    "api/department/department_list",
    ["departments"],
  );

  return (
    <>
      <div className="flex flex-row w-full items-center h-full gap-5 px-5">
        <div className="w-full border relative rounded-xl bg-white shadow-md h-full">
          {isDetailPage ? (
            <RequestDetail
              setIsDetailPage={setIsDetailPage}
              targetInfo={targetInfo}
            />
          ) : (
            <RequestList
              requestDatas={requestDatas}
              total={requestDatas?.condition_total}
              requestStatus={requestStatus}
              setRequestStatus={setRequestStatus}
              departments={departments}
              requestDepartment={requestDepartment}
              setRequestDepartment={setRequestDepartment}
              requestSearch={requestSearch}
              setRequestSearch={setRequestSearch}
              requestPage={requestPage}
              setRequestPage={setRequestPage}
              setIsDetailPage={setIsDetailPage}
              setTargetRequestId={setTargetRequestId}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default AdminRequests;
