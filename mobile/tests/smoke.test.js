import React from 'react';
import { screen } from '@testing-library/react-native';
import EmptyState from '../src/components/common/EmptyState';
import { renderWithTheme } from './helpers';

test('dựng được một component có dùng theme', () => {
  renderWithTheme(<EmptyState title="Trống" description="Không có gì" />);
  expect(screen.getByText('Trống')).toBeTruthy();
});
