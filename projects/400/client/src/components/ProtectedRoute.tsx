import React, { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export interface ProtectedRouteProps {
  isAuthenticated: boolean;
  redirectPath?: string;
  children?: ReactElement | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  redirectPath = "/login",
  children,
}) => {
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (children) {
    return children;
  }

  return <Outlet />;
};

export default ProtectedRoute;