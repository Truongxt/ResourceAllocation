import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import notificationApi from '../../api/notificationApi';
import { formatTimeAgo } from '../../utils/formatters';

export default function NotificationsModal({ visible, onClose, onUnreadCountChange }) {
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getAll({ limit: 30 });
      const items = res.data?.data?.notifications || res.data?.data || [];
      setNotifications(items);
      const unreadCount = items.filter((n) => !n.read).length;
      if (onUnreadCountChange) onUnreadCountChange(unreadCount);
    } catch (e) {
      console.log('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      const nextUnread = notifications.filter((n) => n._id !== id && !n.read).length;
      if (onUnreadCountChange) onUnreadCountChange(nextUnread);
    } catch (e) {
      console.log('Error marking notification as read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (e) {
      console.log('Error marking all as read:', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderItem = ({ item }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleMarkAsRead(item._id)}
      >
        <Card
          style={[
            styles.itemCard,
            isUnread && {
              borderColor: 'rgba(99, 102, 241, 0.4)',
              backgroundColor: theme.isDark
                ? 'rgba(99, 102, 241, 0.08)'
                : 'rgba(99, 102, 241, 0.04)',
            },
          ]}
        >
          <View style={styles.itemRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isUnread
                    ? theme.colors.primary
                    : theme.isDark
                    ? 'rgba(255,255,255,0.06)'
                    : '#f1f5f9',
                },
              ]}
            >
              <Ionicons
                name="notifications"
                size={16}
                color={isUnread ? '#ffffff' : theme.colors.textMuted}
              />
            </View>

            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: theme.colors.text },
                    isUnread && { fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                >
                  {item.title || 'Thông báo mới'}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
              </View>

              <Text
                style={[styles.itemMessage, { color: theme.colors.textSecondary }]}
              >
                {item.message}
              </Text>

              <Text style={[styles.itemTime, { color: theme.colors.textMuted }]}>
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.sheetHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                Thông báo
              </Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  disabled={markingAll}
                  style={styles.markAllBtn}
                >
                  {markingAll ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.markAllText,
                        { color: theme.colors.primaryLight },
                      ]}
                    >
                      Đã đọc hết
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <EmptyState
                  icon="notifications-off-outline"
                  title="Không có thông báo"
                  description="Bạn đã cập nhật tất cả thông tin mới nhất."
                />
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '82%',
    minHeight: '50%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemCard: {
    marginBottom: 8,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  itemMessage: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 10,
  },
});
