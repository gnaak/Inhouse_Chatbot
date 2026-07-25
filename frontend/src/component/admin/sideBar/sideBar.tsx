import GroupLink from "./groupLink";
import SubLink from "./subLink";
import { BotIcon, LogOut, SidebarCloseIcon, SidebarOpenIcon } from "lucide-react";
import { usePost } from "@/hooks/common/useAPI";
import { useNavigate } from "react-router-dom";
import { AdminSidebarProps } from "@/types/admin/sidebar";

const AdminSidebar = ({
  collapsed,
  adminMenu,
  onToggleSidebar,
}: AdminSidebarProps) => {
  const navigate = useNavigate();
  const logoutMutation = usePost<void, void>("api/auth/logout_admin");

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/admin/login"),
    });
  };

  return (
    <aside
      className={`
        fixed md:static inset-y-0 left-0 z-50 md:z-auto h-screen flex flex-col overflow-hidden border-r transition-all duration-300 ease-in-out
        bg-main text-sub2 border-sub1
        ${collapsed ? "w-16" : "w-60"}
      `}
    >
      <div className="flex h-full flex-col">
        {/* 프로필 영역 */}
        <div className="group flex h-14 items-center px-6 flex-shrink-0 border-b border-sub1 relative">
          {collapsed ? (
            <div className="w-full flex items-center justify-center group-hover:opacity-0">
              <BotIcon className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <BotIcon className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">Inhouse Chatbot</span>
            </div>
          )}
          {collapsed ? (
            <SidebarOpenIcon
              className={`
                w-4 h-4 absolute top-1/2 -translate-y-1/2 right-6 z-10 text-white
                opacity-0 transition-opacity duration-200
                group-hover:opacity-100 cursor-pointer
              `}
              onClick={onToggleSidebar}
            />
          ) : (
            <SidebarCloseIcon
              className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 z-10 text-white cursor-pointer"
              onClick={onToggleSidebar}
            />
          )}
        </div>

        {/* 메뉴 리스트 */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="flex flex-col gap-1">
            {adminMenu.map((item, idx) =>
              item.type === "link" ? (
                <SubLink
                  key={`${item.to}-${idx}`}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  number={item.number}
                  collapsed={collapsed}
                />
              ) : (
                <GroupLink
                  key={`${item.title}-${idx}`}
                  item={item}
                  collapsed={collapsed}
                />
              ),
            )}
          </div>
        </nav>

        {/* 로그아웃 */}
        <div className="py-3 px-2  flex-shrink-0 border-t border-sub1 h-[62px] flex items-center">
          <button
            type="button"
            onClick={handleLogout}
            className={`
              w-full flex items-center rounded-md py-3 text-xs
              font-medium text-sub2 hover:text-white
              bg-transparent hover:bg-main-hover active:bg-main-active
              transition-all duration-200 px-4 gap-2.5
            `}
          >
            <LogOut className="h-4 w-4 text-white shrink-0" />
            {!collapsed && (
              <span className="truncate whitespace-nowrap">로그아웃</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
