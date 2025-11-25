import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography } from '../../../shared/theme/mobile-theme';

type StatusBarProps = {
  status: 'online' | 'offline' | 'syncing' | 'error';
  message?: string;
};

export const StatusBar: React.FC<StatusBarProps> = ({ status, message }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'offline':
        return '#6b7280';
      case 'syncing':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '⚫';
      case 'syncing':
        return '🔄';
      case 'error':
        return '🔴';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Connected';
      case 'offline':
        return 'Offline';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Connection Error';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() + '20' }]}>
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border.subtle
  },
  icon: {
    fontSize: 16,
    marginRight: mobileSpacing.sm
  },
  textContainer: {
    flex: 1
  },
  statusText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600'
  },
  message: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.text.secondary,
    marginTop: 2
  }
});
