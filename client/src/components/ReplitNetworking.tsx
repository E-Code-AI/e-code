import NetworkingPanel from "@/components/NetworkingPanel";

interface ReplitNetworkingProps {
  projectId: number;
  className?: string;
}

export function ReplitNetworking({ projectId }: ReplitNetworkingProps) {
  return <NetworkingPanel projectId={String(projectId)} onClose={() => {}} />;
}
