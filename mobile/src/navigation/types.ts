export type RootStackParamList = {
  Login: undefined;
  Home: { token: string };
  Agent: {
    projectId: number;
    projectName: string;
    token: string;
  };
  Project: {
    projectId: number;
    projectName: string;
    token: string;
  };
  FileManager: {
    projectId: number;
    token: string;
  };
  Editor: {
    projectId: number;
    fileId: number;
    fileName: string;
    fileContent: string;
    token: string;
  };
  Search: {
    token: string;
  };
  Notifications: {
    token: string;
  };
  Profile: {
    token: string;
    user: {
      id: number;
      username: string;
      displayName?: string;
      email?: string;
      bio?: string;
      location?: string;
      website?: string;
      avatarUrl?: string;
      profileImageUrl?: string;
      projectCount?: number;
      followersCount?: number;
      followingCount?: number;
    };
  };
  Settings: {
    token: string;
  };
  Deployments: {
    projectId: number;
    token: string;
  };
  Collaboration: {
    projectId: number;
    token: string;
  };
  Templates: {
    token: string;
  };
};
