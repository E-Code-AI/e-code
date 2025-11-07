declare module 'expo-constants' {
  interface ExpoConfig {
    extra?: Record<string, any>;
  }
  
  const Constants: {
    expoConfig?: ExpoConfig;
  };
  
  export default Constants;
}
