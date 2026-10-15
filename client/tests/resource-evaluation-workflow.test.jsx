import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';
import SkillsMatrixModal from '../src/components/resources/SkillsMatrixModal';
import SelfSkillEvaluationModal from '../src/components/resources/SelfSkillEvaluationModal';
import WorkloadProductivityChart from '../src/components/resources/WorkloadProductivityChart';
import WorkloadPeriodControls, { weekRange } from '../src/components/resources/WorkloadPeriodControls';

describe('Evaluation and workload interactions', () => {
  it('requires feedback before returning pending skills and shows employee evidence', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SkillsMatrixModal open resource={{ user: { name: 'Lan' }, skills: [{ name: 'React', level: 2, selfLevel: 4, evaluationStatus: 'self_assessed', evidence: 'Delivered checkout module' }] }} onSubmit={onSubmit} t={key => key} />);
    expect(await screen.findByText(/Delivered checkout module/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yêu cầu bổ sung' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('Ghi rõ minh chứng hoặc thông tin cần bổ sung')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Ghi chú đánh giá thực tế/), 'Bổ sung báo cáo kiểm thử');
    await userEvent.click(screen.getByRole('button', { name: 'Yêu cầu bổ sung' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ action: 'return', skills: [expect.objectContaining({ name: 'React', managerFeedback: 'Bổ sung báo cáo kiểm thử' })] }));
  });
  it('employee can supplement evidence and resubmit', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SelfSkillEvaluationModal open currentResource={{ skills: [{ _id: 's', name: 'React', selfLevel: 3, evaluationStatus: 'returned', managerFeedback: 'Cần kết quả', evidence: '' }] }} onSubmit={onSubmit} />);
    expect(await screen.findByText('Cần bổ sung minh chứng')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Mô tả công việc/), 'Đã hoàn thành, 20 kiểm thử đạt');
    await userEvent.click(screen.getByRole('button', { name: /Gửi bản tự đánh giá/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ evidence: 'Đã hoàn thành, 20 kiểm thử đạt' })]));
  });
  it('selects next week and drills into department hours', async () => {
    const onChange = vi.fn();
    renderWithProviders(<WorkloadPeriodControls value={weekRange()} onChange={onChange} />);
    await userEvent.click(screen.getByText('Tuần tới'));
    expect(onChange).toHaveBeenCalledWith(weekRange(1));
    const person = { _id: '1', name: 'Lan', department: 'Dev', workload: 20, capacity: 40, weeklyCapacity: 40, baseWeeklyCapacity: 40, fte: 1, availableDays: 5, utilizationRate: 50, statusCode: 'yellow', breakdown: [{ taskId: 't', title: 'Checkout', estimatedHours: 40, scheduled: true, periodDays: 5, workingDays: 10, periodHours: 20 }] };
    renderWithProviders(<WorkloadProductivityChart productivityData={{ period: weekRange(), personnel: [person], departments: [{ name: 'Dev', personnelCount: 1, totalWorkload: 20, totalCapacity: 40, utilizationRate: 50, statusCode: 'yellow', members: [person] }] }} />);
    await userEvent.click(screen.getByText(/Theo Phòng ban/));
    await userEvent.click(screen.getByRole('button', { name: /20h \/ 40h · Chi tiết/ }));
    expect(await screen.findByText('Chi tiết giờ · Dev')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });
});
