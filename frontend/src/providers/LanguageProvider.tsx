import { useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageContext, type Language } from '@/contexts/LanguageContext';
import { zh, en } from '@/i18n';

const STORAGE_KEY = 'matoken-language';

const translations = { zh, en };

// 获取嵌套对象的值
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

// 字符串插值
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // 从 localStorage 读取保存的语言偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') {
        return saved;
      }
    }
    return 'zh'; // 默认中文
  });

  // 设置语言并持久化
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  // 翻译函数
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations[language], key);
    if (value === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${key}`);
      }
      return key; // fallback 返回 key 本身
    }
    return interpolate(value, params);
  }, [language]);

  // 同步 localStorage 变化（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'zh' || e.newValue === 'en')) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
