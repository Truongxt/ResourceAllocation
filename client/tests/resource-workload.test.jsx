import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './helpers.jsx';
import i18n from '../src/i18n';

const mocks = vi.hoisted(() => ({ resources: vi.fn(), departments: vi.fn() }));
vi.mock('../src/services/resourceService', () => ({ default: { getAll: mocks.resources } }));
vi.mock('../src/services/departmentService', () => ({ default: { getAll: mocks.departments } }));
const { default: Resources } = await import('../src/pages/resources/Resources');
const person = (id, name, workload, availability = 'available') => ({
  _id: id, user: { name }, position: 'Developer', maxCapacity: 40, capacity: 40, fte: 1,
  utilizationRate: workload / 40 * 100, currentWorkload: workload, isOverloaded: workload > 40,
  availability, skills: [], unavailablePeriods: [],
});
beforeEach(async () => {
  await i18n.changeLanguage('vi');
  mocks.departments.mockResolvedValue({ data: { data: { departments: [] } } });
  mocks.resources.mockImplementation(async ({ page = 1 }) => ({ data: {
    pagination: { pages: 2 }, data: { resources: page === 1 ? [person('1', 'Người còn thời gian', 20), person('2', 'Người nghỉ', 0, 'unavailable')] : [person('3', 'Người quá tải', 48)] },
  } }));
});
describe('Resource workload filters', () => {
  it('finds overload beyond the first API page and excludes unavailable people from remaining capacity', async () => {
    renderWithProviders(<Resources />, { route: '/resources?workload=overloaded' });
    expect(await screen.findByText('Người quá tải')).toBeInTheDocument();
    expect(screen.getByText('Vượt 8 giờ so với khả năng làm việc')).toBeInTheDocument();
    expect(screen.queryByText('Người còn thời gian')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Còn khả năng nhận việc' }));
    await waitFor(() => expect(screen.getByText('Người còn thời gian')).toBeInTheDocument());
    expect(screen.queryByText('Người quá tải')).not.toBeInTheDocument();
    expect(screen.queryByText('Người nghỉ')).not.toBeInTheDocument();
  });
});
