// Theme configuration
export const lightTheme = {
  primary: '#4F46E5',
  secondary: '#E6E6FA',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  card: '#FFFFFF',
  cardHover: '#F3F4F6',
};

export const darkTheme = {
  primary: '#6366F1',
  secondary: '#4C1D95',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textLight: '#CBD5E1',
  border: '#334155',
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  card: '#1E293B',
  cardHover: '#334155',
};

export const getTheme = (isDark) => isDark ? darkTheme : lightTheme;

export const globalStyles = (theme) => `
  * {
    color: ${theme.text};
  }

  body {
    background: ${theme.background};
    color: ${theme.text};
    transition: background 0.3s, color 0.3s;
  }

  .card {
    background: ${theme.card};
    border-color: ${theme.border};
  }

  .card:hover {
    background: ${theme.cardHover};
  }

  input, select, textarea {
    background: ${theme.surface};
    color: ${theme.text};
    border-color: ${theme.border};
  }

  input:focus, select:focus, textarea:focus {
    border-color: ${theme.primary};
  }

  button {
    transition: all 0.2s;
  }
`;
