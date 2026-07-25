import { BotIcon } from "lucide-react";
import ThemeToggle from "@/component/common/themeToggle";

const ClientHeader = () => {
  return (
    <>
      <header className="flex h-14 items-center gap-3 pl-16 pr-5 md:px-8 border-b shrink-0 justify-between bg-white">
        <div className="flex flex-row gap-3 items-center">
          <div className="shrink-0 h-7 w-7 border rounded-lg flex items-center justify-center bg-iconCircle">
            <BotIcon className="w-3.5 h-3.5 text-iconMain" />
          </div>
        </div>
        <div className="flex flex-row items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
    </>
  );
};

export default ClientHeader;
