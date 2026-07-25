import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthProvider";
import { useThemeRouteSync } from "./hooks/common/useThemeRouteSync";
import ClientLayOut from "./container/client/layout";
import AdminLogin from "./container/admin/login";
import AdminLayout from "./container/admin/layout";
import AdminDirectory from "./container/admin/directory";
import NotFoundPage from "./container/notfound";
import ClientLogin from "./container/client/login";
import AdminUsers from "./container/admin/users";
import AdminLogs from "./container/admin/logs";
import AdminModels from "./container/admin/models";
import ClientInternal from "./container/client/internal";
import ClientProfile from "./container/client/profile";
import AdminRequests from "./container/admin/requests";
import ClientImage from "./container/client/image";
import ClientHome from "./container/client/home";
import ClientHistory from "./container/client/history";
import ClientGallery from "./container/client/gallery";
import ClientSetting from "./container/client/setting";

const ThemeRouteSync = () => {
  useThemeRouteSync();
  return null;
};

function App() {
  const queryClient = new QueryClient();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ThemeRouteSync />
            <Routes>
              <Route path="/login" element={<ClientLogin />} />
              <Route element={<ClientLayOut />}>
                <Route path="/" element={<ClientHome />} />
                <Route path="/internal/:directoryId" element={<ClientInternal />} />
                <Route path="/c/:sessionId" element={<ClientInternal />} />
                <Route path="/chatbot" element={<ClientInternal />} />
                <Route path="/image" element={<ClientImage />} />
                <Route path="/image/:imageSessionId" element={<ClientImage />} />
                <Route path="/history" element={<ClientHistory />} />
                <Route path="/gallery" element={<ClientGallery />} />
                <Route path="/profile" element={<ClientProfile />} />
                <Route path="/settings" element={<ClientSetting />} />
              </Route>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="" element={<AdminDirectory />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="models" element={<AdminModels />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
