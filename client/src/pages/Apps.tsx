import { AppsView } from "@/components/apps/AppsView";
import { AuthProvider } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Apps() {
  const [, setLocation] = useLocation();

  const handleOpenApp = (appId: number) => {
    // Redirect to IDE with the app/project ID
    setLocation(`/ide/${appId}`);
  };

  const handleBack = () => {
    // Go back to dashboard
    setLocation("/dashboard");
  };

  return (
    <AuthProvider>
      <AppsView onOpenApp={handleOpenApp} onBack={handleBack} />
    </AuthProvider>
  );
}
