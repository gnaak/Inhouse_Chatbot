import RequestsHeader from "./header";
import RequestsTable from "./table";

const RequestList = ({
  requestDatas,
  total,
  requestStatus,
  setRequestStatus,
  departments,
  requestDepartment,
  setRequestDepartment,
  requestSearch,
  setRequestSearch,
  requestPage,
  setRequestPage,
  setIsDetailPage,
  setTargetRequestId,
}) => {
  return (
    <>
      <RequestsHeader
        requestStatus={requestStatus}
        setRequestStatus={setRequestStatus}
        departments={departments}
        requestDepartment={requestDepartment}
        setRequestDepartment={setRequestDepartment}
        requestSearch={requestSearch}
        setRequestSearch={setRequestSearch}
      />
      <RequestsTable
        requestDatas={requestDatas}
        total={total}
        requestPage={requestPage}
        setRequestPage={setRequestPage}
        setIsDetailPage={setIsDetailPage}
        setTargetRequestId={setTargetRequestId}
      />
    </>
  );
};
export default RequestList;
