// Design Tokens — aligned with doc/ui.md sections 3-7

// ===== Colors =====
export const Colors = {
  // Primary
  Primary: '#4F6EF7',
  PrimaryLight: '#EEF1FF',
  PrimaryDark: '#3A56D4',

  // Semantic — Expense
  Expense: '#F43F5E',
  ExpenseLight: '#FFF0F3',

  // Semantic — Income
  Income: '#10B981',
  IncomeLight: '#ECFDF5',

  // Neutral
  TextPrimary: '#0F172A',
  TextSecondary: '#475569',
  TextTertiary: '#94A3B8',
  Border: '#E2E8F0',
  Background: '#F8FAFC',
  CardBg: '#FFFFFF',

  // Extended
  Warning: '#F59E0B',
  Error: '#EF4444',
  Info: '#3B82F6',
} as const

// ===== Typography =====
export const FontSize = {
  H1: '32px',
  H2: '24px',
  H3: '18px',
  Body: '16px',
  BodySmall: '14px',
  Caption: '12px',
  BillAmount: '40px',
  ListAmount: '20px',
  SummaryAmount: '28px',
} as const

export const FontWeight = {
  Bold: 700,
  SemiBold: 600,
  Medium: 500,
  Regular: 400,
} as const

export const LineHeight = {
  Tight: 1.3,
  Normal: 1.4,
  Relaxed: 1.5,
} as const

// ===== Spacing =====
export const Spacing = {
  Xs: '4px',
  Sm: '8px',
  Md: '12px',
  Lg: '16px',
  Xl: '20px',
  Xl2: '24px',
  Xl3: '32px',
  PageMargin: '20px',
} as const

// ===== Border Radius =====
export const Radius = {
  Sm: '4px',
  Md: '8px',
  Lg: '12px',
  Xl: '16px',
  Full: '50%',
} as const

// ===== Shadows =====
export const Shadow = {
  Sm: '0 1px 2px rgba(0,0,0,0.04)',
  Md: '0 2px 8px rgba(0,0,0,0.06)',
  Lg: '0 4px 16px rgba(0,0,0,0.08)',
  Xl: '0 8px 24px rgba(0,0,0,0.10)',
  FloatingBtn: '0 4px 16px rgba(79, 110, 247, 0.3)',
} as const

// ===== Animation Duration =====
export const Duration = {
  Instant: '100ms',
  Fast: '150ms',
  Normal: '250ms',
  Slow: '400ms',
  Chart: '600ms',
} as const

// ===== Component Heights =====
export const ComponentSize = {
  FloatingBtn: '56px',
  FloatingBtnTouchTarget: '44px',
  BottomNavHeight: '50px',
  ButtonMinHeight: '44px',
  ListItemHeight: '48px',
  ProgressBarHeight: '8px',
  IconMd: '24px',
  IconSm: '20px',
  AvatarSize: '64px',
} as const
