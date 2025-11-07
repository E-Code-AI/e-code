export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Agent: {
    projectId: number;
    projectName: string;
  };
  Project: {
    projectId: number;
    projectName: string;
  };
};
