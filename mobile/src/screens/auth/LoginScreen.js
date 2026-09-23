import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  checkServerHealth,
  getDetectedHostIp,
  DEFAULT_API_URL,
} from '../../api/client';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cấu hình máy chủ API
  const [currentServerUrl, setCurrentServerUrl] = useState(getApiBaseUrl());
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [inputServerUrl, setInputServerUrl] = useState(getApiBaseUrl());
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'failed'
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setCurrentServerUrl(getApiBaseUrl());
    setInputServerUrl(getApiBaseUrl());
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        Alert.alert('Đăng nhập thất bại', res.message);
      }
    } catch (err) {
      const targetUrl = getApiBaseUrl();
      Alert.alert(
        'Không thể kết nối máy chủ',
        `${err.response?.data?.message || 'Không thể kết nối tới server'}\n\nĐang kết nối tới:\n${targetUrl}\n\nVui lòng đảm bảo điện thoại và máy tính kết nối cùng mạng Wi-Fi.`,
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Cấu hình Server', onPress: () => openServerModal() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const openServerModal = () => {
    setInputServerUrl(getApiBaseUrl());
    setTestStatus(null);
    setTestMessage('');
    setServerModalVisible(true);
  };

  const handleTestConnection = async (urlToTest) => {
    const target = urlToTest || inputServerUrl;
    if (!target.trim()) return;
    setTestStatus('testing');
    setTestMessage('Đang kiểm tra kết nối tới server...');
    const startTime = Date.now();
    const result = await checkServerHealth(target.trim());
    const duration = Date.now() - startTime;
    if (result.ok) {
      setTestStatus('success');
      setTestMessage(`✅ Kết nối thành công (${duration}ms)! API hoạt động tốt.`);
    } else {
      setTestStatus('failed');
      setTestMessage(`❌ Thất bại: ${result.error}.\nHãy kiểm tra xem điện thoại và máy tính có cùng kết nối chung một mạng Wi-Fi hay không.`);
    }
  };

  const handleSaveServer = async () => {
    if (!inputServerUrl.trim()) {
      Alert.alert('Lỗi', 'URL máy chủ không được để trống');
      return;
    }
    let url = inputServerUrl.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    await setApiBaseUrl(url);
    setCurrentServerUrl(url);
    setServerModalVisible(false);
    Alert.alert('Thành công', `Đã lưu máy chủ mới:\n${url}`);
  };

  const handleQuickSetIp = (ipOrUrl) => {
    setInputServerUrl(ipOrUrl);
    handleTestConnection(ipOrUrl);
  };

  const handleFillDemo = () => {
    setEmail('truongprolavua2004@gmail.com');
    setPassword('123123');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoIcon, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="flash" size={28} color="#ffffff" />
          </View>
          <View style={styles.titleRow}>
            <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
              RAO Studio
            </Text>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          </View>
          <Text style={[styles.brandSubtitle, { color: theme.colors.textSecondary }]}>
            Resource Allocation & Optimization Platform
          </Text>
        </View>

        {/* Login Card */}
        <Card style={styles.card}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>
            Đăng nhập hệ thống
          </Text>
          <Text style={[styles.formSub, { color: theme.colors.textSecondary }]}>
            Nhập email và mật khẩu của bạn để tiếp tục
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="tenban@congty.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Mật khẩu
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginBtn}
          />

          {/* Demo 1-Click Button */}
          <Button
            title="⚡ Điền tài khoản thử nghiệm"
            onPress={handleFillDemo}
            variant="secondary"
            size="md"
            style={styles.demoBtn}
          />

          {/* Server Config Trigger */}
          <TouchableOpacity
            onPress={openServerModal}
            style={[
              styles.serverPill,
              {
                backgroundColor: theme.colors.inputBg,
                borderColor: theme.colors.inputBorder,
              },
            ]}
          >
            <View style={styles.serverPillLeft}>
              <View style={styles.onlineDot} />
              <Text
                style={[styles.serverPillText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                Máy chủ: {currentServerUrl}
              </Text>
            </View>
            <Ionicons name="settings-outline" size={14} color={theme.colors.primaryLight} />
          </TouchableOpacity>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Chưa có tài khoản?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.footerLink, { color: theme.colors.primaryLight }]}>
              Đăng ký ngay
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="server" size={20} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Cấu hình Máy chủ API
                </Text>
              </View>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Để điện thoại kết nối được với server chạy trên máy tính, cả hai thiết bị cần chung mạng Wi-Fi và trỏ đúng IP của máy tính.
            </Text>

            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 12 }]}>
              Địa chỉ API (URL)
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.inputBorder,
                  marginBottom: 10,
                },
              ]}
            >
              <Ionicons
                name="link-outline"
                size={18}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="http://172.27.37.181:5000/api"
                placeholderTextColor={theme.colors.textMuted}
                value={inputServerUrl}
                onChangeText={setInputServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Quick Suggestions */}
            <Text style={[styles.label, { color: theme.colors.textSecondary, fontSize: 11, marginBottom: 6 }]}>
              Gợi ý cấu hình nhanh:
            </Text>
            <View style={styles.quickTagsRow}>
              <TouchableOpacity
                style={[styles.quickTag, { borderColor: theme.colors.border }]}
                onPress={() => handleQuickSetIp('http://172.27.37.181:5000/api')}
              >
                <Text style={[styles.quickTagText, { color: theme.colors.primaryLight }]}>
                  💻 Wi-Fi PC (172.27.37.181)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickTag, { borderColor: theme.colors.border }]}
                onPress={() => handleQuickSetIp('http://10.0.2.2:5000/api')}
              >
                <Text style={[styles.quickTagText, { color: theme.colors.textSecondary }]}>
                  📱 Giả lập (10.0.2.2)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Live test status */}
            {testStatus && (
              <View
                style={[
                  styles.testStatusBox,
                  {
                    backgroundColor:
                      testStatus === 'success'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : testStatus === 'testing'
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    borderColor:
                      testStatus === 'success'
                        ? '#10b981'
                        : testStatus === 'testing'
                        ? '#6366f1'
                        : '#ef4444',
                  },
                ]}
              >
                {testStatus === 'testing' && (
                  <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 8 }} />
                )}
                <Text
                  style={[
                    styles.testStatusText,
                    {
                      color:
                        testStatus === 'success'
                          ? '#10b981'
                          : testStatus === 'testing'
                          ? '#6366f1'
                          : '#ef4444',
                    },
                  ]}
                >
                  {testMessage}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.testBtn, { borderColor: theme.colors.border }]}
                onPress={() => handleTestConnection()}
              >
                <Ionicons name="pulse-outline" size={16} color={theme.colors.text} />
                <Text style={[styles.testBtnText, { color: theme.colors.text }]}>
                  Kiểm tra kết nối
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveServer}
              >
                <Ionicons name="checkmark" size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>Lưu & Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  proBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 12,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  demoBtn: {
    marginBottom: 12,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  serverPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  serverPillText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  quickTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  quickTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  testStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  testStatusText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 8,
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
