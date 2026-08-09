import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n, Language } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'light', className = '' }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();

  const base = variant === 'dark'
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200';

  return (
    <div className={`flex items-center gap-1 rounded-full p-0.5 ${base} ${className}`} role="group" aria-label="Language / Idioma">
      <Globe className="w-3.5 h-3.5 ml-1.5 opacity-70" />
      {(['pt', 'en'] as Language[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer border-0 ${
            lang === l
              ? variant === 'dark'
                ? 'bg-white text-slate-900'
                : 'bg-white text-indigo-600 shadow-sm'
              : 'bg-transparent opacity-60 hover:opacity-100 ' + (variant === 'dark' ? 'text-white' : 'text-slate-500')
          }`}
          aria-pressed={lang === l}
        >
          {l === 'pt' ? 'PT' : 'EN'}
        </button>
      ))}
    </div>
  );
}
