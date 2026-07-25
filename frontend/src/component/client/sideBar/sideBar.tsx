import {
  BanIcon,
  BotIcon,
  // Building2Icon,
  ChevronDownIcon,
  ImageIcon,
  ImagesIcon,
  LogOut,
  MessageSquareIcon,
  PlusCircleIcon,
  PlusIcon,
  Search,
  Settings,
  SidebarCloseIcon,
  SidebarOpenIcon,
  User2Icon,
  // SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useGet, usePost } from "@/hooks/common/useAPI";
import Modal from "@/component/common/feedback/modal";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/common/useAuth";
import { UserDetail } from "@/types/client/user";
import { UserDirectoryProps } from "@/types/client/directory";
import RecentLogItem, { RecentLog } from "./recentLogItem";

interface ClientSidebarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  meData: UserDetail | undefined;
  userDirectoryDatas: UserDirectoryProps[] | undefined;
  activeDirectoryId: number | null;
  onSelectDirectory: (id: number) => void;
  onNewDirectory: () => void;
}

const ClientSidebar = ({
  collapsed,
  onToggleSidebar,
  meData,
  userDirectoryDatas,
  activeDirectoryId,
  onSelectDirectory,
  onNewDirectory,
}: ClientSidebarProps) => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  // const location = useLocation();
  const logoutMutation = usePost<void, void>("api/auth/logout");

  // const isInternalPath = location.pathname.startsWith("/internal");

  // const handleInternalClick = () => {
  //   if (activeDirectoryId && approvedDirectories.some((d) => d.id === activeDirectoryId)) {
  //     navigate(`/internal/${activeDirectoryId}`);
  //   } else if (approvedDirectories.length > 0) {
  //     navigate(`/internal/${approvedDirectories[0].id}`);
  //   } else {
  //     navigate("/");
  //   }
  // };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        navigate("/login");
      },
    });
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(
    () => localStorage.getItem("sidebarHistoryOpen") !== "false",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  // const [directoryOpen, setDirectoryOpen] = useState(true);

  const location = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  const { data: imageModels = [], isLoading: imageModelsLoading } = useGet<
    { value: string; label: string }[]
  >("api/models/image", ["models-image"]);
  const [showNoImageModal, setShowNoImageModal] = useState(false);

  const handleImageClick = () => {
    if (!imageModelsLoading && imageModels.length === 0) {
      setShowNoImageModal(true);
      return;
    }
    navigate("/image");
  };

  const { data: recentLogs } = useGet<RecentLog[]>(
    "api/log/my_recent?limit=50",
    ["recentLogs"],
  );

  const trimmedQuery = searchQuery.trim();
  const { data: searchResults, isFetching: isSearching } = useGet<RecentLog[]>(
    `api/log/my_search?q=${encodeURIComponent(trimmedQuery)}&limit=30`,
    ["logSearch", trimmedQuery],
    searchOpen && trimmedQuery.length > 0,
  );

  const approvedDirectories =
    userDirectoryDatas?.filter((d) => d.id !== 1 && d.status === "approved") ??
    [];

  const navItem = (isActive = false) =>
    `flex items-center rounded-lg select-none transition-all duration-300 min-w-0 h-[36px] w-full overflow-hidden px-4 gap-3.5 text-sm whitespace-nowrap
    ${
      isActive
        ? "bg-neutral-100 text-neutral-900 font-medium"
        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
    }`;

  const labelClass = "text-xs font-medium";

  return (
    <>
      {/* 모바일 트리거 버튼 (사이드바가 닫혀있을 때만) */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-[28px] -translate-y-1/2 left-3 z-30 w-9 h-9 bg-white flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
          aria-label="사이드바 열기"
        >
          <SidebarOpenIcon className="w-4 h-4" />
        </button>
      )}

      {/* 모바일 백드롭 */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50 md:z-auto h-screen flex flex-col overflow-hidden border-r bg-white transition-all duration-300 ease-in-out
        w-60
        ${collapsed ? "md:w-16" : "md:w-60"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* 헤더: 로고 + 토글 */}
        <div className="flex h-14 items-center px-3 border-b shrink-0 relative group">
          {/* 확장 상태 */}
          <div
            className={`absolute inset-0 flex items-center px-6 transition-opacity duration-300 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <BotIcon className="w-4 h-4 text-neutral-700" />
              <span className="text-sm font-semibold text-neutral-800">Inhouse Chatbot</span>
            </div>
            <SidebarCloseIcon
              className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 cursor-pointer text-neutral-600 hover:text-neutral-800"
              onClick={() => {
                if (mobileOpen) setMobileOpen(false);
                else onToggleSidebar();
              }}
            />
          </div>
          {/* 축소 상태: hover 시에만 열기 아이콘 표시 */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${collapsed ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <SidebarOpenIcon
              className="w-4 h-4 opacity-100 transition-opacity cursor-pointer text-neutral-600 hover:text-neutral-800"
              onClick={onToggleSidebar}
            />
          </div>
        </div>

        {/* 스크롤 영역 */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-1">
          {/* ── 새 채팅 ── */}
          <div className="px-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center rounded-lg select-none transition-all duration-300 min-w-0 h-[44px] w-full overflow-hidden whitespace-nowrap text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 px-4 gap-3.5 text-sm"
            >
              <PlusCircleIcon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>새 채팅</span>
            </button>
          </div>
          <div className="mx-3 border-t my-1" />
          {/* ── 검색 ── */}
          <div className="px-2">
            <button onClick={() => setSearchOpen(true)} className={navItem()}>
              <Search className="w-4 h-4 shrink-0" />
              <span className={labelClass}>검색</span>
            </button>
          </div>
          {/* ── 채팅 ── */}
          <div className="px-2">
            <NavLink
              to="/history"
              end
              className={({ isActive }) => navItem(isActive)}
            >
              <MessageSquareIcon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>채팅</span>
            </NavLink>
          </div>
          <div className="mx-3 border-t my-1" />
          {/* ── 내부용 챗봇 ── */}
          {/*
          <div className="px-2">
            <button
              onClick={handleInternalClick}
              className={navItem(isInternalPath)}
            >
              <Building2Icon className="w-4 h-4 shrink-0" />
              <span className={`${labelClass} flex-1 text-left`}>내부용 챗봇</span>
              {!collapsed && approvedDirectories.length > 0 && (
                <ChevronDownIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    setDirectoryOpen((v) => !v);
                  }}
                  className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${directoryOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {!collapsed && directoryOpen && approvedDirectories.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                {approvedDirectories.map((dir) => (
                  <button
                    key={dir.id}
                    onClick={() => onSelectDirectory(dir.id)}
                    className={`
                      w-full text-left text-xs px-3 py-2 rounded-lg truncate transition-colors
                      ${
                        activeDirectoryId === dir.id
                          ? "text-neutral-700 font-medium"
                          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                      }
                    `}
                  >
                    {dir.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          */}
          {/* ── 외부용 챗봇 ── */}
          {/*
          <div className="px-2">
            <NavLink
              to="/chatbot"
              end
              className={({ isActive }) => navItem(isActive)}
            >
              <SparklesIcon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>외부용 챗봇</span>
            </NavLink>
          </div>

          <div className="mx-3 border-t my-1" />
          */}
          {/* ── 이미지 생성 ── */}
          <div className="px-2">
            <button
              onClick={handleImageClick}
              className={navItem(location.pathname === "/image")}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>이미지 생성</span>
            </button>
          </div>{" "}
          {/* ── 갤러리 ── */}
          <div className="px-2">
            <NavLink
              to="/gallery"
              end
              className={({ isActive }) => navItem(isActive)}
            >
              <ImagesIcon className="w-4 h-4 shrink-0" />
              <span className={labelClass}>갤러리</span>
            </NavLink>
          </div>
          {/* ── 최근 항목 ── */}
          {!collapsed && (
            <div className="px-2 mt-12">
              <button
                onClick={() =>
                  !collapsed &&
                  setHistoryOpen((v) => {
                    const next = !v;
                    localStorage.setItem("sidebarHistoryOpen", String(next));
                    return next;
                  })
                }
                className={navItem()}
              >
                <span className="text-xs font-medium flex-1 text-left text-neutral-500">
                  최근 항목
                </span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`}
                />
              </button>

              {!collapsed && historyOpen && (
                <div className="mt-1 flex flex-col gap-0.5 overflow-y-auto max-h-96">
                  {recentLogs && recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <RecentLogItem key={log.id} log={log} />
                    ))
                  ) : (
                    <p className="px-3 py-2 text-[11px] text-neutral-400">
                      아직 기록이 없어요.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* 하단: 유저 프로필 */}
        <div className="border-t px-2 py-3 shrink-0 relative" ref={profileRef}>
          {/* 프로필 팝오버 */}
          {profileOpen && !collapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border rounded-xl shadow-lg overflow-hidden">
              {approvedDirectories.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                    디렉토리
                  </p>
                  {approvedDirectories.map((dir) => (
                    <button
                      key={dir.id}
                      onClick={() => {
                        onSelectDirectory(dir.id);
                        setProfileOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors
                        ${
                          activeDirectoryId === dir.id
                            ? "bg-neutral-100 text-neutral-900 font-medium"
                            : "text-neutral-600 hover:bg-neutral-50"
                        }`}
                    >
                      {dir.name}
                    </button>
                  ))}
                  <div className="mx-3 border-t my-1" />
                </>
              )}
              <button
                onClick={() => {
                  onNewDirectory();
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <PlusIcon className="w-4 h-4 shrink-0" />
                <span>디렉토리 신청</span>
              </button>
              <div className="mx-3 border-t" />
              <NavLink
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <User2Icon className="w-4 h-4 shrink-0" />
                <span>내 정보</span>
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>설정</span>
              </NavLink>
              <div className="mx-3 border-t" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
          <button
            onClick={() => !collapsed && setProfileOpen((v) => !v)}
            className={`flex items-center gap-3 rounded-xl h-[62px] w-full overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "px-[6px]" : "p-3 border hover:bg-neutral-50"}`}
          >
            <div className="flex items-center justify-center bg-neutral-100 w-9 h-9 rounded-lg shrink-0">
              <UserIcon className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden text-left">
              <span className="text-xs font-medium text-neutral-800 truncate">
                {meData?.name}
              </span>
              <span className="text-[11px] text-neutral-400 truncate">
                {meData?.email}
              </span>
            </div>
          </button>
        </div>
      </aside>

      <Modal
        open={showNoImageModal}
        onClose={() => setShowNoImageModal(false)}
        title="접근 권한 없음"
        description={
          <div className="flex flex-col">
            <span>이미지 생성 모델에 대한 접근 권한이 없습니다.</span>
            <span>관리자에게 문의해주세요.</span>
          </div>
        }
        buttonCount={1}
        primaryText="확인"
        onPrimary={() => setShowNoImageModal(false)}
        closeOnOverlay={false}
        icon={
          <div className="bg-iconCircle p-3 rounded-full h-12 w-12 shrink-0 flex items-center justify-center">
            <BanIcon className="text-iconMain" />
          </div>
        }
      />

      {/* 검색 모달 */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30 px-5"
          onClick={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[60vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="채팅 검색"
                className="flex-1 text-xs outline-none text-neutral-800 placeholder:text-neutral-400"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                ESC
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {trimmedQuery.length === 0 ? (
                recentLogs && recentLogs.length > 0 ? (
                  <div className="flex flex-col py-1">
                    <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                      최근 항목
                    </div>
                    {recentLogs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => {
                          navigate(`/c/${log.session}`);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-50 flex items-center gap-2 min-w-0"
                        title={log.title}
                      >
                        <span className="flex-1 min-w-0 truncate text-xs text-neutral-700">
                          {log.title}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 max-w-[100px] truncate">
                          {log.directory_name || "내부"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-neutral-400">
                    채팅 내용으로 검색해보세요.
                  </div>
                )
              ) : isSearching && !searchResults ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-400">
                  검색 중...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="flex flex-col py-1">
                  {searchResults.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => {
                        navigate(`/c/${log.session}`);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-50 flex items-center gap-2 min-w-0"
                      title={log.title}
                    >
                      <span className="flex-1 min-w-0 truncate text-xs text-neutral-700">
                        {log.title}
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 max-w-[100px] truncate">
                        {log.directory_name || "내부"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-neutral-400">
                  검색 결과가 없어요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientSidebar;
