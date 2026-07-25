import { parseUserInfo, refreshExp } from "@/hooks/common/getCookie";
import { useGet, useRefreshToken } from "@/hooks/common/useAPI";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "@/component/admin/sideBar/sideBar";
import { AdminMenuItem } from "@/types/admin/sidebar";
import AdminHeader from "@/component/admin/header/header";
import {
  CpuIcon,
  FolderIcon,
  MessageSquareIcon,
  MonitorIcon,
  TicketPlusIcon,
  Users2Icon,
} from "lucide-react";

const AdminLayout = () => {
  const user = parseUserInfo("admin");
  const isRefresh = refreshExp("admin");
  const refresh = useRefreshToken();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const { data: waitingRequests } = useGet<number>(
    "api/request/waiting_requests",
    ["requestNumber"],
  );

  useEffect(() => {
    if (!user && isRefresh) {
      refresh()
        .then(() => {
          window.location.reload();
        })
        .catch(() => {});
    }
    if ((!user && !isRefresh) || user.auth_type != "admin") {
      navigate("/admin/login");
    }
  }, []);

  const adminMenu: AdminMenuItem[] = [
    {
      type: "link",
      label: "디렉토리 관리",
      to: "/admin",
      icon: FolderIcon,
    },
    {
      type: "link",
      label: "사용자 관리",
      to: "/admin/users",
      icon: Users2Icon,
    },
    {
      type: "link",
      label: "요청 관리",
      to: "/admin/requests",
      icon: TicketPlusIcon,
      number: waitingRequests,
    },
    {
      type: "link",
      label: "AI 챗봇 사용 기록",
      to: "/admin/logs",
      icon: MessageSquareIcon,
    },
    {
      type: "link",
      label: "AI 모델 관리",
      to: "/admin/models",
      icon: CpuIcon,
    },
  ];

  const routeTitle: Record<string, string> = adminMenu.reduce(
    (acc, item) => {
      if (item.type === "link") {
        acc[item.to] = item.label;
      } else {
        item.children.forEach((child) => {
          acc[child.to] = child.label;
        });
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const getTitleByPath = (pathname: string) => {
    const key = Object.keys(routeTitle)
      .sort((a, b) => b.length - a.length)
      .find((k) => pathname === k || pathname.startsWith(k + "/"));

    return (key && routeTitle[key]) || "Unknown Mode";
  };

  return (
    <>
      <div className="flex xl:hidden h-screen overflow-hidden flex-col items-center justify-center px-6">
        <div className="text-center flex flex-col items-center gap-6">
          <div className="flex items-center justify-center rounded-full bg-iconCircle p-5 shrink-0">
            <MonitorIcon className="w-24 h-24 text-iconMain" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            관리자 페이지는
            <span className="text-3xl">&nbsp;1440px&nbsp;</span>
            이상의 화면에서만 이용 가능합니다.
          </h2>

          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto">
            노트북 또는 데스크톱 환경에서 접속해 주세요.
          </p>
        </div>
      </div>
      <div className="hidden xl:flex h-screen w-full bg-adminMain text-textMain">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          adminMenu={adminMenu}
          onToggleSidebar={handleToggleSidebar}
        />

        <main className="flex h-screen flex-1 flex-col min-w-0">
          <AdminHeader getTitleByPath={getTitleByPath} />
          <section className="relative flex-1 p-4 py-6 min-h-0">
            <div className="w-full h-full min-h-0">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default AdminLayout;
