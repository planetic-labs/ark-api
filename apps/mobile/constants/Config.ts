declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const COLORS = {
  // Legacy compatibility keys
  primary: '#B9770C',
  background: '#FFFFFF',
  text: '#221E17',
  secondaryText: '#6E655A',
  border: '#ECE7DD',
  error: '#a04a3a',
  success: '#B9770C',

  // New design spec keys (warm theme based on mockups v2 & v3)
  bgSurface: '#FCFAF5',
  borderSoft: '#F4F1EA',
  borderStrong: '#A69D8F',
  textPrimary: '#221E17',
  textSecondary: '#6E655A',
  textMuted: '#A69D8F',
  textFaint: '#ECE7DD',
  amber: '#B9770C',
  amberBright: '#E0951A',
  amberSoft: '#B9770C',
  amberDeep: '#8E6210',
  amberGlow: 'rgba(185, 119, 12, 0.10)',
  amberTint: '#FAF1DC',
  warn: '#a04a3a',
  warnSoft: '#c97a5a',
  warriorBg: '#FCF4E3',
  canvas: '#E7E3DA',
};

export const FONTS = {
  display: 'Spectral_400Regular',
  displayMedium: 'Spectral_500Medium',
  displaySemiBold: 'Spectral_600SemiBold',
  displayBold: 'Spectral_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyLight: 'IBMPlexSans_300Light',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
};

