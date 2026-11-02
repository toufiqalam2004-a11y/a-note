import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { PressableScale } from './PressableScale';

interface WelcomeCardProps {
  userName?: string;
  onHowItWorks?: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  userName = 'Toufiq',
  onHowItWorks,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && enabled) setReduceMotion(true);
      })
      .catch(() => {});

    if (reduceMotion) return;

    // Gentle restrained floating motion (max 4 cycles on initial display, then rests)
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3.5,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    );
    floatLoop.start();

    return () => {
      mounted = false;
      floatLoop.stop();
    };
  }, [floatAnim, reduceMotion]);

  return (
    <View style={styles.card}>
      {/* Left Message Column */}
      <View style={styles.textColumn}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Hey, {userName}!</Text>
          <Text style={styles.waveEmoji}>👋</Text>
        </View>
        <Text style={styles.subtitleText}>
          Keep creating amazing edits
        </Text>
        {onHowItWorks && (
          <PressableScale
            style={styles.howItWorksChip}
            onPress={onHowItWorks}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel="How A Note Works"
          >
            <Ionicons name="bulb-outline" size={13} color={THEME.colors.mintDark} />
            <Text style={styles.howItWorksText}>How It Works</Text>
          </PressableScale>
        )}
      </View>

      {/* Right 3D Creator Avatar & Floating Cam */}
      <View style={styles.illustrationContainer}>
        {/* Floating Green Video Icon with soft 3D glow */}
        <Animated.View
          style={[
            styles.floatingCamBadge,
            !reduceMotion && { transform: [{ translateY: floatAnim }] },
          ]}
        >
          <Ionicons name="videocam" size={14} color="#FFFFFF" />
        </Animated.View>

        {/* 3D Creator Character Representation */}
        <View style={styles.avatarWrapper}>
          {/* Hair / Head */}
          <View style={styles.characterHead}>
            <View style={styles.characterFace}>
              <View style={styles.characterEyeLeft} />
              <View style={styles.characterEyeRight} />
              <View style={styles.characterSmile} />
            </View>
          </View>
          {/* Dark Hoodie Body */}
          <View style={styles.characterBody}>
            {/* 3D Laptop Representation */}
            <View style={styles.laptopScreen}>
              <View style={styles.laptopLogo} />
            </View>
            <View style={styles.laptopBase} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  textColumn: {
    flex: 1,
    paddingRight: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  waveEmoji: {
    fontSize: 20,
  },
  subtitleText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 18,
  },
  howItWorksChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.25)',
  },
  howItWorksText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.mintDark,
  },
  illustrationContainer: {
    width: 86,
    height: 76,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingCamBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 70,
    height: 70,
  },
  characterHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D3142', // Dark hair
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  characterFace: {
    width: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD3B6', // Warm skin tone
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  characterEyeLeft: {
    position: 'absolute',
    top: 7,
    left: 6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2D3142',
  },
  characterEyeRight: {
    position: 'absolute',
    top: 7,
    right: 6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2D3142',
  },
  characterSmile: {
    width: 6,
    height: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E07A5F',
    borderRadius: 3,
    marginTop: 5,
  },
  characterBody: {
    width: 54,
    height: 26,
    backgroundColor: '#1E1B38', // Charcoal hoodie
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  laptopScreen: {
    position: 'absolute',
    bottom: 4,
    width: 38,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#95A5A6', // Silver laptop back
    borderWidth: 1,
    borderColor: '#7F8C8D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  laptopLogo: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  laptopBase: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#BDC3C7',
  },
});
