import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardSummary } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  summary,
}) => {
  const completionPercentage =
    summary.totalVideos > 0
      ? Math.round((summary.completedVideos / summary.totalVideos) * 100)
      : 0;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.completionPill}>
          <Text style={styles.completionPillText}>
            {completionPercentage}% Delivered
          </Text>
        </View>
      </View>

      {/* Primary 4 Cards Grid */}
      <View style={styles.grid}>
        {/* Total Videos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Total Videos</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
              <Ionicons name="videocam-outline" size={14} color={THEME.colors.textSecondary} />
            </View>
          </View>
          <Text style={styles.cardNumber}>{summary.totalVideos}</Text>
          <Text style={styles.cardSubtext}>Across all clients</Text>
        </View>

        {/* Completed */}
        <View style={[styles.card, styles.highlightCard]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: THEME.colors.mint }]}>Completed</Text>
            <View style={[styles.iconCircle, { backgroundColor: THEME.colors.mintGlow }]}>
              <Ionicons name="checkmark-done" size={14} color={THEME.colors.mint} />
            </View>
          </View>
          <Text style={[styles.cardNumber, { color: THEME.colors.mint }]}>
            {summary.completedVideos}
          </Text>
          <Text style={styles.cardSubtext}>
            {formatCurrency(summary.completedValue)} earned
          </Text>
        </View>

        {/* Remaining */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Remaining</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
              <Ionicons name="time-outline" size={14} color={THEME.colors.textSecondary} />
            </View>
          </View>
          <Text style={styles.cardNumber}>{summary.remainingVideos}</Text>
          <Text style={styles.cardSubtext}>
            {formatCurrency(summary.remainingValue)} pending
          </Text>
        </View>

        {/* Total Value */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Total Value</Text>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
              <Ionicons name="wallet-outline" size={14} color={THEME.colors.textSecondary} />
            </View>
          </View>
          <Text style={styles.cardNumber}>{formatCurrency(summary.totalValue)}</Text>
          <Text style={styles.cardSubtext}>Combined budgets</Text>
        </View>
      </View>

      {/* Financial breakdown row */}
      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Completed Value</Text>
          <Text style={[styles.breakdownValue, { color: THEME.colors.mint }]}>
            {formatCurrency(summary.completedValue)}
          </Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Remaining Value</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(summary.remainingValue)}
          </Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <View style={styles.unusedHeader}>
            <Text style={styles.breakdownLabel}>Unused Budget</Text>
          </View>
          <Text style={[styles.breakdownValue, { color: THEME.colors.amber }]}>
            {formatCurrency(summary.totalUnusedBudget)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  completionPill: {
    backgroundColor: THEME.colors.mintGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
  },
  completionPillText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.mint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  highlightCard: {
    borderColor: THEME.colors.mintBorder,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  cardSubtext: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.colors.border,
  },
  unusedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  breakdownLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
});
