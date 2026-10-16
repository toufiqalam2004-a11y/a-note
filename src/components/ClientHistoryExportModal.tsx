import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ClientWithVideos,
  HistoryDateFilter,
  HistoryStatusFilter,
  VideoItem,
} from '../types';
import { THEME } from '../constants/theme';
import {
  formatCurrency,
  formatDate,
  formatTime,
} from '../utils/calculations';
import {
  exportClientPDF,
  exportClientExcel,
} from '../services/exportService';

interface ClientHistoryExportModalProps {
  visible: boolean;
  client: ClientWithVideos | null;
  onClose: () => void;
  onToggleVideo?: (video: VideoItem, client: ClientWithVideos) => void;
}

export const ClientHistoryExportModal: React.FC<ClientHistoryExportModalProps> = ({
  visible,
  client,
  onClose,
  onToggleVideo,
}) => {
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!client) return null;

  const { calculations, videos } = client;

  // Filter video history according to date and status filters
  const now = new Date();
  let minDateStr = '';
  if (dateFilter === 'today') {
    minDateStr = now.toISOString().split('T')[0];
  } else if (dateFilter === 'last7') {
    minDateStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else if (dateFilter === 'last30') {
    minDateStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const filteredVideos = videos.filter((v) => {
    // Status filter
    if (statusFilter === 'completed' && !v.isCompleted) return false;
    if (statusFilter === 'remaining' && v.isCompleted) return false;

    // Date filter
    if (dateFilter !== 'all') {
      if (v.isCompleted && v.completedAt) {
        const itemDate = v.completedAt.split('T')[0];
        if (itemDate < minDateStr) return false;
      } else if (statusFilter === 'completed') {
        return false;
      }
    }
    return true;
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportMessage('Generating formal PDF report...');
    try {
      const result = await exportClientPDF(client, dateFilter);
      setExportMessage(null);
      if (result.success) {
        Alert.alert('PDF Exported', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      setExportMessage(null);
      Alert.alert('Error', e.message || 'Could not export PDF report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportMessage('Generating Excel (.xlsx) workbook...');
    try {
      const result = await exportClientExcel(client, dateFilter);
      setExportMessage(null);
      if (result.success) {
        Alert.alert('Excel Exported', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      setExportMessage(null);
      Alert.alert('Error', e.message || 'Could not export Excel spreadsheet.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>{client.name}</Text>
              <Text style={styles.headerSubtitle}>Delivery History & Export Reports</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            {/* Financial Reconciliation & Capacity Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryLabel}>Total Payments Received</Text>
                  <Text style={styles.summaryValueLarge}>
                    {formatCurrency(calculations.totalBudget)}
                  </Text>
                </View>
                <View style={styles.badgeRate}>
                  <Text style={styles.badgeRateText}>
                    {formatCurrency(client.ratePerVideo)} / video
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Video Capacity</Text>
                  <Text style={styles.metricItemVal}>
                    {calculations.totalVideos} videos
                  </Text>
                  <Text style={styles.metricFormula}>floor(payment / rate)</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Completed</Text>
                  <Text style={[styles.metricItemVal, { color: THEME.colors.mint }]}>
                    {calculations.completedVideos} videos
                  </Text>
                  <Text style={styles.metricSub}>
                    Earned: {formatCurrency(calculations.completedValue)}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Remaining</Text>
                  <Text style={styles.metricItemVal}>
                    {calculations.remainingVideos} videos
                  </Text>
                  <Text style={styles.metricSub}>
                    Pending: {formatCurrency(calculations.remainingValue)}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Unused Balance</Text>
                  <Text
                    style={[
                      styles.metricItemVal,
                      {
                        color:
                          calculations.unusedBudget > 0
                            ? THEME.colors.amber
                            : THEME.colors.textSecondary,
                      },
                    ]}
                  >
                    {formatCurrency(calculations.unusedBudget)}
                  </Text>
                  <Text style={styles.metricFormula}>payment % rate</Text>
                </View>
              </View>
            </View>

            {/* Export Actions Section */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="share-outline" size={16} color={THEME.colors.mint} />
              <Text style={styles.sectionTitle}>Export Client Report</Text>
            </View>

            <View style={styles.exportCard}>
              <Text style={styles.filterGroupLabel}>Report Date Scope:</Text>
              <View style={styles.filterPillsRow}>
                {(['all', 'today', 'last7', 'last30'] as HistoryDateFilter[]).map((range) => {
                  const labels: Record<HistoryDateFilter, string> = {
                    all: 'All History',
                    today: 'Today',
                    last7: 'Last 7 Days',
                    last30: 'Last 30 Days',
                  };
                  const active = dateFilter === range;
                  return (
                    <TouchableOpacity
                      key={range}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => setDateFilter(range)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          active && styles.filterPillTextActive,
                        ]}
                      >
                        {labels[range]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isExporting ? (
                <View style={styles.exportLoadingBox}>
                  <ActivityIndicator size="small" color={THEME.colors.mint} />
                  <Text style={styles.exportLoadingText}>
                    {exportMessage || 'Preparing report...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.exportButtonsRow}>
                  <TouchableOpacity
                    style={styles.exportPdfBtn}
                    onPress={handleExportPDF}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text" size={16} color="#0B0C0E" />
                    <Text style={styles.exportPdfBtnText}>Export PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exportExcelBtn}
                    onPress={handleExportExcel}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="grid-outline" size={16} color={THEME.colors.mint} />
                    <Text style={styles.exportExcelBtnText}>Export Excel (.xlsx)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Date-wise Video History Table / Checklist */}
            <View style={[styles.sectionHeaderRow, { marginTop: THEME.spacing.lg }]}>
              <Ionicons name="time-outline" size={16} color={THEME.colors.mint} />
              <Text style={styles.sectionTitle}>Date-wise Completion History</Text>
              <Text style={styles.countBadge}>
                {filteredVideos.length} {filteredVideos.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.statusTabsRow}>
              {(['all', 'completed', 'remaining'] as HistoryStatusFilter[]).map((tab) => {
                const tabLabels: Record<HistoryStatusFilter, string> = {
                  all: 'All Statuses',
                  completed: `Completed (${calculations.completedVideos})`,
                  remaining: `Remaining (${calculations.remainingVideos})`,
                };
                const active = statusFilter === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.statusTab, active && styles.statusTabActive]}
                    onPress={() => setStatusFilter(tab)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusTabText,
                        active && styles.statusTabTextActive,
                      ]}
                    >
                      {tabLabels[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Video Records List */}
            {filteredVideos.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={THEME.colors.textMuted}
                />
                <Text style={styles.emptyHistoryTitle}>No Matching Records</Text>
                <Text style={styles.emptyHistorySubtitle}>
                  No video deliveries match the selected date or status filters.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {filteredVideos.map((video) => (
                  <View key={video.id} style={styles.historyRow}>
                    <TouchableOpacity
                      style={styles.historyCheckbox}
                      onPress={() => onToggleVideo && onToggleVideo(video, client)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          video.isCompleted
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={22}
                        color={
                          video.isCompleted
                            ? THEME.colors.mint
                            : THEME.colors.textMuted
                        }
                      />
                    </TouchableOpacity>

                    <View style={styles.historyDetails}>
                      <View style={styles.historyTitleRow}>
                        <Text style={styles.historyVideoTitle}>
                          {video.title || `Video ${video.videoNumber}`}
                        </Text>
                        <View
                          style={[
                            styles.historyStatusPill,
                            video.isCompleted
                              ? styles.historyStatusCompleted
                              : styles.historyStatusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyStatusText,
                              video.isCompleted
                                ? { color: THEME.colors.mint }
                                : { color: THEME.colors.amber },
                            ]}
                          >
                            {video.isCompleted ? 'COMPLETED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.historyMetaRow}>
                        {video.isCompleted && video.completedAt ? (
                          <>
                            <Ionicons
                              name="calendar-outline"
                              size={12}
                              color={THEME.colors.textSecondary}
                            />
                            <Text style={styles.historyMetaText}>
                              {formatDate(video.completedAt)}
                            </Text>
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color={THEME.colors.textSecondary}
                            />
                            <Text style={styles.historyMetaText}>
                              {formatTime(video.completedAt)}
                            </Text>
                            <Text style={styles.historyValueEarned}>
                              +{formatCurrency(client.ratePerVideo)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name="hourglass-outline"
                              size={12}
                              color={THEME.colors.textMuted}
                            />
                            <Text style={styles.historyPendingText}>
                              Pending delivery &bull; {formatCurrency(client.ratePerVideo)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 56, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  summaryValueLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  badgeRate: {
    backgroundColor: THEME.colors.mintLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  badgeRateText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.mint,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2EDFA',
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9F6FE',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE4F5',
  },
  metricItemLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricItemVal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginTop: 2,
  },
  metricFormula: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 18,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#F5F0FB',
  },
  filterPillActive: {
    backgroundColor: THEME.colors.mint,
  },
  filterPillText: {
    fontSize: 11,
    color: THEME.colors.textNavy,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.mint,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  exportPdfBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exportExcelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.purple,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  exportExcelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exportLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  exportLoadingText: {
    fontSize: 12,
    color: THEME.colors.mint,
    fontWeight: '600',
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  statusTabActive: {
    backgroundColor: '#EDE8FD',
  },
  statusTabText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  statusTabTextActive: {
    color: THEME.colors.purple,
    fontWeight: '800',
  },
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EDFA',
  },
  historyCheckbox: {
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyVideoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  historyStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  historyStatusCompleted: {
    backgroundColor: THEME.colors.mintLight,
  },
  historyStatusPending: {
    backgroundColor: '#EDE8FD',
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  historyMetaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginRight: 4,
  },
  historyValueEarned: {
    fontSize: 11,
    color: THEME.colors.mint,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  historyPendingText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  emptyHistoryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
