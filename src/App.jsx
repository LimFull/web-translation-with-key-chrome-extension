import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSavedToken, setIsSavedToken] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [gptModel, setGptModel] = useState('gpt-4.1');
  
  const { t } = useTranslation();

  // 지원하는 번역 언어 목록
  const supportedLanguages = [
    { code: 'English', name: 'English' },
    { code: 'Korean', name: '한국어' },
    { code: 'Japanese', name: '日本語' },
    { code: 'Chinese', name: '中文' },
    { code: 'Spanish', name: 'Español' },
    { code: 'French', name: 'Français' },
    { code: 'German', name: 'Deutsch' },
    { code: 'Italian', name: 'Italiano' },
    { code: 'Portuguese', name: 'Português' },
    { code: 'Russian', name: 'Русский' }
  ];

  // 지원하는 GPT 모델 목록
  const gptModels = [
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
  ];

  useEffect(() => {
    // 저장된 토큰, 번역 언어, 번역 상태, 모델 불러오기
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(['chatgpt_token', 'target_language', 'translation_enabled', 'gpt_model'], (result) => {
        if (result.chatgpt_token) {
          setToken(result.chatgpt_token);
          setIsSavedToken(true);
        }
        if (result.target_language) {
          setTargetLanguage(result.target_language);
        }
        if (result.translation_enabled !== undefined) {
          setIsTranslationEnabled(result.translation_enabled);
        }
        if (result.gpt_model) {
          setGptModel(result.gpt_model);
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

  const handleModelChange = (model) => {
    setGptModel(model);
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ gpt_model: model }, () => {
        console.log('GPT 모델이 저장되었습니다:', model);
      });
    }
  }

  const handleTranslationToggle = (enabled) => {
    setIsTranslationEnabled(enabled);
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ translation_enabled: enabled }, () => {
        console.log('번역 상태가 저장되었습니다:', enabled);
        
        // off -> on으로 변경된 경우 content script에 메시지 전송
        if (enabled && window.chrome && window.chrome.tabs) {
          window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              window.chrome.tabs.sendMessage(tabs[0].id, { 
                type: 'TRANSLATION_TOGGLED', 
                enabled: true 
              });
            }
          });
        }
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
        className="bg-blue-500 text-white px-4 py-1 rounded-lg mb-2 shadow-md border border-blue-500 hover:bg-blue-600 hover:border-blue-600 transition-colors duration-150"
        onClick={handleSave}
      >
        {t('save')}
      </button>
      }
      {isSavedToken && <button
        className="bg-white text-blue-600 px-4 py-1 rounded-lg mb-2 shadow-md border border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700 transition-colors duration-150"
        onClick={handleDeleteToken}
      >
        {t('delete')}
      </button>
      }
      {saved && <div className="save-success">{t('saved')}</div>}

      <h2 className="label-section">{t('translationSettings')}</h2>
      
      <div className="flex items-center justify-between mb-[10px]">
        <span className="text-sm font-medium">{t('translationFeature')}</span>
        <div
          className={`toggle-switch${isTranslationEnabled ? ' on' : ''}`}
          onClick={() => handleTranslationToggle(!isTranslationEnabled)}
        >
          <div className="toggle-knob" />
        </div>
      </div>
      <div className="mb-[8px]">
        <label className="block text-sm font-medium mb-2">{t('translationLanguage')}</label>
        <select
          className="border p-2 rounded w-full"
          value={targetLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={!isTranslationEnabled}
        >
          <option value="" disabled>{t('selectLanguage')}</option>
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('gptModel')}</label>
        <select
          className="border p-2 rounded w-full"
          value={gptModel}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={!isTranslationEnabled}
        >
          <option value="" disabled>{t('selectModel')}</option>
          {gptModels.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default App
