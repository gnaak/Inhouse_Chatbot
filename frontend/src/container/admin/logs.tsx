import LogDetailModal from "@/component/admin/logs/detailModal";
import LogsHeader from "@/component/admin/logs/header";
import LogsTable from "@/component/admin/logs/table";
import { RangeValue } from "@/component/common/form/calendar";
import { useGet } from "@/hooks/common/useAPI";
import {
  DetailLogDataProps,
  LogDatasProps,
  LogDetailProps,
} from "@/types/admin/log";
import { formatDate } from "@/utils/format/date";
import { useEffect, useState } from "react";

const AdminLogs = () => {
  const [page, setPage] = useState<number>(1);
  const [range, setRange] = useState<RangeValue>({ start: null, end: null });
  const [directory, setDirectory] = useState<string>("");
  const [llm, setLLM] = useState<string>("");
  const [logSearch, setLogSearch] = useState<string>("");

  useEffect(() => {
    setPage(1);
  }, [range, directory, llm, logSearch]);

  const search_params = new URLSearchParams();
  search_params.set("page", String(page));
  search_params.set("row_count", "12");
  if (range.start) {
    search_params.set("start", String(formatDate(range.start)));
  }
  if (range.end) {
    search_params.set("end", String(formatDate(range.end)));
  }
  search_params.set("directory", directory);
  if (llm) search_params.set("llm", llm);
  const logTrimmed = logSearch.trim();
  if (logTrimmed) search_params.set("search_value", logTrimmed);

  const logDatasURL = `api/log/log_list?${search_params.toString()}`;

  const { data: logsData } = useGet<LogDatasProps>(logDatasURL, [
    "logsData",
    logDatasURL,
  ]);

  const [isDetailModal, setIsDetailModal] = useState<boolean>(false);
  const [detailTarget, setDetailTarget] = useState<LogDetailProps>();
  const [pendingTarget, setPendingTarget] = useState<LogDetailProps | null>(
    null,
  );

  const detailURL = pendingTarget
    ? `api/log/log_detail?log_id=${pendingTarget.log_id}`
    : "";

  const { data: detailData, isFetching: isDetailFetching } = useGet<
    DetailLogDataProps[]
  >(detailURL, ["detailData", pendingTarget?.log_id ?? 0], !!pendingTarget);

  useEffect(() => {
    if (pendingTarget && detailData && !isDetailFetching) {
      setDetailTarget(pendingTarget);
      setIsDetailModal(true);
      setPendingTarget(null);
    }
  }, [pendingTarget, detailData, isDetailFetching]);

  return (
    <>
      <div className="flex flex-row h-full px-5 gap-5">
        <div className="w-full h-full border bg-white rounded-xl relative shadow-md">
          <LogsHeader
            logSearch={logSearch}
            setLogSearch={setLogSearch}
            directory={directory}
            setDirectory={setDirectory}
            llm={llm}
            setLLM={setLLM}
            range={range}
            setRange={setRange}
          />
          <LogsTable
            logsData={logsData}
            page={page}
            setPage={setPage}
            onSelectDetail={setPendingTarget}
            pendingLogId={pendingTarget?.log_id ?? null}
            total={logsData?.total}
          />
        </div>
      </div>
      {isDetailModal && detailTarget && (
        <LogDetailModal
          detailTarget={detailTarget}
          detailData={detailData}
          setIsDetailModal={setIsDetailModal}
        />
      )}
    </>
  );
};

export default AdminLogs;
