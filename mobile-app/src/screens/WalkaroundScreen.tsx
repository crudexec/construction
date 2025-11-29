import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { walkaroundService } from '../services/walkaround.service';
import { useNavigation, useRoute } from '@react-navigation/native';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AudioVisualizer from '../components/ui/AudioVisualizer';
import RecordingPulse from '../components/ui/RecordingPulse';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, ANIMATION, RADIUS, ICONS } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

export default function WalkaroundScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectId, projectName } = route.params as any;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<any>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const recordingDotAnim = useRef(new Animated.Value(1)).current;
  const recordingIndicatorScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkPermissions();
    
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

  // Recording dot animation
  useEffect(() => {
    if (isRecording && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingDotAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(recordingDotAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      recordingDotAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  const checkPermissions = async () => {
    try {
      setCheckingPermissions(true);
      
      // Request audio permissions
      const audioResult = await Audio.requestPermissionsAsync();
      
      // Request camera permissions
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      
      // Request media library permissions
      const mediaResult = await MediaLibrary.requestPermissionsAsync();
      
      console.log('Permission results:', {
        audio: audioResult.status,
        camera: cameraResult.status,
        media: mediaResult.status
      });
      
      if (audioResult.status !== 'granted') {
        Alert.alert(
          'Audio Permission Required',
          'This app needs access to your microphone to record voice notes.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Settings', onPress: () => {/* Open settings */} }
          ]
        );
        return;
      }
      
      if (cameraResult.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs access to your camera to take photos during walkarounds.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Settings', onPress: () => {/* Open settings */} }
          ]
        );
        return;
      }
      
      setPermissionsGranted(true);
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert('Error', 'Failed to check permissions');
    } finally {
      setCheckingPermissions(false);
    }
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permissions Required', 'Please grant audio and camera permissions first.');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Starting recording for project:', projectId);
      
      const sessionId = await walkaroundService.startRecording(projectId);
      console.log('Recording started, session ID:', sessionId);
      
      setIsRecording(true);
      setRecordingTime(0);

      // Recording start animation
      Animated.sequence([
        Animated.timing(recordingIndicatorScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(recordingIndicatorScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      let errorMessage = 'Failed to start recording';
      
      if (error.message?.includes('permission')) {
        errorMessage = 'Audio recording permission was denied. Please enable microphone access in your device settings.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Recording Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await walkaroundService.resumeRecording();
      } else {
        await walkaroundService.pauseRecording();
      }
      setIsPaused(!isPaused);
    } catch (error) {
      Alert.alert('Error', 'Failed to pause/resume recording');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowCamera(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log('Photo captured:', photo?.uri);
        
        // For now, just add to local state
        // The walkaround service will handle the actual upload
        const newPhoto = {
          uri: photo?.uri,
          timestamp: new Date(),
        };
        setPhotos([...photos, newPhoto]);
        setShowCamera(false);
      } catch (error) {
        console.error('Failed to capture photo:', error);
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handleStopRecording = async () => {
    Alert.alert(
      'Stop Recording',
      'Are you sure you want to stop and save this walkaround?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop & Save',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('Stopping walkaround recording...');
              console.log('Photos to save:', photos);
              
              // Pass photos to the service before stopping
              walkaroundService.setPhotos(photos);
              
              await walkaroundService.stopRecording();
              
              console.log('Walkaround stopped successfully');
              Alert.alert('Success', 'Walkaround recording saved locally!', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Failed to save walkaround:', error);
              Alert.alert('Error', `Failed to save walkaround: ${error.message || 'Unknown error'}`);
            } finally {
              setIsLoading(false);
              setIsRecording(false);
              setRecordingTime(0);
              setPhotos([]); // Clear local photos
            }
          }
        }
      ]
    );
  };

  if (checkingPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="lock-closed-outline" size={40} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.permissionText}>Permissions Required</Text>
          <Text style={styles.permissionSubtext}>
            This app needs access to your microphone and camera to record walkarounds with voice notes and photos.
          </Text>
          <Button
            title="Check Permissions Again"
            onPress={checkPermissions}
            variant="primary"
            size="lg"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Take Photo</Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <Button
              title="Cancel"
              onPress={() => setShowCamera(false)}
              variant="ghost"
              size="lg"
              textStyle={styles.cameraButtonText}
            />
          </View>
        </View>
      </CameraView>
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
          <View style={styles.headerContent}>
            <Text style={styles.projectName}>{projectName}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Project Walkaround</Text>
              {isRecording && (
                <View style={styles.liveIndicator}>
                  <Animated.View
                    style={[
                      styles.liveDot,
                      { opacity: recordingDotAnim }
                    ]}
                  />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {!isRecording ? (
            <View style={styles.startContainer}>
              <Card variant="elevated" style={styles.instructionCard}>
                <View style={styles.instructionIcon}>
                  <Ionicons name={ICONS.microphone} size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.instructionTitle}>Ready to Record</Text>
                <Text style={styles.instructions}>
                  Start recording to capture voice notes and photos during your project walkaround. 
                  You can pause, resume, and take photos at any time.
                </Text>
                <Button
                  title="Start Recording"
                  onPress={handleStartRecording}
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  loading={isLoading}
                  fullWidth
                  leftIcon={ICONS.record}
                  style={styles.startButton}
                />
              </Card>
            </View>
          ) : (
            <View style={styles.recordingContainer}>
              {/* Recording Status Card */}
              <RecordingPulse isActive={isRecording && !isPaused} size={300}>
                <Card variant="elevated" style={styles.recordingCard}>
                  <View style={styles.recordingHeader}>
                    <View style={styles.recordingTopSection}>
                      <Animated.View 
                        style={[
                          styles.recordingIndicator,
                          { transform: [{ scale: recordingIndicatorScale }] }
                        ]}
                      >
                        <Animated.View
                          style={[
                            styles.recordDot,
                            !isPaused && styles.recordDotActive,
                            { opacity: recordingDotAnim }
                          ]}
                        />
                        <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                      </Animated.View>
                      <View style={styles.statusContainer}>
                        <Text style={styles.recordingStatus}>
                          {isPaused ? 'Paused' : 'Recording...'}
                        </Text>
                        <Text style={styles.recordingSubtext}>
                          Voice notes and photos
                        </Text>
                      </View>
                    </View>
                    
                    {/* Audio Visualizer */}
                    <View style={styles.visualizerContainer}>
                      <AudioVisualizer
                        isActive={isRecording && !isPaused}
                        barCount={7}
                        height={50}
                        width={120}
                        style={styles.visualizer}
                      />
                    </View>
                  </View>
                </Card>
              </RecordingPulse>

              {/* Control Buttons */}
              <Card style={styles.controlsCard}>
                <View style={styles.controls}>
                  <Button
                    title={isPaused ? 'Resume' : 'Pause'}
                    onPress={handlePauseResume}
                    variant="outline"
                    size="md"
                    leftIcon={isPaused ? ICONS.play : ICONS.pause}
                    style={styles.controlButton}
                  />

                  <Button
                    title="Photo"
                    onPress={handleTakePhoto}
                    variant="secondary"
                    size="md"
                    disabled={isPaused}
                    leftIcon={ICONS.camera}
                    style={styles.controlButton}
                  />

                  <Button
                    title="Stop"
                    onPress={handleStopRecording}
                    variant="error"
                    size="md"
                    leftIcon={ICONS.stop}
                    style={styles.controlButton}
                  />
                </View>
              </Card>

              {/* Photos Section */}
              {photos.length > 0 && (
                <Card style={styles.photosCard}>
                  <View style={styles.photosSectionHeader}>
                    <Text style={styles.photosSectionTitle}>
                      Photos Captured
                    </Text>
                    <View style={styles.photosCount}>
                      <Text style={styles.photosCountText}>{photos.length}</Text>
                    </View>
                  </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                  >
                    {photos.map((photo, index) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoThumbnail}
                        />
                        <Text style={styles.photoIndex}>{index + 1}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </Card>
              )}
            </View>
          )}
        </ScrollView>
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
  headerContent: {
    gap: SPACING.xs,
  },
  projectName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentError + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentError,
  },
  liveText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accentError,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  permissionText: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.base,
    maxWidth: 320,
  },
  retryButton: {
    marginTop: SPACING.md,
  },
  startContainer: {
    padding: LAYOUT.screenPadding,
    paddingTop: SPACING['4xl'],
  },
  instructionCard: {
    alignItems: 'center',
    gap: SPACING.lg,
  },
  instructionIcon: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  instructions: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.base,
    maxWidth: 300,
  },
  startButton: {
    marginTop: SPACING.md,
  },
  recordingContainer: {
    padding: LAYOUT.screenPadding,
    gap: SPACING.lg,
  },
  recordingCard: {
    paddingVertical: SPACING.xl,
  },
  recordingHeader: {
    alignItems: 'center',
    gap: SPACING.xl,
  },
  recordingTopSection: {
    alignItems: 'center',
    gap: SPACING.lg,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  recordDot: {
    width: 16,
    height: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral400,
  },
  recordDotActive: {
    backgroundColor: COLORS.error,
  },
  recordingTime: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statusContainer: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recordingStatus: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
  },
  recordingSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  visualizer: {
    // Additional styling if needed
  },
  controlsCard: {
    padding: SPACING.lg,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  controlButton: {
    flex: 1,
  },
  photosCard: {
    gap: SPACING.md,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  photosSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
  },
  photosCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    minWidth: 32,
    alignItems: 'center',
  },
  photosCountText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.neutral100,
  },
  photosScroll: {
    marginHorizontal: -SPACING.md,
  },
  photoContainer: {
    marginLeft: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
  },
  photoIndex: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    paddingTop: SPACING['4xl'],
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.neutral100,
    textAlign: 'center',
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING['4xl'],
    gap: SPACING.xl,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.neutral100,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral100,
  },
  cameraButtonText: {
    color: COLORS.neutral100,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
});