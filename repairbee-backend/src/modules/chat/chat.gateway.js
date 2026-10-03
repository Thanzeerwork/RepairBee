const { Server } = require('socket.io');
const { resolveUserFromToken } = require('../../middleware/auth');
const chatService = require('./chat.service');
const logger = require('../../utils/logger');

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Authentication middleware supporting both RepairBee native JWT & Supabase JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = await resolveUserFromToken(token);
      if (!user) {
        return next(new Error('Invalid or expired token'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.name;
      socket.userProfilePic = user.profile_pic_url;
      next();
    } catch (err) {
      logger.warn('Socket authentication error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.userName} (${socket.userId}, role: ${socket.userRole})`);

    // Join a chat room: orderId can be an order UUID, or 'general' / 'support'
    socket.on('join_room', ({ orderId, chatType = 'customer_shop' }) => {
      const room = `${orderId}_${chatType}`;
      socket.join(room);
      logger.debug(`User ${socket.userName} (${socket.userId}) joined room ${room}`);
      socket.emit('joined_room', { room, orderId, chatType });
    });

    // Send message
    socket.on('send_message', async ({ orderId, chatType = 'customer_shop', message, mediaUrl }) => {
      try {
        if (!message && !mediaUrl) {
          return socket.emit('error', { message: 'Cannot send empty message' });
        }

        const savedMessage = await chatService.sendMessage(
          orderId,
          chatType,
          socket.userId,
          socket.userRole,
          message || '',
          mediaUrl || null
        );

        const room = `${orderId}_${chatType}`;
        io.to(room).emit('new_message', savedMessage);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
        logger.error('Chat send error', { error: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', ({ orderId, chatType = 'customer_shop', isTyping = true }) => {
      const room = `${orderId}_${chatType}`;
      socket.to(room).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping,
      });
    });

    // Mark messages as read
    socket.on('mark_read', async ({ orderId, chatType = 'customer_shop' }) => {
      try {
        await chatService.markAsRead(orderId, chatType, socket.userId);
        const room = `${orderId}_${chatType}`;
        socket.to(room).emit('messages_read', { userId: socket.userId });
      } catch (error) {
        logger.error('Mark read error', { error: error.message });
      }
    });

    // Leave room
    socket.on('leave_room', ({ orderId, chatType = 'customer_shop' }) => {
      const room = `${orderId}_${chatType}`;
      socket.leave(room);
      logger.debug(`User ${socket.userId} left room ${room}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.userId}`);
    });
  });

  logger.info('🔌 Socket.io initialized with Supabase/JWT authentication & live chat rooms');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };
