import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function SettingsScreen() {
  const { user, logout, changePassword } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setChangingPass(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        Alert.alert('Thành công', 'Đổi mật khẩu thành công');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Thất bại', res.message);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Tài khoản & Cài đặt" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {user?.name || 'Thành viên'}
                </Text>
                <View style={styles.onlineDot} />
              </View>
              <Text
                style={[styles.userEmail, { color: theme.colors.textSecondary }]}
              >
                {user?.email || '—'}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={user?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Thành viên (Member)'}
                  color={theme.colors.primaryLight}
                  size="sm"
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Appearance Settings */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Giao diện ứng dụng
        </Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={theme.colors.primary}
              />
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Chế độ tối (Dark Mode)
                </Text>
                <Text
                  style={[
                    styles.settingSub,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {isDark ? 'Giao diện Obsidian Dark' : 'Giao diện Clean Slate Light'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        {/* Change Password Card */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Bảo mật & Đổi mật khẩu
        </Text>
        <Card style={styles.securityCard}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Mật khẩu hiện tại
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.text,
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Mật khẩu mới
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor={theme.colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Xác nhận mật khẩu mới
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={theme.colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <Button
            title="Đổi mật khẩu"
            onPress={handleChangePassword}
            loading={changingPass}
            variant="primary"
            size="md"
            style={styles.changePassBtn}
          />
        </Card>

        {/* Logout Button */}
        <Button
          title="Đăng xuất tài khoản"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 16,
    marginBottom: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  settingCard: {
    padding: 14,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    gap: 2,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
  },
  securityCard: {
    padding: 16,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  changePassBtn: {
    marginTop: 6,
  },
  logoutBtn: {
    marginTop: 4,
  },
});
