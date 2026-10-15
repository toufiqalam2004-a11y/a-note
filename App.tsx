import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from './src/constants/theme';
import {
  ClientWithVideos,
  DashboardSummary,
  PendingVoiceAction,
  VideoItem,
} from './src/types';
import {
  initDatabase,
  getClientsWithVideos,
  addClient,
  toggleVideoStatus,
  deleteClient,
} from './src/services/db';
import { calculateDashboardSummary } from './src/utils/calculations';
import { Header } from './src/components/Header';
import { DashboardSummaryCards } from './src/components/DashboardSummaryCards';
import { ClientCard } from './src/components/ClientCard';
import { AddClientModal } from './src/components/AddClientModal';
import { VoiceAssistantModal } from './src/components/VoiceAssistantModal';
import { VoiceToast } from './src/components/VoiceToast';
import { NavigationBar, TabKey } from './src/components/NavigationBar';

export default function App() {
  const [clients, setClients] = useState<ClientWithVideos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isAddClientVisible, setIsAddClientVisible] = useState(false);
  const [isVoiceAssistantVisible, setIsVoiceAssistantVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  // Initialize DB and load clients
  const loadData = useCallback(async () => {
    try {
      const data = await getClientsWithVideos();
      setClients(data);
    } catch (error) {
      console.warn('[EditFlow] Error loading clients:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await initDatabase();
      await loadData();
    }
    start();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const showNotification = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
  };

  // Add Client
  const handleAddClient = async (name: string, budget: number, rate: number) => {
    try {
      const newClient = await addClient(name, budget, rate);
      setClients((prev) => [newClient, ...prev]);
      showNotification(`Added client ${newClient.name} (${newClient.calculations.totalVideos} videos)`);
    } catch (e) {
      console.warn('Failed to add client:', e);
      showNotification('Failed to add client', true);
    }
  };

  // Toggle Video Checkbox
  const handleToggleVideo = async (
    video: VideoItem,
    client: ClientWithVideos
  ) => {
    const nextStatus = !video.isCompleted;

    // Optimistically update UI
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === client.id) {
          const updatedVideos = c.videos.map((v) =>
            v.id === video.id
              ? {
                  ...v,
                  isCompleted: nextStatus,
                  completedAt: nextStatus ? new Date().toISOString() : null,
                }
              : v
          );
          // Recalculate metrics for client
          const totalVideos = c.calculations.totalVideos;
          const completedVideos = updatedVideos.filter((v) => v.isCompleted).length;
          const remainingVideos = Math.max(0, totalVideos - completedVideos);
          const completedValue = completedVideos * c.ratePerVideo;
          const remainingValue = remainingVideos * c.ratePerVideo;
          const unusedBudget = c.calculations.unusedBudget;

          return {
            ...c,
            videos: updatedVideos,
            calculations: {
              ...c.calculations,
              completedVideos,
              remainingVideos,
              completedValue,
              remainingValue,
              unusedBudget,
            },
          };
        }
        return c;
      })
    );

    // Save to persistent SQLite
    await toggleVideoStatus(
      video.id,
      client.id,
      nextStatus,
      client.name,
      video.videoNumber
    );

    showNotification(
      nextStatus
        ? `Video ${video.videoNumber} for ${client.name} marked completed!`
        : `Video ${video.videoNumber} for ${client.name} marked pending.`
    );
  };

  // Delete Client
  const handleDeleteClient = async (clientId: string) => {
    const target = clients.find((c) => c.id === clientId);
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    await deleteClient(clientId);
    if (target) {
      showNotification(`Removed client ${target.name}.`);
    }
  };

  // Execute Voice Command Action (after parsing / confirmation)
  const handleExecuteVoiceAction = async (action: PendingVoiceAction) => {
    if (action.type === 'ADD_CLIENT') {
      if (action.clientName && action.totalBudget && action.ratePerVideo) {
        await handleAddClient(
          action.clientName,
          action.totalBudget,
          action.ratePerVideo
        );
      }
    } else if (action.type === 'COMPLETE_VIDEO') {
      if (action.clientId && action.videoId && action.videoNumber) {
        const client = clients.find((c) => c.id === action.clientId);
        if (client) {
          const video = client.videos.find((v) => v.id === action.videoId);
          if (video) {
            await handleToggleVideo(video, client);
          }
        }
      }
    }
  };

  const dashboardSummary: DashboardSummary = calculateDashboardSummary(clients);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0C0E" />

        {/* Global Toast Notification */}
        <VoiceToast
          message={toastMessage}
          isError={toastIsError}
          onDismiss={() => setToastMessage(null)}
        />

        {/* Header */}
        <Header
          onAddClientPress={() => setIsAddClientVisible(true)}
          activeClientsCount={clients.length}
        />

        {/* Main Body */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.mint} />
            <Text style={styles.loadingText}>Loading EditFlow...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={THEME.colors.mint}
                colors={[THEME.colors.mint]}
              />
            }
          >
            {activeTab === 'home' ? (
              <>
                {/* Dashboard Metrics */}
                <DashboardSummaryCards summary={dashboardSummary} />

                {/* Clients Section in Home */}
                <View style={styles.homeClientsSection}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionHeading}>Active Clients</Text>
                    <Text style={styles.sectionSubtitle}>
                      {clients.length} {clients.length === 1 ? 'tracker' : 'trackers'}
                    </Text>
                  </View>

                  {clients.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No Clients Yet</Text>
                      <Text style={styles.emptySubtitle}>
                        Tap &ldquo;Add Client&rdquo; above or tap the microphone and say:
                        {'\n'}&ldquo;Add client Rahul, budget 10000, rate 800&rdquo;
                      </Text>
                    </View>
                  ) : (
                    clients.map((client) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        onToggleVideo={handleToggleVideo}
                        onDeleteClient={handleDeleteClient}
                        defaultExpanded={clients.length === 1}
                      />
                    ))
                  )}
                </View>
              </>
            ) : (
              /* Clients Tab (Focused Client View) */
              <View style={styles.clientsTabSection}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Client Directory</Text>
                  <Text style={styles.sectionSubtitle}>
                    All delivery checklists
                  </Text>
                </View>

                {clients.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No Clients Configured</Text>
                    <Text style={styles.emptySubtitle}>
                      Add a client to track video deliveries and budgets.
                    </Text>
                  </View>
                ) : (
                  clients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onToggleVideo={handleToggleVideo}
                      onDeleteClient={handleDeleteClient}
                      defaultExpanded={true}
                    />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Bottom Navigation with Voice Mic FAB */}
        <NavigationBar
          currentTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onMicPress={() => setIsVoiceAssistantVisible(true)}
        />

        {/* Add Client Modal */}
        <AddClientModal
          visible={isAddClientVisible}
          onClose={() => setIsAddClientVisible(false)}
          onAddClient={handleAddClient}
        />

        {/* Voice Assistant Modal */}
        <VoiceAssistantModal
          visible={isVoiceAssistantVisible}
          onClose={() => setIsVoiceAssistantVisible(false)}
          clients={clients}
          onExecutePendingAction={handleExecuteVoiceAction}
          onNavigate={(screen) => setActiveTab(screen === 'clients' ? 'clients' : 'home')}
          onNotify={showNotification}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  homeClientsSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  clientsTabSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: THEME.spacing.md,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  emptyState: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.xl,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
