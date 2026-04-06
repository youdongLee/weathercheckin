import { AppsInToss, appLogin } from '@apps-in-toss/framework';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InitialProps } from '@granite-js/react-native';
import { Button, TDSProvider, Txt } from '@toss/tds-react-native';
import { Component, PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { context } from '../require.context';
import { CheckinProvider } from '../stores/CheckinContext';

const LOGIN_KEY = 'toss_login_done';
const PRIMARY = '#3B82F6';

class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😔</Text>
          <Text style={styles.errorTitle}>일시적인 오류가 발생했어요</Text>
          <Text style={styles.errorSub}>잠시 후 다시 시도해주세요.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function LoginGate({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<'loading' | 'logged_in' | 'need_login'>('loading');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOGIN_KEY).then((v) => {
      setStatus(v === 'true' ? 'logged_in' : 'need_login');
    });
  }, []);

  const handleLogin = async () => {
    setLogging(true);
    try {
      await appLogin();
      await AsyncStorage.setItem(LOGIN_KEY, 'true');
      setStatus('logged_in');
    } catch {
      // 사용자가 로그인을 취소한 경우
    } finally {
      setLogging(false);
    }
  };

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  if (status === 'need_login') {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginEmoji}>🌤️</Text>
        <Txt typography="t1" color="#191F28" style={styles.loginTitle}>날씨체크인</Txt>
        <Txt typography="b1" color="#8B95A1" style={styles.loginDesc}>
          날씨를 확인하고 토스포인트를 받으려면{'\n'}토스 로그인이 필요해요
        </Txt>
        <View style={styles.loginButton}>
          <Button
            type="primary"
            size="large"
            onPress={handleLogin}
            disabled={logging}
          >
            {logging ? '로그인 중...' : '토스로 시작하기'}
          </Button>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return (
    <TDSProvider>
      <ErrorBoundary>
        <LoginGate>
          <CheckinProvider>
            {children}
          </CheckinProvider>
        </LoginGate>
      </ErrorBoundary>
    </TDSProvider>
  );
}

export default AppsInToss.registerApp(AppContainer, { context });

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191F28',
    marginBottom: 10,
  },
  errorSub: {
    fontSize: 14,
    color: '#8B95A1',
    textAlign: 'center',
    lineHeight: 22,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loginEmoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  loginTitle: {
    marginBottom: 12,
  },
  loginDesc: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  loginButton: {
    width: '100%',
    alignItems: 'center',
  },
});
