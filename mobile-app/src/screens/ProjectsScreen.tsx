import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { walkaroundService } from '../services/walkaround.service';
import Toast from 'react-native-toast-message';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, ANIMATION, RADIUS, ICONS } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

interface Project {
  id: string;
  title: string;
  description?: string;
  projectAddress?: string;
  projectCity?: string;
  projectState?: string;
  status: string;
  priority: string;
  stage: {
    name: string;
    color: string;
  };
}

interface ProjectsScreenProps {
  onLogout: () => void;
}

export default function ProjectsScreen({ onLogout }: ProjectsScreenProps) {
  const navigation = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalkarounds, setShowWalkarounds] = useState(false);
  const [storedWalkarounds, setStoredWalkarounds] = useState<any[]>([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchProjects();
    loadStoredWalkarounds();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION.normal,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION.normal,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadStoredWalkarounds = async () => {
    try {
      const walkarounds = await walkaroundService.getStoredWalkarounds();
      setStoredWalkarounds(walkarounds);
      console.log('Loaded stored walkarounds:', walkarounds.length);
    } catch (error) {
      console.error('Failed to load stored walkarounds:', error);
    }
  };

  const fetchProjects = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('Fetching projects from API...');
      const response = await apiClient.get('/api/card/all');
      console.log('API Response:', response.data);
      console.log('Number of projects:', response.data.length);
      
      setProjects(response.data);
      
      if (response.data.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Projects',
          text2: 'No active projects found',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to load projects',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleProjectPress = (project: Project) => {
    (navigation as any).navigate('Walkaround', {
      projectId: project.id,
      projectName: project.title,
    });
  };

  const handleWalkaroundPress = (walkaround: any) => {
    (navigation as any).navigate('WalkaroundViewer', {
      walkaround,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return COLORS.success;
      case 'MEDIUM':
        return COLORS.warning;
      case 'HIGH':
        return COLORS.secondary;
      case 'URGENT':
        return COLORS.error;
      default:
        return COLORS.neutral500;
    }
  };

  const renderProject = ({ item }: { item: Project }) => {
    const location = [item.projectCity, item.projectState]
      .filter(Boolean)
      .join(', ');

    return (
      <Card variant="elevated" style={styles.projectCard}>
        <TouchableOpacity
          onPress={() => handleProjectPress(item)}
          activeOpacity={0.8}
          style={styles.projectContent}
        >
          {/* Header */}
          <View style={styles.projectHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.projectTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {location && (
                <View style={styles.locationRow}>
                  <Ionicons name={ICONS.location} size={14} color={COLORS.textSecondary} />
                  <Text style={styles.projectLocation}>
                    {location}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.stageBadge,
                { backgroundColor: item.stage.color || COLORS.primary },
              ]}
            >
              <Text style={styles.stageText}>{item.stage.name}</Text>
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.projectDescription} numberOfLines={3}>
              {item.description}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.projectFooter}>
            <View style={styles.priorityContainer}>
              <View 
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(item.priority) }
                ]}
              />
              <Text style={styles.priorityText}>{item.priority} Priority</Text>
            </View>
            <View style={styles.actionContainer}>
              <Text style={styles.actionText}>Start Walkaround</Text>
              <Ionicons name={ICONS.forward} size={16} color={COLORS.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Projects</Text>
              <Text style={styles.headerSubtitle}>
                {projects.length} active project{projects.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Button
              title=""
              onPress={onLogout}
              variant="ghost"
              size="md"
              iconOnly
              leftIcon="log-out-outline"
              style={styles.logoutButton}
            />
          </View>
        </View>

        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                fetchProjects(true);
                loadStoredWalkarounds();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            storedWalkarounds.length > 0 ? (
              <Card variant="elevated" style={styles.walkaroundsSection}>
                <TouchableOpacity
                  style={styles.walkaroundsHeader}
                  onPress={() => setShowWalkarounds(!showWalkarounds)}
                  activeOpacity={0.7}
                >
                  <View style={styles.walkaroundsHeaderContent}>
                    <View style={styles.walkaroundsIcon}>
                      <Ionicons name={showWalkarounds ? ICONS.folderOpen : ICONS.folder} size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.walkaroundsTitleContainer}>
                      <Text style={styles.walkaroundsTitle}>
                        Stored Walkarounds
                      </Text>
                      <Text style={styles.walkaroundsCount}>
                        {storedWalkarounds.length} session{storedWalkarounds.length !== 1 ? 's' : ''} saved locally
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name={showWalkarounds ? ICONS.collapse : ICONS.expand} 
                    size={24} 
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
                {showWalkarounds && (
                  <View style={styles.walkaroundsList}>
                    {storedWalkarounds.map((walkaround, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.walkaroundItem}
                        onPress={() => handleWalkaroundPress(walkaround)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.walkaroundContent}>
                          <Text style={styles.walkaroundText}>
                            Session {walkaround.sessionId}
                          </Text>
                          <Text style={styles.walkaroundSubtext}>
                            {walkaround.photos?.length || 0} photo{(walkaround.photos?.length || 0) !== 1 ? 's' : ''} • {walkaround.status}
                          </Text>
                        </View>
                        <Ionicons name={ICONS.forward} size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name={ICONS.construction} size={40} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyText}>No Projects Available</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or contact your administrator for project assignments
              </Text>
              <Button
                title="Refresh Projects"
                onPress={() => fetchProjects(true)}
                variant="outline"
                size="sm"
                leftIcon={ICONS.refresh}
                style={styles.refreshButton}
              />
            </View>
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    gap: SPACING.xs,
    flex: 1,
  },
  logoutButton: {
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  listContent: {
    padding: LAYOUT.screenPadding,
    gap: SPACING.md,
  },
  projectCard: {
    marginBottom: SPACING.sm,
  },
  projectContent: {
    gap: SPACING.md,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  titleContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  projectTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
    lineHeight: TYPOGRAPHY.lineHeight.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  projectLocation: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.sm,
  },
  stageBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  stageText: {
    color: COLORS.neutral100,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    textTransform: 'uppercase',
  },
  projectDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.base,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['6xl'],
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.base,
    maxWidth: 280,
  },
  refreshButton: {
    marginTop: SPACING.md,
  },
  walkaroundsSection: {
    marginBottom: SPACING.lg,
  },
  walkaroundsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  walkaroundsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  walkaroundsIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkaroundsTitleContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  walkaroundsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
  },
  walkaroundsCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  walkaroundsList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  walkaroundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  walkaroundContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  walkaroundText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text,
  },
  walkaroundSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});