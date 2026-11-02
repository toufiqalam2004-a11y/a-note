import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  TouchableWithoutFeedback,
  AccessibilityInfo,
} from 'react-native';
import { THEME } from '../constants/theme';
import { SPRING_PRESETS, TIMING_PRESETS } from '../utils/motion';

interface SplashAnimationProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onFinish }) => {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(12)).current;
  const pulseRingAnim = useRef(new Animated.Value(0.95)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0.6)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const exitScaleAnim = useRef(new Animated.Value(1)).current;

  const [reduceMotion, setReduceMotion] = useState(false);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const finishedRef = useRef(false);

  const safeFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
    }
    onFinish();
  }, [onFinish]);

  const handleSkipOrExit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
    }
    Animated.parallel([
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: TIMING_PRESETS.quick,
        useNativeDriver: true,
      }),
      Animated.timing(exitScaleAnim, {
        toValue: 1.03,
        duration: TIMING_PRESETS.quick,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [exitFadeAnim, exitScaleAnim, onFinish]);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && enabled) {
          setReduceMotion(true);
        }
      })
      .catch(() => {});

    if (reduceMotion) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      textFadeAnim.setValue(1);
      textSlideAnim.setValue(0);
      const timer = setTimeout(safeFinish, 900);
      return () => clearTimeout(timer);
    }

    // 1. Apple-inspired Logo Spring & Fade In
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...SPRING_PRESETS.snappy,
      }),
    ]).start();

    // 2. Coordinated Gentle Pulse Ring (max 2 cycles to avoid perpetual animation)
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseRingAnim, {
            toValue: 1.25,
            duration: 850,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseRingAnim, {
            toValue: 0.95,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseRingOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: 2 }
    );
    pulseLoopRef.current.start();

    // 3. Text Slide & Fade In shortly after logo stabilizes
    const textTimer = setTimeout(() => {
      if (!mounted) return;
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(textSlideAnim, {
          toValue: 0,
          ...SPRING_PRESETS.snappy,
        }),
      ]).start();
    }, 180);

    // 4. Smooth, unhurried exit after 1.5s total
    const exitTimer = setTimeout(() => {
      if (!mounted || finishedRef.current) return;
      handleSkipOrExit();
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
      }
    };
  }, [
    fadeAnim,
    scaleAnim,
    textFadeAnim,
    textSlideAnim,
    exitFadeAnim,
    exitScaleAnim,
    pulseRingAnim,
    pulseRingOpacity,
    reduceMotion,
    safeFinish,
    handleSkipOrExit,
  ]);

  return (
    <TouchableWithoutFeedback onPress={handleSkipOrExit} accessibilityLabel="Skip Splash">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: exitFadeAnim,
            transform: [{ scale: exitScaleAnim }],
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F0EBF8" />

        {/* Center Branding Content */}
        <View style={styles.centerContent}>
          {/* Animated Icon Card with Claymorphism */}
          <View style={styles.iconWrapper}>
            {/* Subtle pulsating outer ring */}
            {!reduceMotion && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseRingAnim }],
                    opacity: pulseRingOpacity,
                  },
                ]}
              />
            )}

            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Image
                source={require('../../assets/images/anote-logo.png')}
                style={styles.officialLogo}
                resizeMode="contain"
              />
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

        {/* Bottom Tag */}
        <Animated.View style={[styles.bottomTag, { opacity: textFadeAnim }]}>
          <Text style={styles.bottomTagText}>Verified Offline &bull; Clean Claymorphism</Text>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
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
    width: 124,
    height: 124,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 135, 0.45)',
  },
  logoWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  officialLogo: {
    width: 96,
    height: 96,
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
