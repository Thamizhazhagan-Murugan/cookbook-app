// Design tokens. One accent (basil green) for actions, one warm highlight (yolk) reserved for time & timers.
import { useColorScheme } from 'react-native';

export type Palette = {
  canvas: string; surface: string; surface2: string; ink: string; muted: string; line: string;
  basil: string; basilInk: string; basilSoft: string; yolk: string; yolkInk: string; yolkSoft: string;
  chili: string; chiliSoft: string; overlay: string; shadow: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#EEF0ED',
    surface: '#FFFFFF',
    surface2: '#F5F7F4',
    ink: '#151A17',
    muted: '#5F6964',
    line: '#D9DED9',
    basil: '#1F6A47',
    basilInk: '#FFFFFF',
    basilSoft: '#E1EFE6',
    yolk: '#F5C21B',
    yolkInk: '#1A1600',
    yolkSoft: '#FFF4CC',
    chili: '#C2362B',
    chiliSoft: '#FBE4E1',
    overlay: 'rgba(21,26,23,0.45)',
    shadow: '#151A17',
  },
  dark: {
    canvas: '#121614',
    surface: '#1B211D',
    surface2: '#222925',
    ink: '#ECF0EC',
    muted: '#9BA59E',
    line: '#2E3631',
    basil: '#3F9C6C',
    basilInk: '#06130C',
    basilSoft: '#1D3328',
    yolk: '#F5C21B',
    yolkInk: '#1A1600',
    yolkSoft: '#3A3010',
    chili: '#E25A4C',
    chiliSoft: '#3B1D1A',
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
export const radius = { sm: 9, md: 14, lg: 20, pill: 999 } as const;

export function useTheme(): { c: Palette; dark: boolean } {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { c: dark ? palettes.dark : palettes.light, dark };
}
