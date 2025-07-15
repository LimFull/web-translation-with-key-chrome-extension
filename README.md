# AI Web Translation Chrome Extension

This project is a Chrome extension built with React (Vite) that enables instant website translation using generative AI models (such as GPT-4.1). Users can provide their own API key and select the target language and model for translation. The extension is designed for privacy, speed, and flexibility.

## Features

- **Instant Website Translation**: Translate any website's content in real time using the latest AI models.
- **API Key Support**: Use your own generative AI API key (e.g., OpenAI, GPT-4.1, etc.).
- **Multiple Languages**: Supports English, Korean, Japanese, Chinese, Spanish, French, German, Italian, Portuguese, Russian, and more.
- **Model Selection**: Choose from various GPT models (gpt-4.1, gpt-4.1-mini, gpt-4.1-nano).
- **One-Click Toggle**: Easily enable or disable translation on any page.
- **Persistent & Efficient Caching**: Translations are cached by language and model for fast, repeated access.
- **Privacy First**: All API keys and settings are stored locally in your browser.

## Getting Started

### Development

```bash
npm install
npm run dev
```

### Build & Load the Extension

1. Build the project:
   ```bash
   npm run build
   ```
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## File Structure

- `public/manifest.json` : Chrome extension manifest
- `public/content.js` : Content script for in-page translation
- `public/background.js` : Background service worker
- `src/` : React source code (popup UI, settings, etc.)
- `public/_locales/` : Localization files for multi-language support

## Usage

1. Click the extension icon in Chrome.
2. Enter your API key for the AI model.
3. Select your target language and preferred GPT model.
4. Toggle translation on/off as needed.
5. Browse any website and see instant translations!

## Notes

- All translation and API key data is stored locally and never sent to any external server except the AI API you configure.
- The extension uses Chrome's `storage`, `activeTab`, and `scripting` permissions for secure and efficient operation.
- Caching is managed automatically to avoid storage overflow.

## License

MIT
