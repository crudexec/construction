import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import Toast from 'react-native-toast-message';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { COLORS, TYPOGRAPHY, SPACING, LAYOUT, ANIMATION, ICONS } from '../constants/design';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION.slow,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION.slow,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Email validation
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      const { user } = await authApi.login({ email, password });
      
      Toast.show({
        type: 'success',
        text1: 'Welcome Back!',
        text2: `Hello ${user.firstName} ${user.lastName}`,
      });

      // Trigger login callback to update app state
      onLogin();
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Invalid email or password';
      
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
      });

      // Set field-specific errors if needed
      if (errorMessage.toLowerCase().includes('email')) {
        setEmailError('Invalid email address');
      } else if (errorMessage.toLowerCase().includes('password')) {
        setPasswordError('Incorrect password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name={ICONS.construction} size={40} color={COLORS.neutral100} />
              </View>
            </View>
            <Text style={styles.title}>Contractor CRM</Text>
            <Text style={styles.subtitle}>Professional field management</Text>
          </View>

          {/* Login Form */}
          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue</Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={emailError}
                leftIcon={ICONS.email}
                containerStyle={styles.inputContainer}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                error={passwordError}
                leftIcon={ICONS.password}
                rightIcon={showPassword ? ICONS.eyeOff : ICONS.eye}
                onRightIconPress={() => setShowPassword(!showPassword)}
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                rightIcon={ICONS.forward}
                style={styles.loginButton}
              />
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Secure access to your construction projects
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    padding: LAYOUT.screenPadding,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: SPACING.xl,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
  },
  form: {
    gap: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
  },
  loginButton: {
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.sm,
  },
});