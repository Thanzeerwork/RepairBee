/**
 * RepairBee Google Authentication via Expo AuthSession
 * Provides hook and utilities for Google OAuth 2.0 Sign-In
 */
import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthStore } from '../stores/authStore';

// Complete auth session if redirected back via web or deep link
WebBrowser.maybeCompleteAuthSession();

// Read Client IDs from Expo public environment
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// Fallback client ID so expo-auth-session hook initializes cleanly without throwing
const FALLBACK_CLIENT_ID = 'repairbee-app.apps.googleusercontent.com';

export const isGoogleAuthConfigured = Boolean(
  WEB_CLIENT_ID || ANDROID_CLIENT_ID || IOS_CLIENT_ID
);

export function useGoogleAuth() {
  const { googleAuth, isLoading: storeLoading } = useAuthStore();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Configure Google Auth Request with Expo AuthSession
  const activeClientId = Platform.select({
    android: ANDROID_CLIENT_ID || WEB_CLIENT_ID || FALLBACK_CLIENT_ID,
    ios: IOS_CLIENT_ID || WEB_CLIENT_ID || FALLBACK_CLIENT_ID,
    default: WEB_CLIENT_ID || FALLBACK_CLIENT_ID,
  });

  const redirectUri = makeRedirectUri({
    scheme: 'repairbee',
    preferLocalhost: true,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    webClientId: WEB_CLIENT_ID || (Platform.OS === 'web' ? FALLBACK_CLIENT_ID : undefined),
    androidClientId: ANDROID_CLIENT_ID || undefined,
    iosClientId: IOS_CLIENT_ID || undefined,
    redirectUri,
    selectAccount: true,
  });

  // Handle incoming OAuth response from Expo AuthSession
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { id_token, access_token } = response.params || {};
      const idToken = id_token || response.authentication?.idToken;
      const accessToken = access_token || response.authentication?.accessToken;

      if (idToken || accessToken) {
        setGoogleLoading(true);
        setGoogleError(null);
        googleAuth({ idToken, accessToken })
          .catch((err: any) => {
            const message = err.message || 'Google sign-in failed.';
            setGoogleError(message);
          })
          .finally(() => {
            setGoogleLoading(false);
          });
      } else {
        setGoogleError('No authentication token received from Google.');
      }
    } else if (response.type === 'error') {
      setGoogleError(response.error?.message || 'Google authentication encountered an error.');
      setGoogleLoading(false);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  /**
   * Initiate Google Sign-In
   */
  const signInWithGoogle = async (onSuccess?: () => void) => {
    setGoogleError(null);

    // If real Google Client IDs are configured, trigger Expo AuthSession
    if (isGoogleAuthConfigured && request) {
      setGoogleLoading(true);
      try {
        const result = await promptAsync();
        if (result.type === 'success' && onSuccess) {
          // onSuccess will be triggered once response useEffect completes
        } else if (result.type !== 'success') {
          setGoogleLoading(false);
        }
      } catch (err: any) {
        setGoogleLoading(false);
        setGoogleError(err.message || 'Failed to open Google Sign-In.');
      }
      return;
    }

    // If client ID is not configured yet, offer Demo Google Sign-In or setup guidance
    Alert.alert(
      'Google Sign-In',
      'Expo AuthSession is ready. No Google Client ID configured in repairbee-app/.env yet.\n\nChoose an action below:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Demo Google Login',
          onPress: async () => {
            setGoogleLoading(true);
            try {
              await googleAuth({
                idToken: 'demo-google-id-token',
                accessToken: 'demo-google-access-token',
              });
              if (onSuccess) onSuccess();
            } catch (demoErr: any) {
              setGoogleError(demoErr.message || 'Demo Google sign-in failed.');
            } finally {
              setGoogleLoading(false);
            }
          },
        },
        {
          text: 'Try AuthSession Anyway',
          onPress: async () => {
            if (request) {
              setGoogleLoading(true);
              try {
                await promptAsync();
              } catch (e: any) {
                setGoogleError(e.message);
                setGoogleLoading(false);
              }
            }
          },
        },
      ]
    );
  };

  return {
    signInWithGoogle,
    isLoading: googleLoading || storeLoading,
    error: googleError,
    clearError: () => setGoogleError(null),
    isConfigured: isGoogleAuthConfigured,
    request,
    response,
  };
}
