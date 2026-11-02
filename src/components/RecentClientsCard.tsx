import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';
import { PressableScale } from './PressableScale';

interface RecentClientsCardProps {
  clients: ClientWithVideos[];
  onSelectClient: (client: ClientWithVideos) => void;
  onSeeAllPress?: () => void;
}

const AVATAR_COLORS = [
  '#7C5CFC', // Purple
  '#E84393', // Pink
  '#00D287', // Mint
  '#3B82F6', // Blue
  '#F59E0B', // Amber
];

export const RecentClientsCard: React.FC<RecentClientsCardProps> = ({
  clients,
  onSelectClient,
  onSeeAllPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recent Clients</Text>
        {onSeeAllPress && (
          <PressableScale
            onPress={onSeeAllPress}
            activeScale={0.93}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </PressableScale>
        )}
      </View>

      {/* Clients Card Container */}
      <View style={styles.card}>
        {clients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Clients Added Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap &ldquo;+ Add Client&rdquo; above or say &ldquo;New client&rdquo; in Voice Control
            </Text>
          </View>
        ) : (
          clients.slice(0, 5).map((client, index) => {
            const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const initial = (client.name || 'C').charAt(0).toUpperCase();
            const total = client.calculations.totalVideos;
            const completed = client.calculations.completedVideos;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isLast = index === Math.min(clients.length, 5) - 1;

            return (
              <PressableScale
                key={client.id}
                style={[styles.clientRow, !isLast && styles.rowDivider]}
                onPress={() => onSelectClient(client)}
                activeScale={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${client.name}, ${completed} of ${total} videos completed`}
              >
                {/* 3D Circular Avatar with initial */}
                <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>

                {/* Client Info */}
                <View style={styles.infoCol}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientSubtitle}>
                    {total} {total === 1 ? 'video' : 'videos'} • {formatCurrency(client.ratePerVideo)}/video
                  </Text>
                </View>

                {/* Progress & Chevron */}
                <View style={styles.progressCol}>
                  <Text style={styles.percentText}>{percent}%</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                </View>
              </PressableScale>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2EDFA',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    letterSpacing: -0.2,
  },
  clientSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  progressCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
