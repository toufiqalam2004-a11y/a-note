import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { BlurView, BlurTint } from 'expo-blur';

export interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurTint;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  elevation?: number;
  overflow?: 'hidden' | 'visible';
}

/**
 * Premium Apple-inspired Liquid Glass Surface component.
 * Features:
 * - Dynamic backdrop blur using expo-blur (native UIVisualEffectView on iOS).
 * - Layered translucent tint with specular highlight borders.
 * - Respects iOS Reduce Transparency accessibility setting with opaque high-contrast fallback.
 * - Preserves Android appearance and performance with hardware-accelerated fallback.
 */
export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  contentStyle,
  intensity = 45,
  tint = 'light',
  borderRadius = 22,
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.65)',
  backgroundColor = 'rgba(255, 255, 255, 0.76)',
  elevation = 4,
  overflow = 'hidden',
}) => {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios' && typeof AccessibilityInfo.isReduceTransparencyEnabled === 'function') {
      AccessibilityInfo.isReduceTransparencyEnabled()
        .then((enabled) => setReduceTransparency(enabled))
        .catch(() => {});

      const sub = AccessibilityInfo.addEventListener?.(
        'reduceTransparencyChanged',
        (enabled) => setReduceTransparency(enabled)
      );
      return () => {
        sub?.remove?.();
      };
    }
  }, []);

  const flatStyle = (StyleSheet.flatten(style) as ViewStyle) || {};
  const {
    flexDirection,
    alignItems,
    justifyContent,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
  } = flatStyle;

  const effectiveRadii = {
    borderRadius: flatStyle.borderRadius ?? borderRadius,
    borderTopLeftRadius: borderTopLeftRadius ?? flatStyle.borderTopLeftRadius ?? flatStyle.borderRadius ?? borderRadius,
    borderTopRightRadius: borderTopRightRadius ?? flatStyle.borderTopRightRadius ?? flatStyle.borderRadius ?? borderRadius,
    borderBottomLeftRadius: borderBottomLeftRadius ?? flatStyle.borderBottomLeftRadius ?? flatStyle.borderRadius ?? borderRadius,
    borderBottomRightRadius: borderBottomRightRadius ?? flatStyle.borderBottomRightRadius ?? flatStyle.borderRadius ?? borderRadius,
  };

  const isIOS = Platform.OS === 'ios';
  const effectiveIntensity = reduceTransparency ? 0 : intensity;
  const effectiveIOSBackground = reduceTransparency ? '#FFFFFF' : backgroundColor;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius,
          borderWidth,
          borderColor: isIOS && reduceTransparency ? 'rgba(142, 138, 171, 0.25)' : borderColor,
          elevation,
          shadowOpacity: elevation > 0 ? (isIOS ? 0.08 : 0.08) : 0,
          overflow,
          backgroundColor: isIOS ? 'transparent' : 'rgba(255, 255, 255, 0.82)',
        },
        style,
      ]}
    >
      {!reduceTransparency && (
        <BlurView
          intensity={effectiveIntensity}
          tint={tint}
          style={[
            StyleSheet.absoluteFill,
            effectiveRadii,
            {
              backgroundColor: !isIOS ? backgroundColor : undefined,
            },
          ]}
        />
      )}
      {/* Specular sheen / translucent overlay */}
      <View
        style={[
          styles.contentLayer,
          effectiveRadii,
          {
            backgroundColor: isIOS ? effectiveIOSBackground : undefined,
            flexDirection,
            alignItems,
            justifyContent,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#5B409E',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  contentLayer: {
    width: '100%',
  },
});
