import type { ko } from './dictionaries/ko';

export type Locale = 'ko' | 'en';
export type TranslationKey = keyof typeof ko;
export type Dictionary = Record<TranslationKey, string>;
