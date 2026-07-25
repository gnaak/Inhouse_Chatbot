import { useState } from "react";
import { FolderIcon, SparklesIcon } from "lucide-react";
import DetailDirectory from "./directory";
import DetailHeader from "./header";
import DetailUserInfo from "./userInfo";
import DetailModel from "./model";

type Tab = "directory" | "model";

const UsersDetail = ({ setIsDetailPage, targetInfo }) => {
  const [tab, setTab] = useState<Tab>("directory");

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full max-w-5xl mx-auto px-2 py-4 flex flex-col gap-5 h-full">
        <DetailHeader setIsDetailPage={setIsDetailPage} />
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <DetailUserInfo targetInfo={targetInfo} />

          <section className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
            <div className="px-5 pt-4 pb-3 flex items-center border-b border-neutral-100 shrink-0">
              <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
                <button
                  onClick={() => setTab("directory")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${tab === "directory" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                  <FolderIcon className="w-4 h-4" />
                  디렉토리
                </button>
                <button
                  onClick={() => setTab("model")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${tab === "model" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  모델
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-5 flex flex-col">
              {tab === "directory" && <DetailDirectory targetInfo={targetInfo} />}
              {tab === "model" && <DetailModel targetInfo={targetInfo} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UsersDetail;
