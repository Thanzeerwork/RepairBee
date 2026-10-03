/**
 * Notification Center Screen — In-app notifications & alerts
 * Matches PRD Section 4.14
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  Shield,
  MessageCircle,
  Tag,
  Check,
} from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../src/theme/tokens';
import { api } from '../src/api/client';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  timestamp: string;
  isRead: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const list = Array.isArray(res.data?.data)
        ? res.data?.data
        : res.data?.data?.notifications || [];
      const mapped: NotificationItem[] = list.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.body || n.message,
        type: n.type || 'order',
        orderId: n.reference_id || n.order_id || n.orderId,
        timestamp: formatTimestamp(n.created_at),
        isRead: n.is_read !== undefined ? !!n.is_read : (n.isRead !== undefined ? !!n.isRead : false),
      }));
      setNotifications(mapped);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read in backend
    try {
      await api.markNotificationRead(item.id);
    } catch {}

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.type === 'quote' && item.orderId) {
      router.push(`/quote/${item.orderId}`);
    } else if (item.orderId) {
      router.push(`/order/${item.orderId}`);
    } else if (item.type === 'reward') {
      router.push('/(tabs)/rewards');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'quote':
        return <Clock size={20} color={Colors.primary} />;
      case 'order':
        return <Package size={20} color={Colors.info} />;
      case 'reward':
        return <Sparkles size={20} color="#d97706" />;
      case 'chat':
        return <MessageCircle size={20} color={Colors.success} />;
      default:
        return <Bell size={20} color={Colors.primary} />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerTintColor: Colors.primary,
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontFamily: Fonts.headingSemiBold, fontSize: 17 },
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllRead} style={styles.markReadButton}>
                <Text style={styles.markReadText}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Bell size={48} color={Colors.primary} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>You don't have any unread status alerts right now.</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
                style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
              >
                <View style={styles.iconContainer}>
                  {getIcon(item.type)}
                </View>

                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
                      {item.title}
                    </Text>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  markReadButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  markReadText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.caption,
    color: Colors.primary,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  notificationCardUnread: {
    backgroundColor: '#fffdf5',
    borderColor: Colors.primaryLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    flex: 1,
  },
  titleUnread: {
    fontFamily: Fonts.headingBold,
    color: Colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 6,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: FontSizes.titleSm,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
