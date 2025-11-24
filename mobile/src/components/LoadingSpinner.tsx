import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type LoadingSpinnerProps = {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  fullScreen = false
}) => {
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={mobileColors.primary.default} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: mobileSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileColors.background.primary
  },
  text: {
    marginTop: mobileSpacing.md,
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.text.secondary,
    textAlign: 'center'
  }
});
