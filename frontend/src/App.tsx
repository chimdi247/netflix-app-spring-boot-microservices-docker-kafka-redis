import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import LoginPage from "@/pages/login";
import BrowsePage from "@/pages/browse";
import WatchPage from "@/pages/watch";
import StudioPage from "@/pages/studio";
import NotFoundPage from "@/pages/not-found";

function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

/** The API refuses non-admins too (403 at the edge); this only keeps them from seeing a page that cannot work. */
function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<BrowsePage />} />
        <Route path="watch/:id" element={<WatchPage />} />
        <Route element={<RequireAdmin />}>
          <Route path="studio" element={<StudioPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
