import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Terminal } from '../components/Terminal';
import { mobileColors } from '../../../shared/theme/mobile-theme';

type TerminalScreenProps = NativeStackScreenProps<RootStackParamList, 'Terminal'> & {
  projectId: number;
  token: string;
};

const TerminalScreen: React.FC<TerminalScreenProps> = ({ route, token }) => {
  const { projectId } = route.params;

  return (
    <View style={styles.container}>
      <Terminal
        projectId={projectId}
        token={token}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  }
});

export default TerminalScreen;
