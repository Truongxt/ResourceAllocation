import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';
import i18n from '../src/i18n';
import { ProjectsOverview, TasksOverview, ResourcesOverview, OptimizationOverview } from '../src/components/common/OverviewPanel';

beforeEach(async () => { await i18n.changeLanguage('vi'); });

describe('Overview panels', () => {
  it('counts all task states including unknown values and updates with the filtered dataset', () => {
    const { rerender } = renderWithProviders(<TasksOverview tasks={[
      { status: 'done', priority: 'high' }, { status: 'review', priority: 'high' },
      { status: 'blocked', priority: 'low' }, { status: 'legacy', priority: 'low' },
    ]} />);
    const chart = screen.getByRole('heading', { name: 'Phân bố trạng thái công việc' }).closest('article');
    expect(within(chart).getAllByText('25%')).toHaveLength(4);
    expect(within(chart).getByText('Chưa xác định')).toBeInTheDocument();
    rerender(<TasksOverview tasks={[{ status: 'done', priority: 'high' }]} />);
    expect(screen.queryByText('25%')).not.toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('keeps workload threshold boundaries distinct and counts skills rather than people', () => {
    renderWithProviders(<ResourcesOverview resources={[0, 59, 60, 85, 86, 100, 101].map((utilizationRate, index) => ({
      _id: String(index), utilizationRate,
      skills: index === 0 ? [{ evaluationStatus: 'self_assessed' }, { evaluationStatus: 'self_assessed' }, { evaluationStatus: 'approved' }] : [],
    }))} />);
    const load = screen.getByRole('heading', { name: 'Phân bố nhân sự theo tải' }).closest('article');
    expect(within(load).getAllByText('29%')).toHaveLength(3);
    expect(within(load).getByText('14%')).toBeInTheDocument();
    const skills = screen.getByRole('heading', { name: 'Trạng thái đánh giá kỹ năng' }).closest('article');
    expect(within(skills).getByText('67%')).toBeInTheDocument();
    expect(within(skills).getByText('33%')).toBeInTheDocument();
  });

  it('shows partial coverage and opens the selected unfinished project', async () => {
    const open = vi.fn();
    renderWithProviders(<ProjectsOverview total={40} onProject={open} projects={[
      { _id: 'p1', name: 'Dự án A', status: 'in_progress', progress: 30 },
      { _id: 'p2', name: 'Dự án B', status: 'completed', progress: 100 },
    ]} />);
    expect(screen.getByText(/Tổng hợp 2\/40/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dự án B' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dự án A' }));
    expect(open).toHaveBeenCalledWith('p1');
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(screen.queryByText('30%')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mở tổng quan' }));
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('distinguishes loading, empty and failed data without displaying stale values', () => {
    const { rerender } = renderWithProviders(<TasksOverview loading tasks={[{ status: 'done' }]} />);
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    rerender(<TasksOverview error tasks={[{ status: 'done' }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa tải được dữ liệu tổng quan');
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    rerender(<TasksOverview tasks={[]} />);
    expect(screen.getAllByText('Chưa có dữ liệu trong phạm vi này')).toHaveLength(2);
  });

  it('uses the optimization input scope without comparing total hours to weekly capacity', () => {
    renderWithProviders(<OptimizationOverview projectName="Dự án A" readiness={{
      totalTasks: 10, unassignedTasks: 3, totalResources: 4, totalEstimatedHours: 200, skillsCount: 5,
    }} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('200 h')).toBeInTheDocument();
    expect(screen.getByText(/Dữ liệu đầu vào của phạm vi: Dự án A/)).toBeInTheDocument();
  });
});
