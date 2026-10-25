import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers';
import OptimizationProposalPreview from '../src/components/optimization/OptimizationProposalPreview';
import service from '../src/services/optimizationService';
vi.mock('../src/services/optimizationService', () => ({ default: { getPreview: vi.fn() } }));
const load = (hours) => ({ workload: hours, capacity: 40, utilizationRate: Math.round(hours / 40 * 100), unscheduledWorkload: 0 });
const fixture = {
  previewToken: 'fresh-token', canApply: true, changedCount: 1, unchangedCount: 0, blockedCount: 0,
  assignments: [{ key: 'task', title: 'Build app', currentName: 'Lan', proposedName: 'Nem', change: 'reassigned', estimatedHours: 8, skillMatch: 75 }],
  workloads: [{ resourceId: 'nem', name: 'Nem', periods: [
    { from: '2026-10-12', to: '2026-10-18', before: load(0), after: load(2.29) },
    { from: '2026-10-19', to: '2026-10-25', before: load(0), after: load(5.71) },
  ] }],
};
beforeEach(() => { vi.clearAllMocks(); service.getPreview.mockResolvedValue({ data: { data: fixture } }); });
describe('Optimization review', () => {
  it('shows current/proposed assignments, switches weeks and applies only after confirmation with the reviewed token', async () => {
    const onApply = vi.fn().mockResolvedValue(true);
    renderWithProviders(<OptimizationProposalPreview resultId="plan" onApply={onApply} />);
    expect(await screen.findByText('2.29h / 40h')).toBeInTheDocument();
    expect(screen.getByText('Lan')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Tuần tới'));
    expect(screen.getByText('5.71h / 40h')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng 1 thay đổi' }));
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận áp dụng' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('plan', 'fresh-token'));
  });
  it('does not offer apply after a load failure and supports retry', async () => {
    service.getPreview.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<OptimizationProposalPreview resultId="plan" onApply={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('button', { name: 'Áp dụng 1 thay đổi' })).toBeEnabled();
  });
  it('disables invalid proposals and explains the affected task', async () => {
    service.getPreview.mockResolvedValue({ data: { data: { ...fixture, canApply: false, blockedCount: 1,
      assignments: [{ ...fixture.assignments[0], issue: 'task_closed', change: 'invalid' }] } } });
    renderWithProviders(<OptimizationProposalPreview resultId="plan" onApply={vi.fn()} />);
    expect(await screen.findByText('Công việc đã kết thúc hoặc không còn hoạt động')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Áp dụng 1 thay đổi' })).toBeDisabled();
  });
  it('refreshes after rejected application instead of reusing a stale preview', async () => {
    const onApply = vi.fn().mockResolvedValue(false);
    renderWithProviders(<OptimizationProposalPreview resultId="plan" onApply={onApply} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Áp dụng 1 thay đổi' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận áp dụng' }));
    await waitFor(() => expect(service.getPreview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Chưa áp dụng thành công/)).toBeInTheDocument();
  });
});
