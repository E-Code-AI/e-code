/**
 * SwipeableRow - Reusable swipe-to-action component
 * Fortune 500-grade gesture handling with haptic feedback
 */

import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { mobileColors, mobileSpacing, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { haptics } from '../services/haptics';

interface SwipeAction {
  text: string;
  icon?: string;
  color: string;
  textColor?: string;
  onPress: () => void;
  testId?: string;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeOpen?: (direction: 'left' | 'right') => void;
  onSwipeClose?: () => void;
  enabled?: boolean;
}

const ACTION_WIDTH = 80;

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeOpen,
  onSwipeClose,
  enabled = true,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleSwipeOpen = useCallback((direction: 'left' | 'right') => {
    haptics.selection();
    onSwipeOpen?.(direction);
  }, [onSwipeOpen]);

  const handleSwipeClose = useCallback(() => {
    onSwipeClose?.();
  }, [onSwipeClose]);

  const renderAction = (
    action: SwipeAction,
    index: number,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    isLeft: boolean
  ) => {
    const totalActions = isLeft ? leftActions.length : rightActions.length;
    const actionIndex = isLeft ? index : totalActions - 1 - index;
    
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [isLeft ? -ACTION_WIDTH * (totalActions - actionIndex) : ACTION_WIDTH * (actionIndex + 1), 0],
    });

    const handlePress = () => {
      haptics.impact();
      action.onPress();
      close();
    };

    return (
      <Animated.View 
        key={`${isLeft ? 'left' : 'right'}-${index}`}
        style={[
          styles.actionContainer,
          { transform: [{ translateX: trans }] }
        ]}
      >
        <RectButton
          style={[styles.action, { backgroundColor: action.color }]}
          onPress={handlePress}
        >
          <View style={styles.actionContent} data-testid={action.testId}>
            {action.icon && <Text style={styles.actionIcon}>{action.icon}</Text>}
            <Text style={[styles.actionText, action.textColor ? { color: action.textColor } : null]}>
              {action.text}
            </Text>
          </View>
        </RectButton>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (leftActions.length === 0) return null;
    
    return (
      <View style={[styles.actionsContainer, { width: ACTION_WIDTH * leftActions.length }]}>
        {leftActions.map((action, index) => renderAction(action, index, progress, dragX, true))}
      </View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (rightActions.length === 0) return null;
    
    return (
      <View style={[styles.actionsContainer, { width: ACTION_WIDTH * rightActions.length }]}>
        {rightActions.map((action, index) => renderAction(action, index, progress, dragX, false))}
      </View>
    );
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={leftActions.length > 0 ? renderLeftActions : undefined}
      renderRightActions={rightActions.length > 0 ? renderRightActions : undefined}
      onSwipeableOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
    >
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  actionContainer: {
    flex: 1,
  },
  action: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

// Pre-defined action configurations for common use cases
export const swipeActions = {
  delete: (onPress: () => void): SwipeAction => ({
    text: 'Delete',
    icon: '🗑️',
    color: mobileColors.danger,
    onPress,
    testId: 'swipe-action-delete',
  }),
  
  edit: (onPress: () => void): SwipeAction => ({
    text: 'Edit',
    icon: '✏️',
    color: mobileColors.info,
    onPress,
    testId: 'swipe-action-edit',
  }),
  
  rename: (onPress: () => void): SwipeAction => ({
    text: 'Rename',
    icon: '📝',
    color: mobileColors.primary,
    onPress,
    testId: 'swipe-action-rename',
  }),
  
  duplicate: (onPress: () => void): SwipeAction => ({
    text: 'Copy',
    icon: '📋',
    color: mobileColors.secondary,
    textColor: mobileColors.text,
    onPress,
    testId: 'swipe-action-duplicate',
  }),
  
  archive: (onPress: () => void): SwipeAction => ({
    text: 'Archive',
    icon: '📦',
    color: mobileColors.textMuted,
    onPress,
    testId: 'swipe-action-archive',
  }),
};

export default SwipeableRow;
