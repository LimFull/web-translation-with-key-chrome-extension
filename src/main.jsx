import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n.js' // i18n 설정 import
import styled from 'styled-components'

// styled-components 예시: (기존 App 컴포넌트 위에 추가)
const StyledDiv = styled.div`
  padding: 16px;
  background: #f0f0f0;
  border-radius: 8px;
`;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
