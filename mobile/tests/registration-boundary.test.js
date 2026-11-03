import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithTheme } from './helpers';

const mockRegister = jest.fn();
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

import RegisterScreen from '../src/screens/auth/RegisterScreen';

beforeEach(() => {
  mockRegister.mockReset().mockResolvedValue({ success: true });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openForm = () => {
  renderWithTheme(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
  fireEvent.changeText(screen.getByPlaceholderText('Nguyễn Văn A'), '  Nguyễn Văn A  ');
  fireEvent.changeText(screen.getByPlaceholderText('vana@congty.com'), '  vana@example.test  ');
  fireEvent.changeText(screen.getByPlaceholderText('Tối thiểu 6 ký tự'), 'password123');
  fireEvent.changeText(screen.getByPlaceholderText('Nhập lại mật khẩu'), 'password123');
};

test('registration labels company as required and explains new company versus joining', () => {
  openForm();
  expect(screen.getByLabelText('Tên công ty mới (bắt buộc)').props.value).toBe('');
  expect(screen.getByText(
    'Đăng ký để tạo công ty mới. Để tham gia công ty đã có, vui lòng liên hệ quản trị viên của công ty để được tạo tài khoản.'
  )).toBeTruthy();
});

test.each(['', '   '])('company name %j is rejected without submitting registration', (companyName) => {
  openForm();
  fireEvent.changeText(screen.getByLabelText('Tên công ty mới (bắt buộc)'), companyName);
  fireEvent.press(screen.getByText('Đăng ký tài khoản'));
  expect(Alert.alert).toHaveBeenCalledWith('Thông báo', 'Vui lòng nhập tên công ty mới');
  expect(mockRegister).not.toHaveBeenCalled();
});

test('registration submits trimmed companyName with credentials and no role selection', async () => {
  openForm();
  fireEvent.changeText(screen.getByLabelText('Tên công ty mới (bắt buộc)'), '  Công ty Mới  ');
  fireEvent.press(screen.getByText('Đăng ký tài khoản'));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith({
    name: 'Nguyễn Văn A',
    companyName: 'Công ty Mới',
    email: 'vana@example.test',
    password: 'password123',
  }));
  await screen.findByText('Đăng ký tài khoản');
  expect(mockRegister).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});
