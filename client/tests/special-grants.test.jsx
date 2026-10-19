import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

// Server chỉ cho Owner cấp quyền đặc biệt (403 với Admin thường). Nút ở tab App Admin
// phải nói điều đó ngay, thay vì để Admin bấm rồi nhận "Không thể cập nhật quyền".
const mocks = vi.hoisted(() => ({ isOwner: false, updateGrants: vi.fn() }));
vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => {
    const state = authState({ role: 'admin' });
    return { ...state, user: { ...state.user, isOwner: mocks.isOwner }, refreshUser: () => {} };
  },
}));
vi.mock('../src/services/authService', () => ({
  default: {
    getPermissionsMatrix: vi.fn().mockResolvedValue({ data: { matrix: [], catalog: [] } }),
    getUsers: vi.fn().mockResolvedValue({ data: { users: [
      { _id: 'u2', name: 'Trần Văn Nam', email: 'nam@rao.com', role: 'member', appAdmins: [], specialGrants: [] },
    ] } }),
    getGuests: vi.fn().mockResolvedValue({ data: { guests: [] } }),
    updateUserSpecialGrants: mocks.updateGrants,
  },
}));
vi.mock('../src/services/companySettingService', () => ({
  default: { getSettings: vi.fn().mockResolvedValue({ data: {} }), updateSettings: vi.fn() },
}));
const { default: AppPermissionsTab } = await import('../src/components/settings/AppPermissionsTab');

const openAppAdminTab = async () => {
  renderWithProviders(<AppPermissionsTab />);
  await userEvent.click(screen.getByText('Quản trị Ứng dụng (App Admin)'));
  return screen.findByRole('button', { name: /Cấp quyền đổi Email/ });
};

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.updateGrants.mockReset();
  mocks.updateGrants.mockResolvedValue({});
});

describe('Special grants button', () => {
  it('is disabled for an admin who is not the Owner', async () => {
    mocks.isOwner = false;
    const button = await openAppAdminTab();
    expect(button).toBeDisabled();
  });

  it('lets the Owner grant the email key', async () => {
    mocks.isOwner = true;
    const button = await openAppAdminTab();
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(mocks.updateGrants).toHaveBeenCalledWith('u2', ['can_change_email']);
  });
});
