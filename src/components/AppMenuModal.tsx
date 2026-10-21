import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface AppMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAddClient: () => void;
  onOpenVoice: () => void;
  onOpenExportReports: () => void;
  onOpenDataManagement: () => void;
  onOpenIntro: () => void;
}

export const AppMenuModal: React.FC<AppMenuModalProps> = ({
  visible,
  onClose,
  onOpenAddClient,
  onOpenVoice,
  onOpenExportReports,
  onOpenDataManagement,
  onOpenIntro,
}) => {
  const insets = useSafeAreaInsets();

  // Android hardware back handler: dismiss menu first
  const handleSafeBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBack);
    return () => sub.remove();
  }, [visible, handleSafeBack]);

  const handleSelectItem = (action: () => void) => {
    onClose();
    setTimeout(() => {
      action();
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleSafeBack}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleSafeBack}
        />

        <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
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
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleSafeBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close Menu"
            >
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.itemsList}>
            {/* 1. Add Client */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenAddClient)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EDE8FD' }]}>
                <Ionicons name="person-add" size={18} color={THEME.colors.purple} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Add New Client</Text>
                <Text style={styles.itemDesc}>Create client quota, budget, and per-video rate</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* 2. Voice Assistant */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenVoice)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EBFBF5' }]}>
                <Ionicons name="mic" size={18} color={THEME.colors.mint} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Voice Assistant</Text>
                <Text style={styles.itemDesc}>Complete videos hands-free or with typed commands</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* 3. Export Reports */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenExportReports)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FFF7E6' }]}>
                <Ionicons name="document-text" size={18} color={THEME.colors.amber} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>Export Reports (PDF / Excel)</Text>
                <Text style={styles.itemDesc}>Generate formal PDF and .xlsx statements</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* 4. Settings & Data Management (Backup, Restore, Delete All Data) */}
            <TouchableOpacity
              style={[styles.menuItem, styles.highlightMenuItem]}
              onPress={() => handleSelectItem(onOpenDataManagement)}
              activeOpacity={0.7}
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
            </TouchableOpacity>

            {/* 5. App Guide & Intro */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectItem(onOpenIntro)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F0EBF8' }]}>
                <Ionicons name="information-circle-outline" size={18} color={THEME.colors.textNavy} />
              </View>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>App Guide &amp; Intro</Text>
                <Text style={styles.itemDesc}>Overview of features, calculations, and tips</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 40, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#F7F3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFD',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECE5F7',
    gap: 12,
  },
  highlightMenuItem: {
    backgroundColor: '#F9F6FE',
    borderColor: '#E0D6F5',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
