import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';

const state = vi.hoisted(() => ({ getMyEvaluation: vi.fn(), selfEvaluate: vi.fn() }));
vi.mock('../src/services/resourceService', () => ({ default: {
  getMyEvaluation: state.getMyEvaluation,
  selfEvaluate: state.selfEvaluate,
} }));
const { default: MySkillAssessmentTab } = await import('../src/components/settings/MySkillAssessmentTab.jsx');

beforeEach(() => {
  state.getMyEvaluation.mockReset().mockResolvedValue({ data: { data: { resource: {
    _id: 'r1', position: 'Developer', department: 'Engineering', skills: [
      { _id: 's1', name: 'React', level: 3, selfLevel: 2, managerLevel: 3, evaluationStatus: 'approved' },
    ],
  } } } });
  state.selfEvaluate.mockReset().mockResolvedValue({ data: { success: true } });
});

describe('Tự đánh giá của Thành viên', () => {
  it('loads only the signed-in member profile and opens the self-assessment form', async () => {
    renderWithProviders(<MySkillAssessmentTab />);
    expect(await screen.findByText('React')).toBeInTheDocument();
    expect(screen.getByText('Mức 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Tự đánh giá năng lực/ }));
    expect(await screen.findByText(/Tự Đánh Giá Năng Lực & Kỹ Năng Bản Thân/)).toBeInTheDocument();
    expect(state.getMyEvaluation).toHaveBeenCalledOnce();
  });

  it('shows a useful message if the account has no resource profile', async () => {
    state.getMyEvaluation.mockRejectedValueOnce({ response: { data: { message: 'Chưa có hồ sơ nhân sự. Vui lòng liên hệ quản lý.' } } });
    renderWithProviders(<MySkillAssessmentTab />);
    expect(await screen.findByText('Chưa có hồ sơ nhân sự. Vui lòng liên hệ quản lý.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tự đánh giá năng lực/ })).not.toBeInTheDocument();
  });
});
