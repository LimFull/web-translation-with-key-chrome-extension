# Contributing Guidelines

Thank you for your interest in contributing to the Web Translation Chrome Extension! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Contribution Process](#contribution-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Translation Contributions](#translation-contributions)
- [Testing](#testing)
- [Deployment](#deployment)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Chrome browser (for development)
- Git

### Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/web-translation.git
   cd web-translation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 💻 Coding Standards

### JavaScript/React

- **Follow ESLint rules**: Run `npm run lint` to check your code
- **Use functional components**: Prefer functional components and hooks over class components
- **Clear naming**: Use meaningful variable and function names
- **Add comments**: Include appropriate comments for complex logic

### CSS/Styling

- **Use Tailwind CSS**: Prefer Tailwind classes over custom CSS
- **styled-components**: Use for component-specific styling
- **Responsive design**: Consider both mobile and desktop layouts

### File Structure

```
src/
├── components/     # Reusable components
├── hooks/         # Custom hooks
├── utils/         # Utility functions
├── assets/        # Static assets
└── i18n.js        # Internationalization setup

public/
├── _locales/      # Localization files
├── manifest.json  # Extension manifest
├── content.js     # Content script
└── background.js  # Background script
```

## 🔄 Contribution Process

1. **Create an issue**: First create an issue for bug reports or feature requests
2. **Create a branch**: Use `feature/feature-name` or `fix/bug-name` format
3. **Develop**: Write code and test thoroughly
4. **Commit**: Write clear commit messages
5. **Pull Request**: Create a pull request on GitHub
6. **Review**: Code review and merge

### Commit Message Convention

```
type(scope): description

feat: new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
test: test additions/modifications
chore: build process or auxiliary tool changes
```

Examples:
```
feat(translation): add support for new language
fix(ui): resolve popup sizing issue
docs(readme): update installation instructions
```

## 🐛 Bug Reports

If you find a bug, please create an issue with the following information:

- **Bug description**: What went wrong
- **Reproduction steps**: How to reproduce the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment information**: 
  - Chrome version
  - Operating system
  - Extension version
- **Screenshots/logs**: Attach if possible

## 💡 Feature Requests

To suggest new features:

- **Feature description**: Detailed description of the requested feature
- **Use case**: How this feature would be useful
- **Implementation ideas**: Possible implementation approaches (optional)
- **Priority**: Importance of the feature

## 🌐 Translation Contributions

We welcome contributions for multi-language support!

### Translation File Locations
```
public/_locales/
├── en/messages.json  # English (default)
├── ko/messages.json  # Korean
├── ja/messages.json  # Japanese
└── zh/messages.json  # Chinese
```

### How to Add Translations

1. Create a new language folder: `public/_locales/[language-code]/`
2. Create a `messages.json` file
3. Translate all keys from the English version
4. Verify `default_locale` in `manifest.json`

### Translation File Format

```json
{
  "appName": {
    "message": "Web Translation",
    "description": "Extension name"
  },
  "appDescription": {
    "message": "Website translation using AI",
    "description": "Extension description"
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Lint check
npm run lint

# Build test
npm run build

# Preview
npm run preview
```

### Testing Checklist

- [ ] No ESLint errors
- [ ] Build successful
- [ ] Chrome extension loads successfully
- [ ] Basic functionality works
- [ ] Translation feature tested
- [ ] Multi-language support verified

## 📦 Deployment

### Building

```bash
npm run build
```

### Chrome Web Store Deployment Preparation

1. Zip the contents of the `dist` folder
2. Upload to Chrome Web Store Developer Console
3. Update store listing information

## 📞 Contact

- **Issues**: Use GitHub Issues
- **Discussions**: Use GitHub Discussions
- **Security**: Handle security issues privately

## 📄 License

This project is licensed under the MIT License. Your contributions will be under the same license.

## 🙏 Acknowledgments

Thank you to all contributors! Your contributions make this project better.

---

**Note**: This guideline may be updated as the project evolves. Please check for the latest version. 