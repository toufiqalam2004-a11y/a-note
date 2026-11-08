import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  Animated,
  AccessibilityInfo,
  Dimensions,
  LayoutChangeEvent,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { GlassView } from './GlassView';
import { SPRING_PRESETS, TIMING_PRESETS } from '../utils/motion';
import { UserProfile } from '../services/userProfileService';

interface AppMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAddClient: () => void;
  onOpenVoice: () => void;
  onOpenExportReports: () => void;
  onOpenDataManagement: () => void;
  onOpenIntro: () => void;
  onOpenProfile: () => void;
  userProfile?: UserProfile | null;
}

export const AppMenuModal: React.FC<AppMenuModalProps> = ({
  visible,
  onClose,
  onOpenAddClient,
  onOpenVoice,
  onOpenExportReports,
  onOpenDataManagement,
  onOpenIntro,
  onOpenProfile,
  userProfile,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const sheetHeightRef = useRef(Math.max(screenHeight, 600));
  const sheetAnim = useRef(new Animated.Value(sheetHeightRef.current)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  const playExit = useCallback(
    (onComplete?: () => void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      if (reduceMotion) {
        onClose();
        if (onComplete) onComplete();
        isClosingRef.current = false;
        return;
      }

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: TIMING_PRESETS.exit,
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: sheetHeightRef.current,
          duration: TIMING_PRESETS.exit,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isClosingRef.current = false;
        onClose();
        if (onComplete) onComplete();
      });
    },
    [backdropAnim, sheetAnim, reduceMotion, onClose]
  );

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      if (reduceMotion) {
        backdropAnim.setValue(1);
        sheetAnim.setValue(0);
      } else {
        sheetAnim.setValue(sheetHeightRef.current);
        backdropAnim.setValue(0);
        Animated.parallel([
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(sheetAnim, {
            toValue: 0,
            ...SPRING_PRESETS.sheet,
          }),
        ]).start();
      }
    }
  }, [visible, backdropAnim, sheetAnim, reduceMotion]);

  // Android hardware back handler: dismiss menu first
  const handleSafeBack = useCallback(() => {
    playExit();
    return true;
  }, [playExit]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBack);
    return () => sub.remove();
  }, [visible, handleSafeBack]);

  const handleSelectItem = (action: () => void) => {
    playExit(() => {
      setTimeout(action, 80);
    });
  };

  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 50) {
      sheetHeightRef.current = h;
    }
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleSafeBack}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
        {/* Animated backdrop tap to dismiss */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleSafeBack}
            accessibilityRole="button"
            accessibilityLabel="Close Menu Backdrop"
          />
        </Animated.View>

        {/* Animated Sheet Container with Glass Surface */}
        <Animated.View
          style={[
            styles.menuSheetOuter,
            {
              transform: [{ translateY: sheetAnim }],
            },
          ]}
          onLayout={handleSheetLayout}
        >
          <GlassView
            style={styles.menuSheetGlass}
            intensity={isDark ? 70 : 65}
            borderRadius={28}
            borderWidth={1.5}
            borderColor={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.88)'}
            backgroundColor={isDark ? 'rgba(24, 28, 43, 0.96)' : 'rgba(255, 255, 255, 0.95)'}
          >
            <View
              style={[
                styles.menuSheetInner,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              ]}
            >
              {/* Header */}
              <View style={styles.menuHeader}>
            <View style={styles.brandRowWithLogo}>
              <Image
                source={require('../../assets/images/anote-logo.png')}
                style={styles.menuLogo}
                resizeMode="contain"
              />
              <View>
                <View style={styles.brandRow}>
                  <Text style={[styles.brandA, { color: theme.colors.purple }]}>A </Text>
                  <Text style={[styles.brandNote, { color: theme.colors.mint }]}>Note</Text>
                </View>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textMuted }]}>Client Video &amp; Revenue Tracker</Text>
              </View>
            </View>
            <PressableScale
              style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSubtle }]}
              onPress={handleSafeBack}
              activeScale={0.88}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close Menu"
            >
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </PressableScale>
          </View>

          {/* Menu Items with Small Screen Scroll Protection */}
          <ScrollView
            style={{ maxHeight: Math.min(screenHeight * 0.65, 480) }}
            contentContainerStyle={styles.itemsList}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* 1. Add Client */}
            <PressableScale
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelectItem(onOpenAddClient)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Add New Client"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.purpleLight }]}>
                <Ionicons name="person-add" size={18} color={theme.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Add New Client</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]}>Create client quota, budget, and per-video rate</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressableScale>

            {/* 2. Voice Assistant */}
            <PressableScale
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelectItem(onOpenVoice)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Voice Assistant"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.mintLight }]}>
                <Ionicons name="mic" size={18} color={theme.colors.mint} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Voice Assistant</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]}>Complete videos hands-free or with typed commands</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressableScale>

            {/* 3. Export Reports */}
            <PressableScale
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelectItem(onOpenExportReports)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Export Reports"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.amberLight }]}>
                <Ionicons name="document-text" size={18} color={theme.colors.amber} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Export Reports (PDF / Excel)</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]}>Generate formal PDF and .xlsx statements</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressableScale>

            {/* 4. My Profile & Workspace Personalization */}
            <PressableScale
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelectItem(onOpenProfile)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Personalize Workspace Profile"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.purpleLight }]}>
                <Ionicons name="person-circle-outline" size={20} color={theme.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>Personalize Workspace</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {userProfile?.displayName
                    ? `${userProfile.displayName} • ${userProfile.profession || 'Workspace'}`
                    : 'Set your name, profession, studio & theme'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressableScale>

            {/* 5. Settings & Data Management (Backup, Restore, Delete All Data) */}
            <PressableScale
              style={[
                styles.menuItem,
                styles.highlightMenuItem,
                {
                  backgroundColor: isDark ? 'rgba(124, 92, 252, 0.12)' : '#FAF7FF',
                  borderColor: theme.colors.purpleBorder,
                },
              ]}
              onPress={() => handleSelectItem(onOpenDataManagement)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Settings and Data Management"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.purpleLight }]}>
                <Ionicons name="server" size={18} color={theme.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.purple }]}>
                  Settings &amp; Data Management
                </Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]}>Backup &amp; Restore &bull; Delete All App Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.purple} />
            </PressableScale>

            {/* 6. App Guide & Intro */}
            <PressableScale
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelectItem(onOpenIntro)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="App Guide and Intro"
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSubtle }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.textPrimary} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>App Guide &amp; Intro</Text>
                <Text style={[styles.itemDesc, { color: theme.colors.textMuted }]}>Overview of features, calculations, and tips</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </PressableScale>
          </ScrollView>
        </View>
      </GlassView>
    </Animated.View>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 16, 40, 0.45)',
    zIndex: 1,
  },
  menuSheetOuter: {
    width: '100%',
    zIndex: 2,
    elevation: 16,
  },
  menuSheetGlass: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  menuSheetInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
    marginBottom: 12,
  },
  brandRowWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandA: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textNavy,
  },
  brandNote: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.mint,
  },
  menuSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F6F2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F2EDFA',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  highlightMenuItem: {
    borderColor: 'rgba(124, 92, 252, 0.28)',
    backgroundColor: '#FAF8FF',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  itemDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
