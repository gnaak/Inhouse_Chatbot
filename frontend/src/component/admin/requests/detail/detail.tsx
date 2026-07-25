import { FolderIcon, KeyRoundIcon, UserPlusIcon } from "lucide-react";
import DetailDirectory from "./directory";
import DetailHeader from "./header";
import DetailUserInfo from "./userInfo";

const TYPE_LABEL: Record<string, { label: string; icon: any }> = {
  signin: { label: "계정 생성 요청", icon: UserPlusIcon },
  directory: { label: "디렉토리 접근 요청", icon: FolderIcon },
  password: { label: "비밀번호 초기화 요청", icon: KeyRoundIcon },
};

const RequestDetail = ({ setIsDetailPage, targetInfo }) => {
  const meta = TYPE_LABEL[targetInfo?.type] ?? TYPE_LABEL["directory"];
  const Icon = meta.icon;
  const isPassword = targetInfo?.type === "password";

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full max-w-5xl mx-auto px-2 py-4 flex flex-col gap-5 flex-1 min-h-0">
        <DetailHeader setIsDetailPage={setIsDetailPage} />
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* 요청 유형 배너 */}
          <section className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-neutral-400">
                  요청 유형
                </span>
                <h2 className="text-base font-semibold text-neutral-800">
                  {meta.label}
                </h2>
              </div>
            </div>
          </section>

          <DetailUserInfo targetInfo={targetInfo} />

          {!isPassword && (
            <section className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white border border-neutral-200/80 shadow-sm">
              <div className="flex-1 min-h-0 p-5 flex flex-col">
                <DetailDirectory targetInfo={targetInfo} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
