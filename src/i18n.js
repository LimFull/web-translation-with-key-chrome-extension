import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      title: 'ChatGPT Authentication Token',
      placeholder: 'Enter your ChatGPT authentication token',
      save: 'Save',
      delete: 'Delete Token',
      saved: 'Saved!',
      error: 'Chrome extension environment required',
      translationSettings: 'Translation Settings',
      translationFeature: 'Translation Feature',
      translationLanguage: 'Translation Language',
      gptModel: 'GPT Model',
      selectLanguage: 'Select language',
      selectModel: 'Select model',
    }
  },
  ko: {
    translation: {
      title: 'ChatGPT 인증 토큰 입력',
      placeholder: 'ChatGPT 인증 토큰을 입력하세요',
      save: '저장',
      delete: '토큰 삭제',
      saved: '저장되었습니다!',
      error: '크롬 확장 환경에서만 동작합니다.',
      translationSettings: '번역 설정',
      translationFeature: '번역 기능',
      translationLanguage: '번역 언어',
      gptModel: 'GPT 모델',
      selectLanguage: '언어 선택',
      selectModel: '모델 선택',
    }
  },
  ja: {
    translation: {
      title: 'ChatGPT認証トークン入力',
      placeholder: 'ChatGPT認証トークンを入力してください',
      save: '保存',
      delete: 'トークン削除',
      saved: '保存されました！',
      error: 'Chrome拡張機能環境でのみ動作します',
      translationSettings: '翻訳設定',
      translationFeature: '翻訳機能',
      translationLanguage: '翻訳言語',
      gptModel: 'GPTモデル',
      selectLanguage: '言語を選択',
      selectModel: 'モデルを選択',
    }
  },
  zh: {
    translation: {
      title: 'ChatGPT认证令牌输入',
      placeholder: '请输入您的ChatGPT认证令牌',
      save: '保存',
      delete: '删除令牌',
      saved: '已保存！',
      error: '仅在Chrome扩展环境中运行',
      translationSettings: '翻译设置',
      translationFeature: '翻译功能',
      translationLanguage: '翻译语言',
      gptModel: 'GPT模型',
      selectLanguage: '选择语言',
      selectModel: '选择模型',
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // React에서는 XSS 방지가 자동으로 처리됨
    },

    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    }
  });

export default i18n; 