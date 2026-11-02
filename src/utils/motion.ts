import { AccessibilityInfo, Animated, Platform } from 'react-native';

/**
 * Standard Apple-inspired spring physics configurations
 * Based on Apple's Designing Fluid Interfaces (WWDC) & Emil Kowalski's principles.
 * 
 * In React Native's Animated API:
 * - tension/friction: map to response & damping
 * - tension: 50 (~0.35s response)
 * - friction: 8 (~1.0 damping ratio, critically damped, no overshoot)
 * - bouncier: friction 5-6 (~0.8 damping ratio, slight controlled overshoot)
 */

export const SPRING_PRESETS = {
  // Critically damped default for buttons, cards, menus (no bounce/overshoot)
  snappy: {
    tension: 65,
    friction: 9,
    useNativeDriver: true,
  },
  // Subtle physical bounce for celebration, checkmarks, completion toggles
  bouncy: {
    tension: 55,
    friction: 6,
    useNativeDriver: true,
  },
  // Smooth sheet entrance
  sheet: {
    tension: 50,
    friction: 8,
    useNativeDriver: true,
  },
  // Quick micro-press feedback
  press: {
    tension: 80,
    friction: 8,
    useNativeDriver: true,
  },
};

export const TIMING_PRESETS = {
  // Apple standard for quick feedback
  quick: 120,
  // Standard sheet & modal entrance
  standard: 240,
  // Smooth modal exit
  exit: 180,
};

let cachedReduceMotion: boolean | null = null;

export const isReducedMotionActive = async (): Promise<boolean> => {
  if (cachedReduceMotion !== null) return cachedReduceMotion;
  try {
    cachedReduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    return cachedReduceMotion;
  } catch {
    return false;
  }
};
