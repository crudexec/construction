# Contractor CRM Mobile App - Implementation Plan

## Overview
React Native Expo app for field staff to conduct project walkarounds with voice recording and photo capture capabilities.

## Phase 1: Foundation (Week 1)
### 1.1 Project Setup ✅
- [x] Initialize Expo project with TypeScript
- [x] Set up folder structure
- [ ] Install core dependencies
- [ ] Configure ESLint and Prettier
- [ ] Set up environment variables

### 1.2 Authentication System
- [ ] Create login screen with existing backend integration
- [ ] Implement JWT token management with expo-secure-store
- [ ] Add auto-refresh token logic
- [ ] Create auth context and hooks

## Phase 2: Core Features (Week 2-3)
### 2.1 Project Management
- [ ] Fetch and display user's assigned projects
- [ ] Project detail screen
- [ ] Offline project data caching
- [ ] Search and filter projects

### 2.2 Walkaround Recording Feature
- [ ] Audio recording with expo-av
- [ ] Real-time recording UI with timer
- [ ] Pause/resume functionality
- [ ] Background recording support
- [ ] Audio file compression

### 2.3 Photo Capture Integration
- [ ] Camera integration during recording
- [ ] Photo preview thumbnails
- [ ] GPS location tagging
- [ ] Timestamp synchronization with audio

## Phase 3: Advanced Features (Week 3-4)
### 3.1 Asset Upload System
- [ ] Queue-based upload manager
- [ ] Chunked file uploads for large files
- [ ] Retry mechanism for failed uploads
- [ ] Progress tracking UI
- [ ] Background upload support

### 3.2 AI Summarization
- [ ] Integrate OpenAI/Claude API
- [ ] Audio transcription
- [ ] Smart report generation
- [ ] Edit and review summaries
- [ ] Export to PDF

### 3.3 Offline Mode
- [ ] Local data storage with expo-file-system
- [ ] Sync queue management
- [ ] Conflict resolution
- [ ] Auto-sync when online

## Phase 4: Backend Integration (Week 2-4, parallel)
### 4.1 New API Endpoints
```typescript
// Required endpoints
POST   /api/mobile/auth/device     // Device registration
POST   /api/project/:id/walkaround // Create walkaround session
POST   /api/walkaround/:id/audio   // Upload audio chunks
POST   /api/walkaround/:id/photos  // Upload photos
POST   /api/walkaround/:id/complete // Finalize and generate report
GET    /api/walkaround/:id/report  // Get generated report
```

### 4.2 Database Schema Updates
```prisma
model Walkaround {
  id          String   @id @default(cuid())
  projectId   String
  userId      String
  audioUrl    String?
  transcript  String?
  summary     String?
  reportUrl   String?
  photos      Photo[]
  metadata    Json?
  createdAt   DateTime @default(now())
  
  project     Card     @relation(fields: [projectId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}

model Photo {
  id           String      @id @default(cuid())
  walkaroundId String
  url          String
  timestamp    DateTime
  location     Json?
  caption      String?
  
  walkaround   Walkaround  @relation(fields: [walkaroundId], references: [id])
}
```

## Phase 5: Testing & Deployment (Week 5)
### 5.1 Testing
- [ ] Unit tests for core functions
- [ ] Integration tests for API calls
- [ ] Field testing with actual users
- [ ] Performance optimization

### 5.2 Deployment
- [ ] EAS Build setup
- [ ] iOS TestFlight deployment
- [ ] Android beta testing
- [ ] Production release

## Technical Stack

### Frontend (Mobile)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **API Client**: Axios with React Query
- **Forms**: React Hook Form
- **UI Components**: Custom components with StyleSheet

### Key Libraries
- **expo-av**: Audio recording
- **expo-camera**: Photo capture
- **expo-file-system**: File management
- **expo-secure-store**: Secure token storage
- **expo-location**: GPS coordinates
- **expo-task-manager**: Background tasks

### Backend Integration
- **Authentication**: JWT tokens (existing)
- **API**: REST API (existing Next.js)
- **File Storage**: Local + cloud upload
- **Database**: PostgreSQL with Prisma (existing)

## Development Workflow

1. **Local Development**
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```

2. **Testing on Device**
   - Use Expo Go app for development
   - EAS Build for production testing

3. **API Development**
   - Add mobile-specific endpoints to existing Next.js backend
   - Test with Postman/Insomnia

## Key Features Implementation Details

### Audio Recording with Photo Capture
```typescript
// Simultaneous recording and photo capture
const startWalkaround = async () => {
  // Start audio recording
  const recording = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  
  // Enable camera for photo capture
  // Photos are taken without stopping audio
  // Each photo is timestamped and linked to audio position
};
```

### Offline-First Architecture
```typescript
// Queue management for offline support
const uploadQueue = {
  audio: [],
  photos: [],
  metadata: []
};

// Auto-sync when online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    processUploadQueue();
  }
});
```

### Report Generation Flow
1. User completes walkaround
2. Audio and photos uploaded
3. Backend transcribes audio (Whisper API)
4. AI generates structured report
5. PDF created and sent to project

## Success Metrics
- [ ] 30-second app launch to recording
- [ ] < 5% crash rate
- [ ] 95% successful upload rate
- [ ] 80% user satisfaction score
- [ ] 50% reduction in report creation time

## Timeline
- **Week 1**: Foundation and auth
- **Week 2-3**: Core recording features
- **Week 3-4**: Upload system and AI integration
- **Week 4**: Backend API development
- **Week 5**: Testing and deployment

## Next Steps
1. Install dependencies: `cd mobile-app && npm install`
2. Start implementing auth flow
3. Create backend API endpoints
4. Begin UI/UX implementation