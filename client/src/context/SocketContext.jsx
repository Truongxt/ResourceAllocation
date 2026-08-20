import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user, getToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);

  // Load initial notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getNotifications({ limit: 20 });
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }, [user]);

  // Establish socket connection when user is authenticated
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // `auth` là hàm chứ không phải object: Socket.IO gọi lại nó ở **mỗi lần thử
    // kết nối**, nên khi access token đã xoay sang cái mới thì lần kết nối lại
    // dùng token mới. Truyền object thì giá trị bị chốt tại thời điểm tạo socket
    // và mọi lần reconnect sau 15 phút đều trình ra token đã hết hạn.
    const newSocket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('⚡ Connected to Real-time Socket Server');
    });

    // Real-time new notification listener
    newSocket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show floating toast alert
      setToastNotification(notification);
      setTimeout(() => {
        setToastNotification((curr) => (curr?._id === notification._id ? null : curr));
      }, 6000);
    });

    // Real-time mark-as-read sync
    newSocket.on('notification:read', ({ id }) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    // Real-time mark-all-read sync
    newSocket.on('notification:read-all', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // Cố ý KHÔNG phụ thuộc vào token: nó xoay 15 phút một lần, mà dựng lại socket
    // mỗi lần xoay thì mất kết nối realtime định kỳ không vì lý do gì. Token mới
    // được đọc qua `getToken()` ngay tại lúc kết nối lại.
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        toastNotification,
        dismissToast: () => setToastNotification(null),
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
