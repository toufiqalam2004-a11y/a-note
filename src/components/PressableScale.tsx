import React, { useRef, useEffect, useState } from 'react';
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
  Insets,
  AccessibilityInfo,
} from 'react-native';
import { SPRING_PRESETS } from '../utils/motion';

export interface PressableScaleProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  activeScale?: number;
  activeOpacity?: number;
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  hitSlop?: Insets | number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  testID?: string;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  containerStyle,
  activeScale = 0.96,
  activeOpacity = 0.88,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  disabled = false,
  hitSlop,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityValue,
  testID,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;

    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: activeScale,
          ...SPRING_PRESETS.press,
        }),
        Animated.timing(opacityAnim, {
          toValue: activeOpacity,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;

    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...SPRING_PRESETS.snappy,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (onPressOut) onPressOut(e);
  };

  // Automatically lift outer flexbox and dimensions to the parent Pressable
  const flattened = StyleSheet.flatten(style) || {};
  const pressableLayout: ViewStyle = {};

  if (flattened.flex !== undefined) pressableLayout.flex = flattened.flex;
  if (flattened.flexGrow !== undefined) pressableLayout.flexGrow = flattened.flexGrow;
  if (flattened.flexShrink !== undefined) pressableLayout.flexShrink = flattened.flexShrink;
  if (flattened.flexBasis !== undefined) pressableLayout.flexBasis = flattened.flexBasis;
  if (flattened.width !== undefined) pressableLayout.width = flattened.width;
  if (flattened.minWidth !== undefined) pressableLayout.minWidth = flattened.minWidth;
  if (flattened.maxWidth !== undefined) pressableLayout.maxWidth = flattened.maxWidth;
  if (flattened.margin !== undefined) pressableLayout.margin = flattened.margin;
  if (flattened.marginTop !== undefined) pressableLayout.marginTop = flattened.marginTop;
  if (flattened.marginBottom !== undefined) pressableLayout.marginBottom = flattened.marginBottom;
  if (flattened.marginLeft !== undefined) pressableLayout.marginLeft = flattened.marginLeft;
  if (flattened.marginRight !== undefined) pressableLayout.marginRight = flattened.marginRight;
  if (flattened.marginHorizontal !== undefined) pressableLayout.marginHorizontal = flattened.marginHorizontal;
  if (flattened.marginVertical !== undefined) pressableLayout.marginVertical = flattened.marginVertical;
  if (flattened.alignSelf !== undefined) {
    pressableLayout.alignSelf = flattened.alignSelf;
  } else {
    pressableLayout.alignSelf = 'stretch';
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityValue={accessibilityValue}
      testID={testID}
      style={[pressableLayout, containerStyle]}
    >
      <Animated.View
        style={[
          style,
          pressableLayout.flex !== undefined && { flex: 1, width: '100%' },
          !reduceMotion && {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};
