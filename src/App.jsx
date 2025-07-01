import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSavedToken, setIsSavedToken] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Korean');
  
  const { t } = useTranslation();

  // 지원하는 번역 언어 목록
  const supportedLanguages = [
    { code: 'Korean', name: '한국어' },
    { code: 'English', name: 'English' },
    { code: 'Japanese', name: '日本語' },
    { code: 'Chinese', name: '中文' },
    { code: 'Spanish', name: 'Español' },
    { code: 'French', name: 'Français' },
    { code: 'German', name: 'Deutsch' },
    { code: 'Italian', name: 'Italiano' },
    { code: 'Portuguese', name: 'Português' },
    { code: 'Russian', name: 'Русский' }
  ];

  useEffect(() => {
    // 저장된 토큰과 번역 언어 불러오기
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(['chatgpt_token', 'target_language'], (result) => {
        if (result.chatgpt_token) {
          setToken(result.chatgpt_token);
          setIsSavedToken(true);
        }
        if (result.target_language) {
          setTargetLanguage(result.target_language);
        }
      });
    }
  }, []);

  const handleSave = () => {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ chatgpt_token: token }, () => {
        setSaved(true);
        setIsSavedToken(true);
        setTimeout(() => setSaved(false), 1500);
      })
    } else {
      alert(t('error'))
    }
  }

  const handleDeleteToken = () => {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.remove('chatgpt_token', () => {
        setToken('');
        setIsSavedToken(false);
      })
    }
  }

  const handleLanguageChange = (language) => {
    setTargetLanguage(language);
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ target_language: language }, () => {
        console.log('번역 언어가 저장되었습니다:', language);
      });
    }
  }

  return (
    <div className="app-container">
      <h1 className="label-title">{t('title')}</h1>
      {!isSavedToken && <input
        type="text"
        className="border p-2 rounded w-full mb-2"
        placeholder={t('placeholder')}
        value={token}
        onChange={e => setToken(e.target.value)}
      />}
      {!isSavedToken && <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={handleSave}
      >
        {t('save')}
      </button>
      }
      {isSavedToken && <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={handleDeleteToken}
      >
        {t('delete')}
      </button>
      }
      {saved && <div className="save-success">{t('saved')}</div>}

      <h2 className="label-section">번역 언어 선택</h2>
      <select
        className="border p-2 rounded w-full mb-4"
        value={targetLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default App
