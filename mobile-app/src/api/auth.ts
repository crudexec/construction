import { apiClient } from './client';
import * as SecureStore from 'expo-secure-store';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company: {
    id: string;
    name: string;
  };
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post('/api/auth/login', credentials);
    const { token, user } = response.data;
    
    await SecureStore.setItemAsync('authToken', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    
    return { token, user };
  },

  async logout() {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('user');
  },

  async getCurrentUser(): Promise<User | null> {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('authToken');
    return !!token;
  },
};