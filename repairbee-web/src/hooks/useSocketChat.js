import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { chatApi, apiClient } from '../api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Custom hook for live two-way Socket.io chat with room partitioning, typing indicators,
 * and attachment uploading to R2/local storage.
 */
export function useSocketChat({ orderId, chatType = 'customer_shop', token, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingState, setTypingState] = useState(null); // { userId, userName }
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch initial message history via REST
  const fetchHistory = useCallback(async (targetOrderId) => {
    if (!targetOrderId) return;
    setLoadingHistory(true);
    try {
      const res = await chatApi.getHistory(targetOrderId, chatType);
      const data = res.data || res;
      const list = data.messages || [];
      setMessages(
        list.map((m) => ({
          id: m.id || `msg_${Date.now()}_${Math.random()}`,
          sender: m.sender_role === 'customer' ? 'customer' : (m.sender_role === 'delivery_partner' ? 'runner' : 'shop'),
          senderName: m.sender_name || (m.sender_role === 'customer' ? 'Customer' : 'Technician'),
          senderAvatar: m.sender_avatar || null,
          senderId: m.sender_id,
          text: m.message,
          mediaUrl: m.media_url,
          time: new Date(m.sent_at || m.created_at || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isRead: m.is_read,
        }))
      );
    } catch (err) {
      console.warn('Error loading initial chat history:', err?.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [chatType]);

  // 2. Establish Socket.io connection & bind events
  useEffect(() => {
    if (!token || !orderId) return;

    // Connect to Socket.io server
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join order-specific chat room
      socket.emit('join_room', { orderId, chatType });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      setIsConnected(false);
    });

    // Handle incoming live message
    socket.on('new_message', (msg) => {
      const formatted = {
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        sender: msg.sender_role === 'customer' ? 'customer' : (msg.sender_role === 'delivery_partner' ? 'runner' : 'shop'),
        senderName: msg.sender_name || (msg.sender_role === 'customer' ? 'Customer' : 'Technician'),
        senderAvatar: msg.sender_avatar || null,
        senderId: msg.sender_id,
        text: msg.message,
        mediaUrl: msg.media_url,
        time: new Date(msg.sent_at || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isRead: msg.is_read,
      };

      setMessages((prev) => {
        // Prevent duplicate messages if already optimistically added
        const exists = prev.some((m) => m.id === formatted.id || (m.text === formatted.text && Math.abs(new Date(m.time) - new Date(formatted.time)) < 2000));
        if (exists) {
          return prev.map((m) => (m.text === formatted.text && !m.id ? formatted : m));
        }
        return [...prev, formatted];
      });

      // Clear typing indicator when message arrives
      setTypingState(null);
    });

    // Handle typing notification from counterpart
    socket.on('user_typing', ({ userId, userName, isTyping }) => {
      if (userId === currentUser?.id) return;

      if (isTyping) {
        setTypingState({ userId, userName: userName || 'Bench Technician' });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingState(null);
        }, 3000);
      } else {
        setTypingState(null);
      }
    });

    // Load initial chat history
    fetchHistory(orderId);

    return () => {
      if (socket) {
        socket.emit('leave_room', { orderId, chatType });
        socket.disconnect();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [orderId, chatType, token, currentUser?.id, fetchHistory]);

  // 3. Send text message & optional media attachment
  const sendMessage = async (text, mediaUrl = null) => {
    if (!text?.trim() && !mediaUrl) return;

    const trimmed = text?.trim() || '';

    // Optimistic UI update
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      sender: currentUser?.role === 'customer' ? 'customer' : (currentUser?.role === 'delivery_partner' ? 'runner' : 'shop'),
      senderName: currentUser?.name || 'You',
      senderAvatar: currentUser?.profile_pic_url || null,
      senderId: currentUser?.id,
      text: trimmed,
      mediaUrl,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Send via live socket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        orderId,
        chatType,
        message: trimmed,
        mediaUrl,
      });
    } else {
      // Fallback to REST API if socket is briefly disconnected
      try {
        await chatApi.sendMessage(orderId, trimmed, chatType, mediaUrl);
      } catch (err) {
        console.error('REST chat send error:', err);
      }
    }
  };

  // 4. Broadcast typing state
  const sendTyping = (isTyping = true) => {
    if (socketRef.current?.connected && orderId) {
      socketRef.current.emit('typing', { orderId, chatType, isTyping });
    }
  };

  // 5. Upload image / attachment to R2 (with local fallback)
  const uploadAttachment = async (file) => {
    if (!file) return null;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `chat_${orderId}`);

      const res = await apiClient.post('/uploads/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data?.data || res.data || res;
      return data.url; // e.g. /api/v1/uploads/chat_uuid/...
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    } finally {
      setUploadingMedia(false);
    }
  };

  return {
    messages,
    isConnected,
    typingState,
    loadingHistory,
    uploadingMedia,
    sendMessage,
    sendTyping,
    uploadAttachment,
    refetchHistory: () => fetchHistory(orderId),
  };
}
