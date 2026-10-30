import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    const next = new URLSearchParams(location.search).get("next");
    const target = next ? decodeURIComponent(next) : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return children;
};

export default PublicRoute;
