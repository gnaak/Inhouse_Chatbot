import { formatDateTime } from "@/utils/format/date";
import {
  Building2Icon,
  HistoryIcon,
  MailIcon,
  UserIcon,
  UserSquareIcon,
} from "lucide-react";

const UserInfo = ({ meData }) => {
  const rows = [
    {
      icon: <UserIcon className="w-4 h-4 text-neutral-500" />,
      label: "이름",
      value: meData?.name,
    },
    {
      icon: <MailIcon className="w-4 h-4 text-neutral-500" />,
      label: "이메일",
      value: meData?.email,
    },
    {
      icon: <Building2Icon className="w-4 h-4 text-neutral-500" />,
      label: "조직",
      value: meData?.department_full_name,
    },
    {
      icon: <HistoryIcon className="w-4 h-4 text-neutral-500" />,
      label: "마지막 접속",
      value: meData?.last_login_at ? formatDateTime(meData?.last_login_at) : "-",
    },
  ];

  return (
    <section className="flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
      <div className="px-4 pt-5 pb-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
          <UserSquareIcon className="w-4 h-4 text-neutral-600" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-neutral-800">기본 정보</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            계정에 등록된 정보예요.
          </p>
        </div>
      </div>
      <div className="px-4 pb-6 flex flex-col">
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={`flex items-center gap-4 py-3 ${idx !== rows.length - 1 ? "border-b border-neutral-100" : ""}`}
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center shrink-0">
              {row.icon}
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-500 shrink-0">
                {row.label}
              </span>
              <span className="text-sm font-medium text-neutral-800 truncate">
                {row.value || "-"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default UserInfo;
