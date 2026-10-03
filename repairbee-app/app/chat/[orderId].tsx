import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, Camera, Image as ImageIcon } from 'lucide-react-native';
import { Colors, Fonts, FontSizes, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import { useAuthStore } from '../../src/stores/authStore';

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
  const flatListRef = useRef<FlatList>(null);
  const chatType = type || 'customer_shop';

  // Load live order info & chat messages from database
  useEffect(() => {
    if (!orderId) return;

    // Load order for workshop name
    api.getOrderById(orderId)
      .then((res) => {
        if (res.data?.data?.shop_name) {
          setShopName(res.data.data.shop_name);
        }
      })
      .catch(() => {});

    // Load chat history
    api.getChatMessages(orderId, chatType)
      .then((res) => {
        const raw = res.data?.data?.messages || res.data?.data || [];
        const mapped: ChatMessage[] = raw.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderRole: m.sender_role || (m.sender_id === user?.id ? 'customer' : 'shop'),
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
  }, [orderId, chatType]);

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const tempMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || 'customer-1',
      senderRole: 'customer',
      message: text,
      messageType: 'text',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await api.sendChatMessage(orderId!, chatType, text);
    } catch {
      // Message already in local UI
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
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Order context bar */}
        <View style={styles.contextBar}>
          <View style={styles.onlineDot} />
          <Text style={styles.contextText}>Order #{orderId?.slice(-6).toUpperCase()} • Verified Shop Channel</Text>
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
                  Ask questions, request photos, or check repair status directly.
                </Text>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton}>
            <Paperclip size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton}>
            <Camera size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Send size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
