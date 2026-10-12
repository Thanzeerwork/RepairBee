import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, Camera, Wifi, WifiOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocket } from '../../src/api/socket';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'customer' | 'shop' | 'runner' | 'system';
  message: string;
  messageType: 'text' | 'image' | 'system';
  timestamp: string;
}

export default function ChatScreen() {
  const { orderId, type } = useLocalSearchParams<{ orderId: string; type?: string }>();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('Workshop');
  const [isConnected, setIsConnected] = useState(false);
  const [typingPartner, setTypingPartner] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const isRunnerChat = type === 'runner' || type === 'customer_runner';
  const chatType = isRunnerChat ? 'customer_runner' : 'customer_shop';

  // 1. Load initial Order info & past messages from database
  useEffect(() => {
    if (!orderId) return;

    // Load order for workshop or runner name
    api.getOrderById(orderId)
      .then((res) => {
        const orderData = res.data?.data;
        if (orderData) {
          if (isRunnerChat && orderData.runner_name) {
            setShopName(orderData.runner_name);
          } else if (orderData.shop_name) {
            setShopName(orderData.shop_name);
          }
        }
      })
      .catch(() => {});

    // Load message history from REST API
    api.getChatMessages(orderId, chatType)
      .then((res) => {
        const raw = res.data?.data?.messages || res.data?.data || [];
        const mapped: ChatMessage[] = raw.map((m: any) => ({
          id: m.id || `msg_${Date.now()}_${Math.random()}`,
          senderId: m.sender_id,
          senderRole: m.sender_role || (m.sender_id === user?.id ? 'customer' : (isRunnerChat ? 'runner' : 'shop')),
          message: m.message,
          messageType: m.media_url ? 'image' : 'text',
          timestamp: m.sent_at || m.created_at || new Date().toISOString(),
        }));
        setMessages(mapped);
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, chatType, isRunnerChat]);

  // 2. Establish live Socket.io connection & bind real-time event listeners
  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;

    async function initSocketChat() {
      try {
        socket = await getSocket();
        socketRef.current = socket;

        if (socket.connected) {
          setIsConnected(true);
          socket.emit('join_room', { orderId, chatType });
        }

        socket.on('connect', () => {
          if (!isMounted) return;
          setIsConnected(true);
          socket?.emit('join_room', { orderId, chatType });
        });

        socket.on('disconnect', () => {
          if (!isMounted) return;
          setIsConnected(false);
        });

        // Handle incoming live message in real-time
        socket.on('new_message', (msg: any) => {
          if (!isMounted) return;
          const mapped: ChatMessage = {
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            senderId: msg.sender_id || msg.senderId,
            senderRole: msg.sender_role || msg.senderRole || (msg.sender_id === user?.id ? 'customer' : (isRunnerChat ? 'runner' : 'shop')),
            message: msg.message,
            messageType: msg.media_url ? 'image' : 'text',
            timestamp: msg.sent_at || msg.created_at || new Date().toISOString(),
          };

          setMessages((prev) => {
            // Prevent duplicate insertion if message was already added optimistically
            const exists = prev.some(
              (m) =>
                m.id === mapped.id ||
                (m.message === mapped.message &&
                  Math.abs(new Date(m.timestamp).getTime() - new Date(mapped.timestamp).getTime()) < 4000)
            );
            if (exists) return prev;
            return [...prev, mapped];
          });

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        });

        // Handle typing indicator from partner
        socket.on('user_typing', ({ userId, userName, isTyping }: any) => {
          if (!isMounted) return;
          if (userId !== user?.id) {
            setTypingPartner(isTyping ? userName || (isRunnerChat ? 'Courier Partner' : shopName) : null);
          }
        });
      } catch (err) {
        console.warn('Socket chat setup error:', err);
      }
    }

    initSocketChat();

    return () => {
      isMounted = false;
      if (socket) {
        socket.emit('leave_room', { orderId, chatType });
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [orderId, chatType, user?.id, shopName, isRunnerChat]);

  // Handle customer typing with automatic timeout
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('typing', { orderId, chatType, isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', { orderId, chatType, isTyping: false });
      }, 2000);
    }
  };

  // Send message via real-time WebSocket or REST fallback
  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('typing', { orderId, chatType, isTyping: false });
    }

    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: user?.id || 'customer-1',
      senderRole: 'customer',
      message: text,
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          orderId,
          chatType,
          message: text,
        });
      } else {
        await api.sendChatMessage(orderId!, chatType, text);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback to REST API
      try {
        await api.sendChatMessage(orderId!, chatType, text);
      } catch (err) {
        console.warn('Failed to send message via fallback:', err);
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.messageType === 'system') {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.message}</Text>
          <Text style={styles.systemMsgTime}>{formatTime(item.timestamp)}</Text>
        </View>
      );
    }

    const isMe = item.senderRole === 'customer' || item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>
              {item.senderRole === 'shop' ? '🔧' : '🚴'}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: shopName,
          headerShown: true,
          headerRight: () => (
            <View style={styles.headerStatusRow}>
              {isConnected ? (
                <View style={styles.connectedBadge}>
                  <View style={styles.connectedDot} />
                  <Text style={styles.connectedText}>Live</Text>
                </View>
              ) : (
                <View style={styles.connectingBadge}>
                  <ActivityIndicator size="small" color="#f59e0b" style={{ transform: [{ scale: 0.65 }] }} />
                  <Text style={styles.connectingText}>Syncing</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Order context bar */}
        <View style={styles.contextBar}>
          <View style={[styles.onlineDot, !isConnected && { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.contextText}>
            Order #{orderId ? orderId.slice(0, 8).toUpperCase() : 'RB'} •{' '}
            {isRunnerChat ? 'Delivery Partner Channel' : 'Certified Workshop Channel'}
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                <Text style={{ fontFamily: Fonts.headingSemiBold, fontSize: FontSizes.bodyMd, color: Colors.textPrimary }}>
                  Direct line with {shopName}
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                  Ask questions, request photos, or check repair status in real-time.
                </Text>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Typing indicator bubble */}
        {typingPartner && (
          <View style={styles.typingContainer}>
            <View style={styles.typingDot} />
            <Text style={styles.typingText}>{typingPartner} is typing...</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
            <Paperclip size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
            <Camera size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Send size={18} color={Colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerStatusRow: { marginRight: 8 },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  connectedText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: '#16a34a' },
  connectingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  connectingText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: '#d97706' },
  contextBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPadding, paddingVertical: 8,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  contextText: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.textMuted },
  messageList: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  systemMsg: { alignItems: 'center', marginVertical: Spacing.sm },
  systemMsgText: {
    fontFamily: Fonts.bodyMedium, fontSize: FontSizes.caption, color: Colors.textMuted,
    backgroundColor: Colors.surfaceDim, paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  systemMsgTime: { fontFamily: Fonts.body, fontSize: FontSizes.tiny, color: Colors.textMuted, marginTop: 2 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm, gap: Spacing.xs },
  msgRowMe: { justifyContent: 'flex-end' },
  senderAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center',
  },
  senderAvatarText: { fontSize: 14 },
  bubble: { maxWidth: '75%', paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.lg },
  bubbleThem: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    borderBottomLeftRadius: Radius.xs,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.xs },
  bubbleText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: Colors.textInverse },
  bubbleTime: { fontFamily: Fonts.body, fontSize: FontSizes.tiny, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceDim,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  typingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.sm,
  },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  chatInput: {
    flex: 1, fontFamily: Fonts.body, fontSize: FontSizes.bodyMd, color: Colors.textPrimary,
    backgroundColor: Colors.background, borderRadius: Radius.xl, paddingHorizontal: Spacing.md,
    paddingVertical: 10, maxHeight: 100, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.textMuted },
});
