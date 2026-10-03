/**
 * Root Layout — App entry point with Expo Router
 * Loads fonts, handles splash screen, and wraps with providers
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '../src/stores/authStore';
import { Colors } from '../src/theme/tokens';

// Keep splash screen visible while loading assets
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      await loadSession();
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="order/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Order Details',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="shops"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="shop/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Shop Profile',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="chat/[orderId]"
          options={{
            headerShown: true,
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="quote/[orderId]"
          options={{
            headerShown: true,
            headerTitle: 'Quote Details',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="payment/[orderId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="booking"
          options={{
            headerShown: true,
            headerTitle: 'New Repair Request',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="rating/[orderId]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="diagnostics"
          options={{
            headerShown: true,
            headerTitle: 'Hardware Diagnostics',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="addresses"
          options={{
            headerShown: true,
            headerTitle: 'Saved Addresses',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="warranties"
          options={{
            headerShown: true,
            headerTitle: 'Repair Warranties',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="dispute/[orderId]"
          options={{
            headerShown: true,
            headerTitle: 'Raise a Dispute',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerTitle: 'Notifications',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="promos"
          options={{
            headerShown: true,
            headerTitle: 'Promo Codes & Offers',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="support"
          options={{
            headerShown: true,
            headerTitle: 'Help & 24/7 Support',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            headerTitle: 'Settings & Preferences',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="wallet"
          options={{
            headerShown: true,
            headerTitle: 'RepairBee Wallet',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="invoice/[orderId]"
          options={{
            headerShown: true,
            headerTitle: 'Tax Invoice',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            headerShown: true,
            headerTitle: 'Privacy Policy',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            headerShown: true,
            headerTitle: 'Terms of Service',
            headerTintColor: Colors.primary,
            headerStyle: { backgroundColor: Colors.surface },
            headerTitleStyle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 17 },
          }}
        />
        <Stack.Screen
          name="tracking/[orderId]"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}
