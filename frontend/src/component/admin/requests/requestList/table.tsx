import Button from "@/component/common/form/button";
import Pagination from "@/component/common/pagination";
import Table, { Column } from "@/component/common/table/table";
import { REQUEST_STATUSMAP, REQUEST_TYPEMAP } from "@/mapping/admin/map";
import { formatDateTime } from "@/utils/format/date";

const RequestTable = ({
  requestDatas,
  total,
  requestPage,
  setRequestPage,
  setIsDetailPage,
  setTargetRequestId,
}) => {
  const request_rows = requestDatas?.request_list ?? [];
  const columns: Column[] = [
    {
      key: "id",
      header: "No.",
      align: "center",
      width: "5%",
    },
    {
      key: "name",
      header: "사용자",
      align: "center",
      width: "10%",
    },
    {
      key: "department",
      header: "조직",
      align: "center",
      width: "10%",
      render: (request_rows) => <span>{request_rows.department}</span>,
    },
    {
      key: "type",
      header: "요청 유형",
      align: "center",
      width: "15%",
      render: (request_rows) => (
        <span>{REQUEST_TYPEMAP[request_rows.type]}</span>
      ),
    },
    {
      key: "request_description",
      header: "요청 디렉토리",
      align: "center",
      width: "10%",
      render: (request_rows) => (
        <span className="truncate block">
          {(() => {
            const directories = request_rows.directories;

            if (!Array.isArray(directories) || directories.length === 0)
              return "-";

            const names = directories.map((d) => d.directory_name);

            const text = names.slice(0, 2).join(", ");
            return names.length > 2 ? `${text} ...` : text;
          })()}
        </span>
      ),
    },
    {
      key: "status",
      header: "요청 상태",
      align: "center",
      width: "10%",
      render: (request_rows) => (
        <span>{REQUEST_STATUSMAP[request_rows.status]}</span>
      ),
    },
    {
      key: "created_at",
      header: "요청 시간",
      align: "center",
      width: "15%",
      render: (request_rows) => (
        <span className="truncate block">
          {formatDateTime(request_rows.created_at)}
        </span>
      ),
    },
    {
      key: "approved_at",
      header: "요청 승인 시간",
      align: "center",
      width: "15%",
      render: (request_rows) => (
        <span className="truncate block">
          {request_rows.approved_at
            ? formatDateTime(request_rows.approved_at)
            : "-"}
        </span>
      ),
    },
    {
      key: "detail",
      header: "관리",
      align: "center",
      width: "10%",

      render: (request_rows) => (
        <Button
          variant="sub2"
          size="sm"
          className="bg-white border border-[#D4D4D4] !py-1"
          disabled={request_rows.status != "waiting"}
        >
          <div
            onClick={() => {
              setIsDetailPage(true);
              setTargetRequestId(request_rows.id);
            }}
          >
            <span className="text-xs">상세</span>
          </div>
        </Button>
      ),
    },
  ];
  return (
    <>
      <Table columns={columns} data={request_rows} rowCount={12} />
      <Pagination
        page={requestPage}
        pageSize={12}
        onChange={(page) => setRequestPage(page)}
        total={total}
      />
    </>
  );
};
export default RequestTable;
