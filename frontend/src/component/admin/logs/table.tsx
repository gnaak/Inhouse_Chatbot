import Button from "@/component/common/form/button";
import Pagination from "@/component/common/pagination";
import Table, { Column } from "@/component/common/table/table";
import { formatDateTime } from "@/utils/format/date";

const getType = (type: string) => {
  if (type == "외부") return "외부용";
  else if (type == "이미지") return "이미지";
  return "내부용";
};

const getDirectory = (type: string) => {
  if (type == "외부" || type == "이미지") return "-";
  return type;
};

const LogsTable = ({
  logsData,
  page,
  setPage,
  onSelectDetail,
  pendingLogId,
  total,
}) => {
  const log_rows = logsData?.log_list ?? [];
  const columns: Column[] = [
    {
      key: "id",
      header: "No.",
      align: "center",
      width: "10%",
    },
    {
      key: "name",
      header: "사용자",
      align: "center",
      width: "10%",
    },
    { key: "email", header: "이메일", align: "center", width: "15%" },
    {
      key: "type",
      header: "사용 유형",
      align: "center",
      width: "15%",
      render: (log_rows) => getType(log_rows.directory),
    },
    {
      key: "directory",
      header: "디렉토리",
      align: "center",
      width: "15%",
      render: (log_rows) => getDirectory(log_rows.directory),
    },
    {
      key: "version",
      header: "AI 모델",
      align: "center",
      width: "15%",
    },
    {
      key: "created_at",
      header: "사용 시간",
      align: "center",
      width: "20%",
      render: (log_rows) => formatDateTime(log_rows.created_at),
    },
    {
      key: "detail",
      header: "대화 로그",
      align: "center",
      width: "10%",

      render: (log_rows) => (
        <Button
          variant="sub2"
          size="sm"
          className="bg-white border border-[#D4D4D4] !py-1"
          disabled={pendingLogId !== null}
        >
          <div
            onClick={() => {
              if (pendingLogId !== null) return;
              onSelectDetail({
                log_id: log_rows.id,
                created_at: log_rows.created_at,
                user_name: log_rows.name,
                user_email: log_rows.email,
                directory_name: log_rows.directory,
                version: log_rows.version,
              });
            }}
          >
            <span className="text-xs">보기</span>
          </div>
        </Button>
      ),
    },
  ];
  return (
    <>
      <Table
        columns={columns}
        data={log_rows}
        rowCount={12}
        rowClassName={(row) => (row.is_deleted ? "text-neutral-400" : "")}
      />
      <Pagination
        page={page}
        pageSize={12}
        onChange={(page) => setPage(page)}
        total={total}
      />
    </>
  );
};
export default LogsTable;
