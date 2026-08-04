import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineBriefcase } from 'react-icons/hi';
import './Settings.css';

export default function Settings() {
  const { user, updateProfile, changePassword } = useAuth();

  // Profile State
  const [profileData, setProfileData] = useState({
    name: '',
    department: '',
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        department: user.department || '',
      });
    }
  }, [user]);

  // --- Profile Handlers ---
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
    setProfileMsg({ type: '', text: '' });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    
    const result = await updateProfile(profileData);
    
    setProfileMsg({
      type: result.success ? 'success' : 'error',
      text: result.message || (result.success ? 'Cập nhật thông tin thành công' : 'Có lỗi xảy ra')
    });
    
    setIsUpdatingProfile(false);
  };

  // --- Password Handlers ---
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordMsg({ type: '', text: '' });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    setIsUpdatingPassword(true);
    
    const result = await changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
    
    setPasswordMsg({
      type: result.success ? 'success' : 'error',
      text: result.message || (result.success ? 'Đổi mật khẩu thành công' : 'Có lỗi xảy ra')
    });
    
    if (result.success) {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    
    setIsUpdatingPassword(false);
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Cài đặt tài khoản</h1>
        <p className="page-description">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
      </div>

      <div className="settings-grid">
        {/* Cập nhật thông tin */}
        <div className="card settings-card">
          <div className="card-header">
            <h3 className="card-title">Hồ sơ cá nhân</h3>
          </div>
          
          {profileMsg.text && (
            <div className={`alert alert-${profileMsg.type}`}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="input-group">
              <label className="input-label">Email (Không thể thay đổi)</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input input-disabled"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Vai trò</label>
              <input
                type="text"
                value={user?.role === 'admin' ? 'Quản trị viên' : (user?.role === 'project_manager' ? 'Project Manager' : 'Thành viên')}
                disabled
                className="input input-disabled"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Họ và tên</label>
              <div className="input-wrapper">
                <HiOutlineUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="input input-with-icon"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Bộ phận / Phòng ban</label>
              <div className="input-wrapper">
                <HiOutlineBriefcase className="input-icon" />
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleProfileChange}
                  className="input input-with-icon"
                  placeholder="VD: Engineering, Design, HR..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdatingProfile}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Đổi mật khẩu */}
        <div className="card settings-card">
          <div className="card-header">
            <h3 className="card-title">Đổi mật khẩu</h3>
          </div>

          {passwordMsg.text && (
            <div className={`alert alert-${passwordMsg.type}`}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <div className="input-group">
              <label className="input-label">Mật khẩu hiện tại</label>
              <div className="input-wrapper">
                <HiOutlineLockClosed className="input-icon" />
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input input-with-icon"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Mật khẩu mới</label>
              <div className="input-wrapper">
                <HiOutlineLockClosed className="input-icon" />
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input input-with-icon"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Xác nhận mật khẩu mới</label>
              <div className="input-wrapper">
                <HiOutlineLockClosed className="input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input input-with-icon"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isUpdatingPassword}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {isUpdatingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
