import React, { useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  GestureHandlerRootView,
  TapGestureHandler,
  State,
  TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

interface CommandPaletteGestureWrapperProps {
  children: React.ReactNode;
  onTripleTap: () => void;
  enabled?: boolean;
}

export const CommandPaletteGestureWrapper: React.FC<CommandPaletteGestureWrapperProps> = ({
  children,
  onTripleTap,
  enabled = true,
}) => {
  const doubleTapRef = useRef<TapGestureHandler>(null);

  const handleThreeFingerTap = useCallback(
    (event: TapGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.state === State.ACTIVE && enabled) {
        onTripleTap();
      }
    },
    [onTripleTap, enabled]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <TapGestureHandler
        numberOfTaps={1}
        numberOfPointers={3}
        onHandlerStateChange={handleThreeFingerTap}
      >
        <View style={styles.container}>{children}</View>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CommandPaletteGestureWrapper;
