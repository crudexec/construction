import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio, AVPlaybackSource } from 'expo-av';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface WalkaroundViewerProps {
  route: {
    params: {
      walkaround: {
        sessionId: string;
        audioUri?: string;
        photos: any[];
        endTime: string;
        status: string;
      };
    };
  };
}

export default function WalkaroundViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { walkaround } = route.params as any;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    console.log('WalkaroundViewer received walkaround data:', walkaround);
    console.log('Photos in walkaround:', walkaround.photos);
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound, walkaround]);

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playPauseAudio = async () => {
    try {
      if (!walkaround.audioUri) {
        Alert.alert('No Audio', 'This walkaround has no audio recording');
        return;
      }

      if (!sound) {
        setIsLoading(true);
        console.log('Loading audio from:', walkaround.audioUri);
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: walkaround.audioUri } as AVPlaybackSource,
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        
        setSound(newSound);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Playback Error', 'Failed to play audio recording');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    setPlaybackStatus(status);
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const renderPhotoGallery = () => {
    console.log('Rendering photo gallery. Photos:', walkaround.photos);
    
    if (!walkaround.photos || walkaround.photos.length === 0) {
      return (
        <View style={styles.noPhotosContainer}>
          <Text style={styles.noPhotosText}>No photos taken</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.photoGallery}
      >
        {walkaround.photos.map((photo: any, index: number) => {
          console.log(`Rendering photo ${index}:`, photo);
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.photoContainer}
              onPress={() => setSelectedPhotoIndex(index)}
            >
              <Image 
                source={{ uri: photo.uri }} 
                style={styles.photoThumbnail}
                resizeMode="cover"
                onError={(error) => console.error(`Failed to load photo ${index}:`, error)}
                onLoad={() => console.log(`Photo ${index} loaded successfully`)}
              />
              <Text style={styles.photoIndex}>{index + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderSelectedPhoto = () => {
    if (selectedPhotoIndex === null || !walkaround.photos[selectedPhotoIndex]) {
      return null;
    }

    const photo = walkaround.photos[selectedPhotoIndex];
    
    return (
      <View style={styles.selectedPhotoContainer}>
        <TouchableOpacity
          style={styles.photoCloseButton}
          onPress={() => setSelectedPhotoIndex(null)}
        >
          <Text style={styles.photoCloseText}>✕</Text>
        </TouchableOpacity>
        <Image 
          source={{ uri: photo.uri }} 
          style={styles.selectedPhoto}
          resizeMode="contain"
        />
        <Text style={styles.photoInfo}>
          Photo {selectedPhotoIndex + 1} of {walkaround.photos.length}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectedPhotoIndex !== null ? (
        renderSelectedPhoto()
      ) : (
        <>
          <ScrollView style={styles.content}>
            {/* Header Info */}
            <View style={styles.headerSection}>
              <Text style={styles.sessionTitle}>Walkaround Recording</Text>
              <Text style={styles.sessionId}>Session: {walkaround.sessionId}</Text>
              <Text style={styles.dateText}>
                {format(new Date(walkaround.endTime), 'PPpp')}
              </Text>
              <View style={[styles.statusBadge, (styles as any)[`status${walkaround.status}`]]}>
                <Text style={styles.statusText}>{walkaround.status}</Text>
              </View>
            </View>

            {/* Audio Player */}
            <View style={styles.audioSection}>
              <Text style={styles.sectionTitle}>🎵 Audio Recording</Text>
              {walkaround.audioUri ? (
                <View style={styles.audioControls}>
                  <TouchableOpacity
                    style={[styles.playButton, isPlaying && styles.playButtonActive]}
                    onPress={playPauseAudio}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.playButtonText}>
                        {isPlaying ? '⏸' : '▶️'}
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  {sound && (
                    <TouchableOpacity style={styles.stopButton} onPress={stopAudio}>
                      <Text style={styles.stopButtonText}>⏹</Text>
                    </TouchableOpacity>
                  )}
                  
                  {playbackStatus && (
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressText}>
                        {formatDuration(playbackStatus.positionMillis || 0)} / {formatDuration(playbackStatus.durationMillis || 0)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.noAudioText}>No audio recording available</Text>
              )}
            </View>

            {/* Photos */}
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>
                📷 Photos ({walkaround.photos?.length || 0})
              </Text>
              {renderPhotoGallery()}
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sessionId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statuscompleted_locally: {
    backgroundColor: '#e8f5e8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d7d32',
  },
  audioSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  progressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  noAudioText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  photosSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoGallery: {
    marginTop: 8,
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoIndex: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  noPhotosContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  selectedPhotoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedPhoto: {
    width: width,
    height: '80%',
  },
  photoInfo: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
});