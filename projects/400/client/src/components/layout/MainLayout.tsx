import React, { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Spin } from "antd";
import styled from "styled-components";
import { useAuth } from "../../hooks/useAuth";
import { AppHeader } from "../navigation/AppHeader";
import { Sidebar } from "../navigation/Sidebar";

const { Content } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

const FullHeightLayout = styled(Layout)`
  min-height: 100vh;
  background: undefined) => theme?.colors?.background || "#f5f5f5"};
`;

const MainContent = styled(Content)`
  margin: 0;
  padding: 16px;
  overflow: auto;
  background: undefined) => theme?.colors?.background || "#f5f5f5"};
`;

const CenteredSpinner = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthRoute = location.pathname.startsWith("/auth");

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthRoute) {
      navigate("/auth/login", { replace: true, state: { from: location } });
    }
    if (!isLoading && isAuthenticated && isAuthRoute) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, isAuthRoute, navigate, location]);

  if (isLoading) {
    return (
      <CenteredSpinner>
        <Spin size="large" />
      </CenteredSpinner>
    );
  }

  if (!isAuthenticated && isAuthRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <CenteredSpinner>
        <Spin size="large" />
      </CenteredSpinner>
    );
  }

  return (
    <FullHeightLayout>
      <Sidebar />
      <Layout>
        <AppHeader user={user} />
        <MainContent>{children}</MainContent>
      </Layout>
    </FullHeightLayout>
  );
};

export default MainLayout;