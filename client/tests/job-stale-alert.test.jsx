/**
 * Cảnh báo job định kỳ quá hạn trên Dashboard.
 *
 * Job do cron bên ngoài gọi, nên quên cấu hình cron thì không có lỗi nào nổ ra: việc lặp
 * lại cứ thế không sinh, ảnh chụp workload cứ thế trống. Cảnh báo này là chỗ Owner/Admin
 * thấy được điều đó mà không phải tự gọi `GET /api/jobs/status`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const state = vi.hoisted(() => ({ auth: null, getStatus: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('../src/services/jobService', () => ({ default: { getStatus: state.getStatus } }));
const { default: JobStaleAlert } = await import('../src/components/common/JobStaleAlert');

const job = (extra) => ({
  name: 'recurring-tasks',
  description: 'Sinh công việc từ các cấu hình lặp lại đã đến hạn',
  staleAfterHours: 3,
  lastRunAt: null,
  lastStatus: null,
  lastError: '',
  lastSuccessAt: null,
  stale: false,
  ...extra,
});
const respond = (jobs) => state.getStatus.mockResolvedValue({ data: { data: { jobs } } });

beforeEach(async () => {
  state.auth = authState();
  state.getStatus.mockReset();
  await i18n.changeLanguage('vi');
});

describe('Cảnh báo job định kỳ', () => {
  it('job chưa từng chạy: nêu tên job và gợi ý cấu hình cron', async () => {
    respond([job({ stale: true }), job({ name: 'workload-snapshot', stale: false })]);
    renderWithProviders(<JobStaleAlert />);
    const alert = await screen.findByRole('alert');
    // Job còn chạy đúng hạn thì không bị kể vào.
    const lines = within(alert).getAllByRole('listitem');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent('Sinh việc lặp lại: chưa từng chạy');
    expect(alert).toHaveTextContent('cron');
  });

  it('lần gần nhất thất bại: hiện nguyên văn lỗi', async () => {
    respond([job({
      stale: true,
      lastSuccessAt: '2026-10-01T00:00:00.000Z',
      lastStatus: 'failed',
      lastError: 'MongoNetworkError: timeout',
    })]);
    renderWithProviders(<JobStaleAlert />);
    const alert = await screen.findByRole('alert');
    // Kiểm theo dòng của job: câu gợi ý chung bên dưới cũng có cụm "chưa từng chạy".
    const [line] = within(alert).getAllByRole('listitem');
    expect(line).toHaveTextContent('MongoNetworkError: timeout');
    expect(line).not.toHaveTextContent('chưa từng chạy');
  });

  it('mọi job đúng hạn: không hiện gì', async () => {
    respond([job({ stale: false, lastSuccessAt: new Date().toISOString() })]);
    renderWithProviders(<JobStaleAlert />);
    await waitFor(() => expect(state.getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('thành viên thường: không gọi API (server trả 403)', async () => {
    state.auth = authState({ role: 'member' });
    renderWithProviders(<JobStaleAlert />);
    await new Promise((r) => setTimeout(r, 50));
    expect(state.getStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Owner không phải admin vẫn thấy', async () => {
    state.auth = authState({ role: 'member' });
    state.auth.user.isOwner = true;
    respond([job({ stale: true })]);
    renderWithProviders(<JobStaleAlert />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sinh việc lặp lại');
  });

  it('không tải được trạng thái: im lặng, không chặn Dashboard', async () => {
    state.getStatus.mockRejectedValue(new Error('offline'));
    renderWithProviders(<JobStaleAlert />);
    await waitFor(() => expect(state.getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
