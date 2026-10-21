import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardSummary } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  clientCount: number;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  summary,
  clientCount,
}) => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1: Delivery Quotas */}
      <View style={styles.cardsRow}>
        {/* Card 1: Total Videos & Client Count */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.purpleIconBg]}>
              <Ionicons name="videocam" size={16} color={THEME.colors.purple} />
            </View>
            <Text style={styles.cardLabel}>Video Quota</Text>
          </View>
          <Text style={styles.cardNumber}>{summary.totalVideos}</Text>
          <Text style={styles.cardSubText}>
            {clientCount} active {clientCount === 1 ? 'client' : 'clients'}
          </Text>
        </View>

        {/* Card 2: Completed Videos & Earned Revenue */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.mintIconBg]}>
              <Ionicons name="checkmark-done" size={16} color={THEME.colors.mint} />
            </View>
            <Text style={styles.cardLabel}>Completed</Text>
          </View>
          <Text style={styles.cardNumber}>{summary.completedVideos}</Text>
          <Text style={[styles.cardSubText, styles.mintSubText]}>
            {formatCurrency(summary.completedValue)} earned
          </Text>
        </View>
      </View>

      {/* Row 2: Work Value & Advance Reconciliation */}
      <View style={styles.cardsRow}>
        {/* Card 3: Remaining Videos & Pending Work Value */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.amberIconBg]}>
              <Ionicons name="hourglass-outline" size={16} color={THEME.colors.amber} />
            </View>
            <Text style={styles.cardLabel}>Remaining</Text>
          </View>
          <Text style={styles.cardNumber}>{summary.remainingVideos}</Text>
          <Text style={styles.cardSubText}>
            {formatCurrency(summary.remainingValue)} pending
          </Text>
        </View>

        {/* Card 4: Payments Received & Unused Balance */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.walletIconBg]}>
              <Ionicons name="wallet-outline" size={16} color={THEME.colors.purple} />
            </View>
            <Text style={styles.cardLabel}>Payments</Text>
          </View>
          <Text style={styles.cardNumberCompact}>
            {formatCurrency(summary.totalValue)}
          </Text>
          <Text style={[styles.cardSubText, summary.totalUnusedBudget > 0 && styles.amberSubText]}>
            {formatCurrency(summary.totalUnusedBudget)} unused balance
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: 16,
    gap: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purpleIconBg: {
    backgroundColor: THEME.colors.purpleLight,
  },
  mintIconBg: {
    backgroundColor: THEME.colors.mintLight,
  },
  amberIconBg: {
    backgroundColor: THEME.colors.amberLight,
  },
  walletIconBg: {
    backgroundColor: THEME.colors.purpleLight,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.5,
  },
  cardNumberCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.5,
  },
  cardSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  mintSubText: {
    color: THEME.colors.mint,
    fontWeight: '700',
  },
  amberSubText: {
    color: THEME.colors.amber,
    fontWeight: '600',
  },
});
