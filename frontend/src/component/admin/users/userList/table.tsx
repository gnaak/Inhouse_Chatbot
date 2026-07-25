import Button from "@/component/common/form/button";
import Pagination from "@/component/common/pagination";
import Table, { Column } from "@/component/common/table/table";
import { USER_STATUSMAP } from "@/mapping/admin/map";
import { formatDateTime } from "@/utils/format/date";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModelItem {
  model_id: number;
  value: string;
  label: string;
  type: string;
}

const ModelsCell = ({ models }: { models: ModelItem[] }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (models.length === 0) return <span>-</span>;
  const visible = models.slice(0, 2);
  const rest = models.slice(2);

  const handleEnter = () => {
    if (rest.length === 0 || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
    });
  };

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
    >
      <div className="flex flex-wrap gap-1 justify-center">
        {visible.map((m) => (
          <span
            key={m.model_id}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 max-w-[110px] truncate"
            title={m.label}
          >
            {m.label}
          </span>
        ))}
        {rest.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-50 text-neutral-500 border border-neutral-200">
            +{rest.length}
          </span>
        )}
      </div>
      {pos &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="fixed z-[100] flex flex-wrap gap-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 min-w-[180px] max-w-[260px]"
          >
            {models.map((m) => (
              <span
                key={m.model_id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 truncate max-w-full"
                title={m.label}
              >
                {m.label}
              </span>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

const UsersTable = ({
  userDatas,
  total,
  userPage,
  setUserPage,
  setIsDetailPage,
  setTargetUserId,
}) => {
  const user_rows = userDatas?.user_list ?? [];
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
      render: (user_rows) => <span>{user_rows.department}</span>,
    },
    { key: "email", header: "이메일", align: "center", width: "13%" },
    {
      key: "accessable",
      header: "접근 가능 디렉토리",
      align: "center",
      width: "11%",
      render: (user_rows) => (
        <span className="truncate block">
          {(() => {
            const approved = user_rows.directory_list
              .filter(
                (req) => req.status === "approved" && req.directory_id != 1,
              )
              .sort((a, b) => {
                if (a.directory_id === 1) return -1;
                if (b.directory_id === 1) return 1;
                return 0;
              });

            if (approved.length === 0) return "-";

            const names = approved
              .slice(0, 2)
              .map((req) => req.name)
              .join(", ");

            return approved.length > 2 ? `${names}, ...` : names;
          })()}
        </span>
      ),
    },
    {
      key: "models",
      header: "AI 모델",
      align: "center",
      width: "20%",
      render: (user_rows) => (
        <ModelsCell models={user_rows.model_list ?? []} />
      ),
    },
    {
      key: "status",
      header: "계정 상태",
      align: "center",
      width: "8%",
      render: (user_rows) => <span>{USER_STATUSMAP[user_rows.status]}</span>,
    },
    {
      key: "created_at",
      header: "가입 시간",
      align: "center",
      width: "12%",
      render: (user_rows) => (
        <span className="truncate block">
          {formatDateTime(user_rows.created_at)}
        </span>
      ),
    },
    {
      key: "last_login_at",
      header: "마지막 로그인 시간",
      align: "center",
      width: "13%",
      render: (user_rows) => (
        <span className="truncate block">
          {user_rows.last_login_at
            ? formatDateTime(user_rows.last_login_at)
            : "-"}
        </span>
      ),
    },
    {
      key: "detail",
      header: "관리",
      align: "center",
      width: "8%",

      render: (user_rows) => (
        <Button
          variant="sub2"
          size="sm"
          className="bg-white border border-[#D4D4D4] !py-1"
        >
          <div
            onClick={() => {
              setIsDetailPage(true);
              setTargetUserId(user_rows.id);
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
      <Table columns={columns} data={user_rows} rowCount={12}/>
      <Pagination
        page={userPage}
        pageSize={12}
        onChange={(page) => setUserPage(page)}
        total={total}
      />
    </>
  );
};
export default UsersTable;
