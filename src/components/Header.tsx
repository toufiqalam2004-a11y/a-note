import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface HeaderProps {
  onAddClientPress: () => void;
  activeClientsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onAddClientPress,
  activeClientsCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoPill}>
            <Ionicons name="film-outline" size={18} color={THEME.colors.mint} />
          </View>
          <View>
            <View style={styles.logoTextRow}>
              <Text style={styles.title}>Edit</Text>
              <Text style={styles.titleMint}>Flow</Text>
            </View>
            <Text style={styles.subtitle}>Client Video Tracker</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddClientPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#0B0C0E" />
          <Text style={styles.addButtonText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.statusText}>Offline Ready (SQLite)</Text>
        </View>
        <Text style={styles.clientCountText}>
          {activeClientsCount} {activeClientsCount === 1 ? 'Client' : 'Clients'} Active
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  logoPill: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleMint: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.mint,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: -2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.mint,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.full,
    gap: 4,
  },
  addButtonText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#0B0C0E',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.mint,
  },
  statusText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  clientCountText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
});
