import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { calculateDashboardSummary, formatCurrency } from './src/utils/calculations';
import { Header } from './src/components/Header';
import { WelcomeCard } from './src/components/WelcomeCard';
import { OverallProgressCard } from './src/components/OverallProgressCard';
import { DashboardSummaryCards } from './src/components/DashboardSummaryCards';
import { RecentClientsCard } from './src/components/RecentClientsCard';
import { ClientDetailsScreen } from './src/components/ClientDetailsScreen';
import { AddClientModal } from './src/components/AddClientModal';
import { VoiceAssistantModal } from './src/components/VoiceAssistantModal';
import { VoiceToast } from './src/components/VoiceToast';
import { NavigationBar, TabKey } from './src/components/NavigationBar';
import { ClientHistoryExportModal } from './src/components/ClientHistoryExportModal';

export default function App() {
  const [clients, setClients] = useState<ClientWithVideos[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [selectedClient, setSelectedClient] = useState<ClientWithVideos | null>(null);
  const [isAddClientVisible, setIsAddClientVisible] = useState(false);
  const [isVoiceAssistantVisible, setIsVoiceAssistantVisible] = useState(false);
  const [isGlobalExportVisible, setIsGlobalExportVisible] = useState(false);
  const [clientForExport, setClientForExport] = useState<ClientWithVideos | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  // Initialize DB and load clients
  const loadData = useCallback(async () => {
    try {
      const data = await getClientsWithVideos();
      setClients(data);

      // Keep selected client in sync if open
      setSelectedClient((prevSelected) => {
        if (!prevSelected) return null;
        return data.find((c) => c.id === prevSelected.id) || null;
      });
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

  const lastBackPressTimeRef = useRef<number>(0);
  const updatingVideoIdsRef = useRef<Set<string>>(new Set());

  // Hardware BackHandler: Prevents app exit and safely navigates back
  useEffect(() => {
    const onHardwareBackPress = () => {
      // 1. Dismiss global export modal if open
      if (isGlobalExportVisible) {
        setIsGlobalExportVisible(false);
        setClientForExport(null);
        return true;
      }

      // 2. Dismiss voice assistant modal if open
      if (isVoiceAssistantVisible) {
        setIsVoiceAssistantVisible(false);
        return true;
      }

      // 3. Dismiss add client modal if open
      if (isAddClientVisible) {
        setIsAddClientVisible(false);
        return true;
      }

      // 4. Return from Client Details screen to previous screen
      if (selectedClient) {
        setSelectedClient(null);
        return true;
      }

      // 5. Return from Clients tab to Home tab
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      // 6. On Home screen, safe exit behavior (double tap within 2000ms)
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        BackHandler.exitApp();
        return false;
      }

      lastBackPressTimeRef.current = now;
      showNotification('Press back again to exit EditFlow');
      return true;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => backSubscription.remove();
  }, [
    isGlobalExportVisible,
    isVoiceAssistantVisible,
    isAddClientVisible,
    selectedClient,
    activeTab,
  ]);

  // Complete Video: pending -> completed (Guaranteed single execution & timestamp saving)
  const handleCompleteVideo = async (
    video: VideoItem,
    client: ClientWithVideos
  ) => {
    if (video.isCompleted) {
      showNotification(`Video ${video.videoNumber} for ${client.name} is already completed.`);
      return;
    }

    if (updatingVideoIdsRef.current.has(video.id)) return;
    updatingVideoIdsRef.current.add(video.id);

    const completionTime = new Date().toISOString();

    try {
      // Optimistically update UI
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === client.id) {
            const updatedVideos = c.videos.map((v) =>
              v.id === video.id
                ? { ...v, isCompleted: true, completedAt: completionTime }
                : v
            );
            const totalVideos = c.calculations.totalVideos;
            const completedVideos = updatedVideos.filter((v) => v.isCompleted).length;
            const remainingVideos = Math.max(0, totalVideos - completedVideos);
            const completedValue = completedVideos * c.ratePerVideo;
            const remainingValue = remainingVideos * c.ratePerVideo;
            const unusedBudget = c.calculations.unusedBudget;

            const updatedClient: ClientWithVideos = {
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

            if (selectedClient && selectedClient.id === c.id) {
              setSelectedClient(updatedClient);
            }
            return updatedClient;
          }
          return c;
        })
      );

      // Save to persistent SQLite
      await toggleVideoStatus(
        video.id,
        client.id,
        true,
        client.name,
        video.videoNumber
      );

      showNotification(`Video ${video.videoNumber} for ${client.name} marked completed!`);
    } catch (err) {
      console.warn('Error completing video:', err);
      showNotification('Failed to complete video', true);
    } finally {
      updatingVideoIdsRef.current.delete(video.id);
    }
  };

  // Reopen Video: completed -> pending (Explicit confirmation requirement)
  const handleReopenVideo = async (
    video: VideoItem,
    client: ClientWithVideos
  ) => {
    if (!video.isCompleted) return;

    if (updatingVideoIdsRef.current.has(video.id)) return;
    updatingVideoIdsRef.current.add(video.id);

    try {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id === client.id) {
            const updatedVideos = c.videos.map((v) =>
              v.id === video.id
                ? { ...v, isCompleted: false, completedAt: null }
                : v
            );
            const totalVideos = c.calculations.totalVideos;
            const completedVideos = updatedVideos.filter((v) => v.isCompleted).length;
            const remainingVideos = Math.max(0, totalVideos - completedVideos);
            const completedValue = completedVideos * c.ratePerVideo;
            const remainingValue = remainingVideos * c.ratePerVideo;
            const unusedBudget = c.calculations.unusedBudget;

            const updatedClient: ClientWithVideos = {
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

            if (selectedClient && selectedClient.id === c.id) {
              setSelectedClient(updatedClient);
            }
            return updatedClient;
          }
          return c;
        })
      );

      await toggleVideoStatus(
        video.id,
        client.id,
        false,
        client.name,
        video.videoNumber
      );

      showNotification(`Video ${video.videoNumber} for ${client.name} marked pending.`);
    } catch (err) {
      console.warn('Error reopening video:', err);
      showNotification('Failed to reopen video', true);
    } finally {
      updatingVideoIdsRef.current.delete(video.id);
    }
  };

  // Backward compatible Toggle Video
  const handleToggleVideo = async (
    video: VideoItem,
    client: ClientWithVideos
  ) => {
    if (video.isCompleted) {
      await handleReopenVideo(video, client);
    } else {
      await handleCompleteVideo(video, client);
    }
  };

  // Delete Client
  const handleDeleteClient = async (clientId: string) => {
    const target = clients.find((c) => c.id === clientId);
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(null);
    }
    await deleteClient(clientId);
    if (target) {
      showNotification(`Removed client ${target.name}.`);
    }
  };

  // Execute Voice Command Action
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
            await handleCompleteVideo(video, client);
          }
        }
      }
    }
  };

  const handleVoiceNavigate = (
    screen: 'dashboard' | 'clients' | 'new_client',
    client?: ClientWithVideos
  ) => {
    if (client) {
      setSelectedClient(client);
      setIsVoiceAssistantVisible(false);
      return;
    }
    if (screen === 'new_client') {
      setIsAddClientVisible(true);
      setIsVoiceAssistantVisible(false);
    } else if (screen === 'clients') {
      setActiveTab('clients');
      setSelectedClient(null);
      setIsVoiceAssistantVisible(false);
    } else {
      setActiveTab('home');
      setSelectedClient(null);
      setIsVoiceAssistantVisible(false);
    }
  };

  const dashboardSummary: DashboardSummary = calculateDashboardSummary(clients);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0EBF8" />

        {/* Global Toast Notification */}
        <VoiceToast
          message={toastMessage}
          isError={toastIsError}
          onDismiss={() => setToastMessage(null)}
        />

        {/* Screen 2: Client Details Screen (Shown when a client is tapped) */}
        {selectedClient ? (
          <ClientDetailsScreen
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
            onToggleVideo={handleToggleVideo}
            onCompleteVideo={handleCompleteVideo}
            onReopenVideo={handleReopenVideo}
            onOpenVoice={() => setIsVoiceAssistantVisible(true)}
            onDeleteClient={handleDeleteClient}
            onEditClient={(c) => {
              setClientForExport(c);
              setIsGlobalExportVisible(true);
            }}
          />
        ) : (
          /* Main Views */
          <View style={styles.mainContainer}>
            {/* Header matching Screen 1 */}
            <Header
              onMenuPress={() => {
                Alert.alert(
                  'EditFlow Menu',
                  'Client Video Tracker\nClaymorphism Edition',
                  [
                    { text: 'Add Client', onPress: () => setIsAddClientVisible(true) },
                    { text: 'Voice Assistant', onPress: () => setIsVoiceAssistantVisible(true) },
                    {
                      text: 'Export Reports (PDF / Excel)',
                      onPress: () => {
                        if (clients.length > 0) {
                          setClientForExport(clients[0]);
                          setIsGlobalExportVisible(true);
                        } else {
                          showNotification('Add a client first to export reports.', true);
                        }
                      },
                    },
                    { text: 'Close', style: 'cancel' },
                  ]
                );
              }}
              onNotificationPress={() => {
                showNotification(`You have ${dashboardSummary.remainingVideos} pending videos across all clients.`);
              }}
            />

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.colors.mint} />
                <Text style={styles.loadingText}>Loading EditFlow...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={THEME.colors.mint}
                    colors={[THEME.colors.mint]}
                  />
                }
              >
                {activeTab === 'home' && (
                  <>
                    {/* Welcome Card matching Screen 1 */}
                    <WelcomeCard userName="Toufiq" />

                    {/* Overall Progress Card matching Screen 1 */}
                    <OverallProgressCard
                      completedVideos={dashboardSummary.completedVideos}
                      totalVideos={dashboardSummary.totalVideos}
                    />

                    {/* 2x2 Statistics Cards Grid matching Screen 1 */}
                    <DashboardSummaryCards summary={dashboardSummary} />

                    {/* Primary Mint Green 3D "+ Add Client" Button matching Screen 1 */}
                    <View style={styles.addClientBtnContainer}>
                      <TouchableOpacity
                        style={styles.largeMintAddButton}
                        onPress={() => setIsAddClientVisible(true)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.addBtnInnerRow}>
                          <Ionicons name="add" size={22} color="#FFFFFF" />
                          <Text style={styles.largeMintAddText}>Add Client</Text>
                        </View>
                        <View style={styles.arrowCircleBadge}>
                          <Ionicons name="arrow-forward" size={16} color={THEME.colors.mint} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Recent Clients Section matching Screen 1 */}
                    <RecentClientsCard
                      clients={clients}
                      onSelectClient={(client) => setSelectedClient(client)}
                      onSeeAllPress={() => setActiveTab('clients')}
                    />
                  </>
                )}

                {activeTab === 'clients' && (
                  <View style={styles.clientsTabContainer}>
                    <View style={styles.tabHeadingRow}>
                      <Text style={styles.tabTitle}>Clients Directory</Text>
                      <Text style={styles.tabSubtitle}>
                        {clients.length} {clients.length === 1 ? 'client' : 'clients'} active
                      </Text>
                    </View>

                    {clients.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Ionicons name="people-outline" size={36} color={THEME.colors.purple} />
                        <Text style={styles.emptyTitle}>No Clients Yet</Text>
                        <Text style={styles.emptySubtitle}>
                          Tap &ldquo;+ Add Client&rdquo; to start tracking deliveries.
                        </Text>
                      </View>
                    ) : (
                      clients.map((c) => {
                        const total = c.calculations.totalVideos;
                        const done = c.calculations.completedVideos;
                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.clientDirectoryCard}
                            onPress={() => setSelectedClient(c)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.clientCardHeader}>
                              <View style={styles.clientAvatarPurple}>
                                <Text style={styles.clientAvatarText}>
                                  {(c.name || 'C').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.clientCardInfo}>
                                <Text style={styles.clientCardName}>{c.name}</Text>
                                <Text style={styles.clientCardSubtitle}>
                                  {formatCurrency(c.ratePerVideo)}/video &bull; {total} videos
                                </Text>
                              </View>
                              <View style={styles.clientCardBadge}>
                                <Text style={styles.clientCardPercent}>{percent}%</Text>
                                <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
                              </View>
                            </View>

                            {/* Mini Progress Track */}
                            <View style={styles.miniTrack}>
                              <View style={[styles.miniFill, { width: `${percent}%` }]} />
                            </View>

                            <View style={styles.clientCardFooter}>
                              <Text style={styles.footerEarned}>
                                {done}/{total} done ({formatCurrency(c.calculations.completedValue)})
                              </Text>
                              <Text style={styles.footerUnused}>
                                Unused: {formatCurrency(c.calculations.unusedBudget)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {activeTab === 'reports' && (
                  <View style={styles.reportsTabContainer}>
                    <View style={styles.tabHeadingRow}>
                      <Text style={styles.tabTitle}>Financial & Delivery Reports</Text>
                      <Text style={styles.tabSubtitle}>Export valid PDF & Excel reports</Text>
                    </View>

                    {clients.map((c) => (
                      <View key={c.id} style={styles.reportItemCard}>
                        <View style={styles.reportItemHeader}>
                          <View>
                            <Text style={styles.reportClientName}>{c.name}</Text>
                            <Text style={styles.reportClientMeta}>
                              Budget: {formatCurrency(c.totalBudget)} &bull; {c.calculations.completedVideos}/{c.calculations.totalVideos} videos delivered
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.reportExportBtn}
                          onPress={() => {
                            setClientForExport(c);
                            setIsGlobalExportVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.reportExportBtnText}>Generate Report (PDF / XLSX)</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === 'more' && (
                  <View style={styles.moreTabContainer}>
                    <View style={styles.tabHeadingRow}>
                      <Text style={styles.tabTitle}>Settings & Diagnostics</Text>
                      <Text style={styles.tabSubtitle}>EditFlow v1.0.0 Claymorphism</Text>
                    </View>

                    <View style={styles.moreCard}>
                      <Text style={styles.moreCardTitle}>App Capabilities</Text>
                      <View style={styles.moreRow}>
                        <Ionicons name="server-outline" size={18} color={THEME.colors.mint} />
                        <Text style={styles.moreRowText}>SQLite Offline Local Storage</Text>
                        <Text style={styles.moreBadge}>ACTIVE</Text>
                      </View>
                      <View style={styles.moreRow}>
                        <Ionicons name="mic-outline" size={18} color={THEME.colors.purple} />
                        <Text style={styles.moreRowText}>Native Voice Recognition</Text>
                        <Text style={styles.moreBadge}>READY</Text>
                      </View>
                      <View style={styles.moreRow}>
                        <Ionicons name="document-outline" size={18} color={THEME.colors.mint} />
                        <Text style={styles.moreRowText}>PDF & Excel (.xlsx) Engine</Text>
                        <Text style={styles.moreBadge}>WINANSI SAFE</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={{ height: 90 }} />
              </ScrollView>
            )}

            {/* Bottom 5-Tab NavigationBar matching reference image */}
            <NavigationBar
              currentTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSelectedClient(null);
              }}
              onVoicePress={() => setIsVoiceAssistantVisible(true)}
            />
          </View>
        )}

        {/* Screen 3: Voice Control Modal matching reference image */}
        <VoiceAssistantModal
          visible={isVoiceAssistantVisible}
          onClose={() => setIsVoiceAssistantVisible(false)}
          clients={clients}
          onExecutePendingAction={handleExecuteVoiceAction}
          onNavigate={handleVoiceNavigate}
          onNotify={showNotification}
        />

        {/* Add Client Modal */}
        <AddClientModal
          visible={isAddClientVisible}
          onClose={() => setIsAddClientVisible(false)}
          onAddClient={handleAddClient}
        />

        {/* Global Export Modal for Reports tab */}
        {clientForExport && (
          <ClientHistoryExportModal
            visible={isGlobalExportVisible}
            client={clientForExport}
            onClose={() => {
              setIsGlobalExportVisible(false);
              setClientForExport(null);
            }}
            onToggleVideo={handleToggleVideo}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  addClientBtnContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: 20,
  },
  largeMintAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.mint,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  addBtnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeMintAddText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  arrowCircleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  clientsTabContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 20,
  },
  tabHeadingRow: {
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  tabSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  clientDirectoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatarPurple: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  clientCardInfo: {
    flex: 1,
  },
  clientCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  clientCardSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  clientCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientCardPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  miniTrack: {
    height: 6,
    backgroundColor: '#EAE4F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  miniFill: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 3,
  },
  clientCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerEarned: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textNavy,
  },
  footerUnused: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.amber,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  reportsTabContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 20,
  },
  reportItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  reportItemHeader: {
    marginBottom: 14,
  },
  reportClientName: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  reportClientMeta: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  reportExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.purple,
    borderRadius: 9999,
    paddingVertical: 12,
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  reportExportBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moreTabContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 20,
  },
  moreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    gap: 16,
  },
  moreCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moreRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textNavy,
  },
  moreBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.mint,
    backgroundColor: THEME.colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
});
