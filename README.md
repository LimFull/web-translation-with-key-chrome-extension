# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Web Translation Chrome Extension

이 프로젝트는 React(Vite) 기반의 크롬 익스텐션입니다.

## 개발 방법

```bash
npm run dev
```

## 빌드 및 배포

1. 아래 명령어로 빌드합니다.
   ```bash
   npm run build
   ```
2. `dist` 폴더의 파일을 크롬 익스텐션으로 로드합니다.
   - 크롬 주소창에 `chrome://extensions/` 입력
   - "압축해제된 확장 프로그램을 로드" 클릭
   - `dist` 폴더 선택

## 주요 파일 구조

- `public/manifest.json` : 크롬 익스텐션 설정 파일
- `public/content.js` : 컨텐츠 스크립트
- `public/background.js` : 백그라운드 서비스 워커
- `src/` : React 소스 코드 (팝업 UI 등)
