import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSavedToken, setIsSavedToken] = useState(false);
  
  const { t } = useTranslation();

  useEffect(() => {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.get(['chatgpt_token'], (result) => {
        if (result.chatgpt_token) {
          setToken(result.chatgpt_token);
          setIsSavedToken(true);
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
    </div>
  )
}

export default App
