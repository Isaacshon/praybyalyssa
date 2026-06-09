import * as Linking from 'expo-linking';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { completeOAuthCallbackUrl } from '@/lib/praybor/auth';

const homeHref = '/' as Href;

export default function AuthCallbackRoute() {
  const linkingUrl = Linking.useLinkingURL();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const callbackUrl = React.useMemo(
    () => (linkingUrl?.includes('auth-callback') ? linkingUrl : createCallbackUrlFromParams(params)),
    [linkingUrl, params],
  );
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    async function completeCallback() {
      if (!callbackUrl) {
        router.replace(homeHref);
        return;
      }

      const completion = await completeOAuthCallbackUrl(callbackUrl);

      if (!isMounted) {
        return;
      }

      if (completion.status === 'error') {
        setErrorMessage(completion.message);
        return;
      }

      router.replace(homeHref);
    }

    void completeCallback();

    return () => {
      isMounted = false;
    };
  }, [callbackUrl]);

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Sign-in needs attention
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {errorMessage}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace(homeHref)} style={styles.button}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#FF6628" />
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        Completing sign-in...
      </Text>
    </View>
  );
}

function createCallbackUrlFromParams(params: Record<string, string | string[]>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const firstValue = Array.isArray(value) ? value[0] : value;

    if (typeof firstValue === 'string') {
      searchParams.set(key, firstValue);
    }
  }

  const query = searchParams.toString();

  return query ? `blessie://auth-callback?${query}` : null;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#FF6628',
    borderRadius: 18,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#2a1c13',
    fontFamily: 'Pretendard',
    fontSize: 15,
    fontWeight: '800',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#F8F1E8',
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 28,
  },
  message: {
    color: '#6D5B4B',
    fontFamily: 'Pretendard',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  title: {
    color: '#2a1c13',
    fontFamily: 'Pretendard',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
});
