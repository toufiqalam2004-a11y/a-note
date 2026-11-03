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
            intensity={65}
            borderRadius={28}
            borderWidth={1.5}
            borderColor="rgba(255, 255, 255, 0.88)"
            backgroundColor="rgba(255, 255, 255, 0.94)"
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
                  <Text style={styles.brandA}>A </Text>
                  <Text style={styles.brandNote}>Note</Text>
                </View>
                <Text style={styles.menuSubtitle}>Client Video &amp; Revenue Tracker</Text>
              </View>
            </View>
            <PressableScale
              style={styles.closeBtn}
              onPress={handleSafeBack}
              activeScale={0.88}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close Menu"
            >
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
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
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenAddClient)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Add New Client"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EDE8FD' }]}>
                <Ionicons name="person-add" size={18} color={THEME.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Add New Client</Text>
                <Text style={styles.itemDesc}>Create client quota, budget, and per-video rate</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </PressableScale>

            {/* 2. Voice Assistant */}
            <PressableScale
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenVoice)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Voice Assistant"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EBFBF5' }]}>
                <Ionicons name="mic" size={18} color={THEME.colors.mint} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Voice Assistant</Text>
                <Text style={styles.itemDesc}>Complete videos hands-free or with typed commands</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </PressableScale>

            {/* 3. Export Reports */}
            <PressableScale
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenExportReports)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Export Reports"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FFF7E6' }]}>
                <Ionicons name="document-text" size={18} color={THEME.colors.amber} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Export Reports (PDF / Excel)</Text>
                <Text style={styles.itemDesc}>Generate formal PDF and .xlsx statements</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </PressableScale>

            {/* 4. My Profile & Workspace Personalization */}
            <PressableScale
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenProfile)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Personalize Workspace Profile"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EDE8FD' }]}>
                <Ionicons name="person-circle-outline" size={20} color={THEME.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Personalize Workspace</Text>
                <Text style={styles.itemDesc} numberOfLines={1}>
                  {userProfile?.displayName
                    ? `${userProfile.displayName} • ${userProfile.profession || 'Workspace'}`
                    : 'Set your name, profession & studio'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </PressableScale>

            {/* 5. Settings & Data Management (Backup, Restore, Delete All Data) */}
            <PressableScale
              style={[styles.menuItem, styles.highlightMenuItem]}
              onPress={() => handleSelectItem(onOpenDataManagement)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="Settings and Data Management"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EDE8FD' }]}>
                <Ionicons name="server" size={18} color={THEME.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemTitle, { color: THEME.colors.purple }]}>
                  Settings &amp; Data Management
                </Text>
                <Text style={styles.itemDesc}>Backup &amp; Restore &bull; Delete All App Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.purple} />
            </PressableScale>

            {/* 5. App Guide & Intro */}
            <PressableScale
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenIntro)}
              activeScale={0.98}
              accessibilityRole="button"
              accessibilityLabel="App Guide and Intro"
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F0EBF8' }]}>
                <Ionicons name="information-circle-outline" size={18} color={THEME.colors.textNavy} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>App Guide &amp; Intro</Text>
                <Text style={styles.itemDesc}>Overview of features, calculations, and tips</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
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
