import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardSummary } from '../types';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/calculations';

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  clientCount: number;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  summary,
  clientCount,
}) => {
  const { theme } = useTheme();

  const cardDynamicStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    shadowColor: theme.colors.shadowColor,
  };

  return (
    <View style={styles.gridContainer}>
      {/* Row 1: Delivery Quotas */}
      <View style={styles.cardsRow}>
        {/* Card 1: Total Videos & Client Count */}
        <View style={[styles.card, cardDynamicStyle]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.purpleLight }]}>
              <Ionicons name="videocam" size={16} color={theme.colors.purple} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Video Quota</Text>
          </View>
          <Text style={[styles.cardNumber, { color: theme.colors.textPrimary }]}>{summary.totalVideos}</Text>
          <Text style={[styles.cardSubText, { color: theme.colors.textMuted }]}>
            {clientCount} active {clientCount === 1 ? 'client' : 'clients'}
          </Text>
        </View>

        {/* Card 2: Completed Videos & Earned Revenue */}
        <View style={[styles.card, cardDynamicStyle]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.mintLight }]}>
              <Ionicons name="checkmark-done" size={16} color={theme.colors.mint} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Completed</Text>
          </View>
          <Text style={[styles.cardNumber, { color: theme.colors.textPrimary }]}>{summary.completedVideos}</Text>
          <Text style={[styles.cardSubText, { color: theme.colors.mintDark, fontWeight: '700' }]}>
            {formatCurrency(summary.completedValue)} earned
          </Text>
        </View>
      </View>

      {/* Row 2: Work Value & Advance Reconciliation */}
      <View style={styles.cardsRow}>
        {/* Card 3: Remaining Videos & Pending Work Value */}
        <View style={[styles.card, cardDynamicStyle]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.amberLight }]}>
              <Ionicons name="hourglass-outline" size={16} color={theme.colors.amber} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Remaining</Text>
          </View>
          <Text style={[styles.cardNumber, { color: theme.colors.textPrimary }]}>{summary.remainingVideos}</Text>
          <Text style={[styles.cardSubText, { color: theme.colors.textMuted }]}>
            {formatCurrency(summary.remainingValue)} pending
          </Text>
        </View>

        {/* Card 4: Payments Received & Unused Balance */}
        <View style={[styles.card, cardDynamicStyle]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.purpleLight }]}>
              <Ionicons name="wallet-outline" size={16} color={theme.colors.purple} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>Payments</Text>
          </View>
          <Text style={[styles.cardNumberCompact, { color: theme.colors.textPrimary }]}>
            {formatCurrency(summary.totalValue)}
          </Text>
          <Text
            style={[
              styles.cardSubText,
              {
                color: summary.totalUnusedBudget > 0 ? theme.colors.amber : theme.colors.textMuted,
                fontWeight: summary.totalUnusedBudget > 0 ? '700' : '500',
              },
            ]}
          >
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
