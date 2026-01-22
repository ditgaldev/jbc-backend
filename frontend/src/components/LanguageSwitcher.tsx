import { useLanguage } from '@/hooks/useLanguage';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent, lang: 'zh' | 'en') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setLanguage(lang);
    }
  };

  return (
    <div className="inline-flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1 flex-shrink-0">
      <button
        onClick={() => setLanguage('zh')}
        onKeyDown={(e) => handleKeyDown(e, 'zh')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
          language === 'zh'
            ? 'bg-green-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-label="切换到中文"
        aria-pressed={language === 'zh'}
      >
        中文
      </button>
      <button
        onClick={() => setLanguage('en')}
        onKeyDown={(e) => handleKeyDown(e, 'en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
          language === 'en'
            ? 'bg-green-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-label="Switch to English"
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
