import { ArrowLeftIcon } from "lucide-react";

const DetailHeader = ({ setIsDetailPage }) => {
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 transition-colors w-fit"
      onClick={() => setIsDetailPage(false)}
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span>목록으로</span>
    </button>
  );
};

export default DetailHeader;
