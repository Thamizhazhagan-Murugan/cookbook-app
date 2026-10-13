// Design tokens. Cool, airy canvas; one lively accent (coral) for actions; mint for timers and
// "in stock"; deep navy ink instead of black. Dark mode keeps the same roles.
import { useColorScheme } from 'react-native';

export type Palette = {
  canvas: string; surface: string; surface2: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; accentSoft: string; // coral — primary actions
  highlight: string; highlightInk: string; highlightSoft: string; // mint — time, timers, stock
  danger: string; dangerSoft: string;
  overlay: string; shadow: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F4F7FA',
    surface: '#FFFFFF',
    surface2: '#EDF1F6',
    ink: '#14213D',
    muted: '#5F6B80',
    line: '#DCE3EC',
    accent: '#FF6A3D',
    accentInk: '#FFFFFF',
    accentSoft: '#FFE8DF',
    highlight: '#2EC4B6',
    highlightInk: '#062A27',
    highlightSoft: '#D6F5F1',
    danger: '#E63946',
    dangerSoft: '#FDE1E4',
    overlay: 'rgba(20,33,61,0.45)',
    shadow: '#14213D',
  },
  dark: {
    canvas: '#0F1623',
    surface: '#18212F',
    surface2: '#1F2A3A',
    ink: '#F2F5F9',
    muted: '#9AA7BA',
    line: '#2A3648',
    accent: '#FF7A52',
    accentInk: '#1B0A04',
    accentSoft: '#3A2219',
    highlight: '#34D1C3',
    highlightInk: '#062A27',
    highlightSoft: '#143B38',
    danger: '#FF5C6A',
    dangerSoft: '#3C1B20',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: '#000000',
  },
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export function useTheme(): { c: Palette; dark: boolean } {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { c: dark ? palettes.dark : palettes.light, dark };
}
