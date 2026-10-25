import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, authState } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ performance: vi.fn(), role: 'admin' }));
vi.mock('../src/context/AuthContext', async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => authState({ role: mocks.role }),
}));
vi.mock('../src/services/analyticsService', () => ({ default: { getPerformance: mocks.performance } }));
const { default: PerformanceReport } = await import('../src/components/reports/PerformanceReport');

const counts = (extra = {}) => ({
  total: 0, done: 0, onTime: 0, late: 0, doneNoTimestamp: 0, failed: 0,
  pendingReview: 0, overdue: 0, open: 0, extensions: 0, onTimeRate: null, ...extra,
});

beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.role = 'admin';
  mocks.performance.mockReset();
  mocks.performance.mockResolvedValue({ data: { data: {
    scope: 'all',
    people: [
      { user: { _id: 'a', name: 'Người đúng hạn' }, department: 'Kỹ thuật', ...counts({ total: 2, done: 2, onTime: 2, onTimeRate: 100 }) },
      { user: { _id: 'b', name: 'Người chưa đo được' }, ...counts({ total: 1, done: 1, doneNoTimestamp: 1 }) },
    ],
    totals: counts({ total: 3, done: 3, onTime: 2, doneNoTimestamp: 1, onTimeRate: 100 }),
    excluded: { noDeadline: 4 },
  } } });
});

describe('Performance report', () => {
  it('admin opens on the whole company and sees each person with their on-time rate', async () => {
    renderWithProviders(<PerformanceReport />);
    expect(await screen.findByText('Người đúng hạn')).toBeInTheDocument();
    expect(mocks.performance).toHaveBeenCalledWith(expect.objectContaining({ scope: 'all' }));
    const row = screen.getByText('Người chưa đo được').closest('tr');
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/1 việc đã xong nhưng không có mốc hoàn thành/)).toBeInTheDocument();
    expect(screen.getByText(/4 việc đang mở không có deadline/)).toBeInTheDocument();
  });

  it('member has no whole-company option and asks for their own results', async () => {
    mocks.role = 'member';
    renderWithProviders(<PerformanceReport />);
    await waitFor(() => expect(mocks.performance).toHaveBeenCalledWith(expect.objectContaining({ scope: 'me' })));
    expect(screen.queryByText('Toàn công ty')).not.toBeInTheDocument();
  });

  it('switching scope reloads with the new scope', async () => {
    renderWithProviders(<PerformanceReport />);
    await screen.findByText('Người đúng hạn');
    await userEvent.click(screen.getByText('Cấp dưới trực tiếp'));
    await waitFor(() => expect(mocks.performance).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'subordinates' })));
  });
});
