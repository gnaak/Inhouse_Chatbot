import { useGet } from "@/hooks/common/useAPI";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { refreshExp } from "@/hooks/common/getCookie";
import { useAuth } from "@/hooks/common/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import Loading from "@/component/common/loading";
import ClientSidebar from "@/component/client/sideBar/sideBar";
import ClientHeader from "@/component/client/header/header";
import { UserDetail } from "@/types/client/user";
import { UserDirectoryProps } from "@/types/client/directory";
import NewDirectoryModal from "@/component/client/directory/modal/newDirectoryModal";

const ClientLayOut = () => {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: meData, isLoading: meLoading } = useGet<UserDetail>(
    "api/user/me",
    ["me", user?.id],
    !!user,
  );
  const { data: userDirectoryDatas } = useGet<UserDirectoryProps[]>(
    "api/user/get_user_directory",
    ["userDirectoryDatas", user?.id],
    !!user,
  );

  const isRefresh = refreshExp();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [directoryId, setDirectoryId] = useState<number | null>(null);
  const [newDirectory, setNewDirectory] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if ((!user && !isRefresh) || user?.auth_type == "admin") {
      navigate("/login");
    }
  }, [isLoading]);

  useEffect(() => {
    if (!userDirectoryDatas) return;
    const available = userDirectoryDatas.filter(
      (d) => d.id !== 1 && d.status === "approved",
    );
    setDirectoryId(available.length > 0 ? available[0].id : 1);
  }, [userDirectoryDatas]);

  if (isLoading || meLoading) return <Loading />;

  return (
    <div className="flex h-screen w-full bg-white">
      <ClientSidebar
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
        meData={meData}
        userDirectoryDatas={userDirectoryDatas}
        activeDirectoryId={directoryId}
        onSelectDirectory={(id) => {
          setDirectoryId(id);
          navigate(`/internal/${id}`);
        }}
        onNewDirectory={() => setNewDirectory(true)}
      />

      <main className="flex h-screen flex-1 flex-col min-w-0">
        <ClientHeader />
        <section className="relative flex-1 min-h-0">
          <div className="w-full h-full min-h-0">
            <Outlet
              context={{
                user,
                meData,
                directoryId,
                setDirectoryId,
                userDirectoryDatas,
                setNewDirectory,
              }}
            />
          </div>
        </section>
      </main>

      <NewDirectoryModal
        newDirectory={newDirectory}
        setNewDirectory={setNewDirectory}
      />
    </div>
  );
};
export default ClientLayOut;
