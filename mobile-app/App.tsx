import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import WalkaroundScreen from './src/screens/WalkaroundScreen';
import WalkaroundViewerScreen from './src/screens/WalkaroundViewerScreen';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('user');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return null; // Or a splash screen component
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen 
                name="Login"
                options={{ headerShown: false }}
              >
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen 
                  name="Projects"
                  options={{ 
                    title: 'My Projects',
                    headerRight: () => (
                      <TouchableOpacity
                        onPress={handleLogout}
                        style={{ marginRight: 15 }}
                      >
                        <Text style={{ color: '#fff', fontSize: 16 }}>Logout</Text>
                      </TouchableOpacity>
                    ),
                  }}
                >
                  {(props) => <ProjectsScreen {...props} onLogout={handleLogout} />}
                </Stack.Screen>
                <Stack.Screen 
                  name="Walkaround" 
                  component={WalkaroundScreen} 
                  options={{ title: 'Project Walkaround' }}
                />
                <Stack.Screen 
                  name="WalkaroundViewer" 
                  component={WalkaroundViewerScreen} 
                  options={{ title: 'View Walkaround' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}