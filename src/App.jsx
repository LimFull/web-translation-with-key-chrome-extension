import { useState } from 'react'
import './App.css'


function App() {
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    if (window.chrome && window.chrome.storage) {
      window.chrome.storage.local.set({ chatgpt_token: token }, () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      })
    } else {
      alert('크롬 확장 환경에서만 동작합니다.')
    }
  }

  const handlePrompt = () => {
    console.log('handlePrompt', prompt, window.chrome.runtime.id)
    if (!prompt) return
    setLoading(true)

    if (window.chrome && window.chrome.runtime) {
      window.chrome.runtime.sendMessage({
        type: 'CHATGPT_REQUEST',
        model: 'gpt-4.1-nano',
        instructions: 'You are a professional translator. Translate text to natural Korean. Only return the translated text.',
        input:prompt
      }, (res) => {
        setLoading(false)
        if (res?.error) {
          setResponse('에러: ' + res.error)
        } else {
          console.log('res', res?.data);
          // const json = JSON.stringify(res?.data);
          const text = res?.data?.output?.[0]?.content?.[0]?.text;
          setResponse(text??'');
        }
      })
    } else {
      setLoading(false)
      setResponse('크롬 확장 환경에서만 동작합니다.')
    }
  }

  return (
    <div className="app-container">
      <h1 className="label-title">ChatGPT 인증 토큰 입력</h1>
      <input
        type="text"
        className="border p-2 rounded w-full mb-2"
        placeholder="ChatGPT 인증 토큰을 입력하세요"
        value={token}
        onChange={e => setToken(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={handleSave}
      >
        저장
      </button>
      {saved && <div className="save-success">저장되었습니다!</div>}

      <h2 className="label-section">ChatGPT 프롬프트 테스트</h2>
      <input
        type="text"
        className="border p-2 rounded w-full mb-2"
        placeholder="프롬프트를 입력하세요"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <button
        className="bg-green-500 text-white px-4 py-2 rounded"
        onClick={handlePrompt}
        disabled={loading}
      >
        {loading ? '요청 중...' : '확인'}
      </button>
      {response && (
        <div className="response-box">
          {response}
        </div>
      )}
      {!response && (
        <div className="response-box">
          No response
        </div>
      )}
    </div>
  )
}

export default App
