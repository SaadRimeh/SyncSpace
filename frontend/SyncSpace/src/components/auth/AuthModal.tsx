import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  visible: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible }) => {
  const { login, register, quickDemoLogin } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  );

  const resetForm = () => {
    setErrorMessage(null);
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleLoginSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setErrorMessage(res.message || 'Login failed. Please check your credentials.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters (include a letter and a number).');
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      setErrorMessage('Password must include at least one letter (e.g. A–Z).');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setErrorMessage('Password must include at least one number (e.g. 1–9).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        currency,
        timezone,
      });
      if (!res.success) {
        setErrorMessage(res.message || 'Registration failed. Please try again.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    setErrorMessage(null);
    try {
      const res = await quickDemoLogin();
      if (!res.success) {
        setErrorMessage(res.message || 'Could not initiate demo session.');
      }
    } catch {
      setErrorMessage('Demo login failed. Make sure backend is running.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header Brand */}
          <View style={styles.brandHeader}>
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandBadgeText}>SYNCPACE CORE</Text>
            </View>
            <Text style={styles.appTitle}>SyncSpace</Text>
            <Text style={styles.appSubtitle}>
              Autonomous Personal Operating System
            </Text>
          </View>

          {/* Main Glass Card */}
          <View style={styles.card}>
            {/* Tab Selector */}
            <View style={styles.tabBar}>
              <Pressable
                style={[
                  styles.tabButton,
                  mode === 'login' && styles.tabButtonActive,
                ]}
                onPress={() => handleModeSwitch('login')}>
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'login' && styles.tabButtonTextActive,
                  ]}>
                  Sign In
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tabButton,
                  mode === 'register' && styles.tabButtonActive,
                ]}
                onPress={() => handleModeSwitch('register')}>
                <Text
                  style={[
                    styles.tabButtonText,
                    mode === 'register' && styles.tabButtonTextActive,
                  ]}>
                  Create Account
                </Text>
              </Pressable>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            {mode === 'register' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex Mercer"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                placeholder="name@syncspace.io"
                placeholderTextColor={Colors.dark.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.textInput}
                placeholder={mode === 'register' ? 'Min 8 chars, include a letter & number' : 'Enter your password'}
                placeholderTextColor={Colors.dark.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {mode === 'register' ? (
                <Text style={styles.passwordHint}>
                  {'Must be 8+ characters with at least 1 letter and 1 number'}
                </Text>
              ) : null}
            </View>

            {mode === 'register' ? (
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CURRENCY</Text>
                  <View style={styles.currencyRow}>
                    {['USD', 'EUR', 'GBP'].map((curr) => (
                      <Pressable
                        key={curr}
                        style={[
                          styles.chip,
                          currency === curr && styles.chipActive,
                        ]}
                        onPress={() => setCurrency(curr)}>
                        <Text
                          style={[
                            styles.chipText,
                            currency === curr && styles.chipTextActive,
                          ]}>
                          {curr}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (loading || demoLoading) && styles.buttonDisabled,
                pressed && { opacity: 0.85 },
              ]}
              disabled={loading || demoLoading}
              onPress={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit}>
              {loading ? (
                <ActivityIndicator color="#0A0B0E" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Sign In to SyncSpace' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            {/* Quick Demo Access Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 1-Click Demo Button */}
            <Pressable
              style={({ pressed }) => [
                styles.demoButton,
                (loading || demoLoading) && styles.buttonDisabled,
                pressed && { opacity: 0.85 },
              ]}
              disabled={loading || demoLoading}
              onPress={handleQuickDemo}>
              {demoLoading ? (
                <ActivityIndicator color={Colors.dark.canvas} size="small" />
              ) : (
                <View style={styles.demoButtonContent}>
                  <Text style={styles.demoLightning}>⚡</Text>
                  <View>
                    <Text style={styles.demoButtonTitle}>
                      1-Click Instant Demo Login
                    </Text>
                    <Text style={styles.demoButtonSubtitle}>
                      Auto-initializes Alex Mercer dev account
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          </View>

          {/* Footer Info */}
          <Text style={styles.footerText}>
            Protected by Argon2 & High-Speed Redis Token Engine
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.seven,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half + 2,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.two,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.canvas,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.canvas,
    letterSpacing: 1.2,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: -1,
  },
  appSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.half,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.lg,
    padding: Spacing.one,
    marginBottom: Spacing.four,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.dark.canvas,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    color: Colors.dark.text,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: Colors.dark.synapse,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  chipTextActive: {
    color: Colors.dark.synapse,
  },
  primaryButton: {
    backgroundColor: Colors.dark.canvas,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: Colors.dark.canvas,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: '#0A0B0E',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
  },
  demoButton: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  demoLightning: {
    fontSize: 20,
  },
  demoButtonTitle: {
    color: Colors.dark.canvas,
    fontSize: 13,
    fontWeight: '700',
  },
  demoButtonSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    marginTop: Spacing.half,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  passwordHint: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginTop: Spacing.one,
    paddingHorizontal: 2,
  },
});
