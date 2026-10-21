import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface SplashAnimationProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onFinish }) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(15)).current;
  const pulseRingAnim = useRef(new Animated.Value(0.85)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0.5)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo Scale & Fade In
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse Ring Loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseRingAnim, {
            toValue: 1.35,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseRingAnim, {
            toValue: 0.85,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // 3. Text Slide & Fade In after slight delay
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 280);

    // 4. Smooth Exit Transition
    const exitTimer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }).start(() => {
        onFinish();
      });
    }, 1750);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, [fadeAnim, scaleAnim, textFadeAnim, textSlideAnim, exitFadeAnim, pulseRingAnim, pulseRingOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: exitFadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EBF8" />

      {/* Center Branding Content */}
      <View style={styles.centerContent}>
        {/* Animated Icon Card with Claymorphism */}
        <View style={styles.iconWrapper}>
          {/* Subtle pulsating outer ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseRingAnim }],
                opacity: pulseRingOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.clayTile,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Monogram / Brand Icon */}
            <View style={styles.monogramRow}>
              <Text style={styles.monogramA}>A</Text>
              <View style={styles.noteIndicator}>
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Brand Name & Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
              transform: [{ translateY: textSlideAnim }],
            },
          ]}
        >
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandTitleA}>A </Text>
            <Text style={styles.brandTitleNote}>Note</Text>
          </View>
          <Text style={styles.brandSubtitle}>CLIENT VIDEO &amp; REVENUE TRACKER</Text>
        </Animated.View>
      </View>

      {/* Bottom Version / Privacy Tag */}
      <Animated.View style={[styles.bottomTag, { opacity: textFadeAnim }]}>
        <Text style={styles.bottomTagText}>Verified Offline &bull; Clean Claymorphism</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#F0EBF8',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    width: 120,
    height: 120,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 135, 0.45)',
  },
  clayTile: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  monogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monogramA: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1E1B38',
    letterSpacing: -1,
  },
  noteIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00D287',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitleA: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E1B38',
    letterSpacing: -0.5,
  },
  brandTitleNote: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00D287',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8AAB',
    letterSpacing: 2.2,
    marginTop: 6,
  },
  bottomTag: {
    position: 'absolute',
    bottom: 38,
    alignItems: 'center',
  },
  bottomTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A09CB8',
  },
});
