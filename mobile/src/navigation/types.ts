export type RootStackParamList = {
  Login: undefined;
  Home: { token: string };
  Main: undefined;
  Agent: {
    projectId: number;
    projectName: string;
    token?: string;
  };
  Project: {
    projectId: number;
    projectName: string;
    token?: string;
  };
  FileManager: {
    projectId?: number;
    token?: string;
  };
  Editor: {
    projectId: number;
    fileId: number;
    fileName: string;
    fileContent: string;
    token?: string;
  };
  Search: {
    token?: string;
  };
  Notifications: {
    token?: string;
  };
  Profile: {
    token?: string;
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
  Settings: undefined;
  Deployments: {
    projectId?: number;
    token?: string;
  };
  Collaboration: {
    projectId?: number;
    token?: string;
  };
  Templates: {
    token?: string;
  };
  Terminal: {
    projectId?: number;
    token?: string;
  };
  Help: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Notifications: undefined;
  Settings: undefined;
};
