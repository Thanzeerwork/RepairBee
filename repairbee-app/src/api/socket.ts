/**
 * RepairBee Socket.io Client Manager
 * Manages real-time bidirectional WebSocket connections for:
 * 1. Live Customer ↔ Workshop & Customer ↔ Runner Chat
 * 2. Real-time Live Runner GPS Location Telemetry
 */
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

// Dynamically resolve dev machine IP from Expo bundler hostUri (works for physical phones & emulators)
const hostUri = Constants.expoConfig?.hostUri;
const hostIp = hostUri ? hostUri.split(':')[0] : '172.19.38.32';

export const SOCKET_URL = __DEV__
  ? `http://${hostIp}:3000`
  : 'https://repairbee.onrender.com';

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

export async function getSocket(): Promise<Socket> {
  const token = (await storage.getItem('accessToken')) || '';

  if (socketInstance && socketInstance.connected && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = token;

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1500,
    timeout: 12000,
  });

  socketInstance.on('connect', () => {
    if (__DEV__) {
      console.log('⚡ [Socket.io] Connected to server:', SOCKET_URL);
    }
  });

  socketInstance.on('connect_error', (err) => {
    if (__DEV__) {
      console.warn('⚠️ [Socket.io] Connection error:', err.message);
    }
  });

  socketInstance.on('disconnect', (reason) => {
    if (__DEV__) {
      console.log('🔌 [Socket.io] Disconnected:', reason);
    }
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}
