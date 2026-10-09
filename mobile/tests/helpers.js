import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/context/ThemeContext';

/** Dựng màn hình trong ThemeProvider thật — mọi màn đều gọi `useTheme`. */
export const renderWithTheme = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);
