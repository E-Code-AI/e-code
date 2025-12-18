import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { OAuthService, OAuthProvider } from '../services/oauth';

type LoginScreenProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  onOAuthLogin?: (provider: OAuthProvider) => void;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onOAuthLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Please enter your username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onLogin(username.trim(), password);
    } catch (loginError: any) {
      setError(loginError.message ?? 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    setError(null);

    try {
      if (onOAuthLogin) {
        onOAuthLogin(provider);
      }
      await OAuthService.initiateOAuth(provider);
    } catch (oauthError: any) {
      setError(oauthError.message ?? `Unable to sign in with ${provider}`);
      Alert.alert(
        'Authentication Error',
        oauthError.message ?? `Unable to sign in with ${provider}. Please try again.`
      );
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to E-Code</Text>
        <Text style={styles.subtitle}>Sign in to access your projects anywhere</Text>

        <View style={styles.oauthContainer}>
          <TouchableOpacity
            style={[styles.oauthButton, styles.githubButton]}
            onPress={() => handleOAuthLogin('github')}
            disabled={!!oauthLoading || loading}
            testID="button-oauth-github"
          >
            {oauthLoading === 'github' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.oauthIcon}>G</Text>
                <Text style={styles.oauthButtonText}>Continue with GitHub</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton]}
            onPress={() => handleOAuthLogin('google')}
            disabled={!!oauthLoading || loading}
            testID="button-oauth-google"
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator color="#1f2937" size="small" />
            ) : (
              <>
                <Text style={[styles.oauthIcon, { color: '#ea4335' }]}>G</Text>
                <Text style={[styles.oauthButtonText, { color: '#1f2937' }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          editable={!loading && !oauthLoading}
          testID="input-username"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading && !oauthLoading}
          testID="input-password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (loading || oauthLoading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !!oauthLoading}
          testID="button-login"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  oauthContainer: {
    gap: 12,
    marginTop: 8
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10
  },
  githubButton: {
    backgroundColor: '#24292e'
  },
  googleButton: {
    backgroundColor: '#ffffff'
  },
  oauthIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155'
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 14
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#e2e8f0',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  error: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default LoginScreen;
