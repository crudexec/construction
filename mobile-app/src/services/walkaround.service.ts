import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export interface WalkaroundPhoto {
  uri: string;
  timestamp: Date;
  location?: Location.LocationObject;
  caption?: string;
}

export interface WalkaroundSession {
  id: string;
  projectId: string;
  audioUri?: string;
  photos: WalkaroundPhoto[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

class WalkaroundService {
  private recording: Audio.Recording | null = null;
  private photos: WalkaroundPhoto[] = [];
  private sessionId: string | null = null;

  async startRecording(projectId: string): Promise<string> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      console.log('Audio permission granted, configuring audio...');

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Audio configured, starting recording...');

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.photos = [];
      this.sessionId = `local_${Date.now()}`; // Use local ID for now

      console.log('Recording started successfully');

      // TODO: Create session on backend later
      // const response = await apiClient.post(`/api/project/${projectId}/walkaround`, {
      //   startTime: new Date(),
      // });
      // this.sessionId = response.data.id;

      return this.sessionId;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async pauseRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.pauseAsync();
    }
  }

  async resumeRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.startAsync();
    }
  }

  async takePhoto(): Promise<WalkaroundPhoto> {
    try {
      // Get camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission not granted');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        exif: true,
      });

      if (result.canceled) {
        throw new Error('Photo capture canceled');
      }

      // Get location
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      let location: Location.LocationObject | undefined;
      if (locationStatus === 'granted') {
        location = await Location.getCurrentPositionAsync({});
      }

      const photo: WalkaroundPhoto = {
        uri: result.assets[0].uri,
        timestamp: new Date(),
        location,
      };

      this.photos.push(photo);
      return photo;
    } catch (error) {
      console.error('Failed to take photo:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      console.log('Stopping recording...');
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      console.log('Recording stopped, audio saved to:', uri);

      // Save recording info locally for now
      const recordingData = {
        sessionId: this.sessionId,
        audioUri: uri,
        photos: this.photos,
        endTime: new Date(),
        status: 'completed_locally'
      };

      console.log('Recording data:', recordingData);

      // Save to AsyncStorage for now
      const walkarounds = await this.getLocalWalkarounds();
      walkarounds.push(recordingData);
      await AsyncStorage.setItem('walkarounds', JSON.stringify(walkarounds));

      // TODO: Upload to backend later
      // await this.uploadAudio(uri);
      // await this.uploadPhotos();
      // await this.finalizeSession();

      console.log('Walkaround saved successfully (locally)');

      // Clean up
      this.recording = null;
      this.photos = [];
      this.sessionId = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      // Make sure to clean up even if there's an error
      this.recording = null;
      this.photos = [];
      this.sessionId = null;
      throw new Error(`Failed to save recording: ${error}`);
    }
  }

  private async uploadAudio(uri: string): Promise<void> {
    const formData = new FormData();
    formData.append('audio', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    await apiClient.post(`/api/walkaround/${this.sessionId}/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  private async uploadPhotos(): Promise<void> {
    for (const photo of this.photos) {
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}.jpg`,
      } as any);
      formData.append('timestamp', photo.timestamp.toISOString());
      if (photo.location) {
        formData.append('location', JSON.stringify(photo.location));
      }

      await apiClient.post(`/api/walkaround/${this.sessionId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
  }

  private async finalizeSession(): Promise<void> {
    await apiClient.post(`/api/walkaround/${this.sessionId}/complete`, {
      endTime: new Date(),
      photoCount: this.photos.length,
    });
  }

  async generateReport(sessionId: string): Promise<string> {
    const response = await apiClient.post(`/api/walkaround/${sessionId}/report`);
    return response.data.reportUrl;
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  getPhotos(): WalkaroundPhoto[] {
    return this.photos;
  }

  setPhotos(photos: any[]): void {
    this.photos = photos.map(photo => ({
      uri: photo.uri,
      timestamp: photo.timestamp,
      location: photo.location,
      caption: photo.caption,
    }));
    console.log('Photos set in service:', this.photos);
  }

  private async getLocalWalkarounds(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('walkarounds');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local walkarounds:', error);
      return [];
    }
  }

  async getStoredWalkarounds(): Promise<any[]> {
    return this.getLocalWalkarounds();
  }
}

export const walkaroundService = new WalkaroundService();