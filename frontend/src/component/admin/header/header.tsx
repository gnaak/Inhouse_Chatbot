import { useLocation } from "react-router-dom";
import { BotIcon } from "lucide-react";
import { AdminHeaderProps } from "@/types/admin/sidebar";

const AdminHeader = ({ getTitleByPath }: AdminHeaderProps) => {
  const { pathname } = useLocation();
  const pageTitle = getTitleByPath(pathname);

  return (
    <header className="flex h-14 items-center gap-3 px-8 border-b shrink-0 bg-white text-sm">
      <div className="h-8 w-8 border rounded-lg flex items-center justify-center bg-[linear-gradient(to_bottom_right,#CACACA_0%,#FFFFFF_79%)]">
        <BotIcon className="w-4 h-4 text-neutral-700" />
      </div>
      <span className="font-bold">{pageTitle}</span>
    </header>
  );
};

export default AdminHeader;
