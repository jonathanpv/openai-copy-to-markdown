# Getting Started with Chrome Extension React/Vite Demo

This guide will help you set up and run the Chrome extension demo.

## Prerequisites

- Node.js >= 22.12.0
- pnpm (install globally with `npm install -g pnpm`)
- Git
- Chrome browser

## Setup Steps

1. **Clone and Install**
   ```bash
   # Clone the repository
   git clone https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite
   
   # Enter the project directory
   cd chrome-extension-boilerplate-react-vite
   
   # Install dependencies
   pnpm install
   ```

2. **Development Mode**
   ```bash
   # Start the development server
   pnpm dev
   ```

3. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `dist` directory from your project folder

4. **View the Extension**
   - Click the extension icon in Chrome's toolbar
   - You should see "This is a demo vite/react app" in the popup
   - Try opening a new tab to see the extension's new tab page
   - The extension also adds a UI element at the bottom of web pages

## Key Features

- Popup UI (click extension icon)
- New Tab Override
- Content Script (injected into web pages)
- Options Page
- Side Panel
- DevTools Panel

## Development Tips

- Changes to the code will automatically trigger rebuilds
- The extension will hot-reload in most cases
- Check the browser console for any errors
- Use `pnpm build` for production builds

## Project Structure

- `/pages` - Contains different UI pages of the extension
  - `/popup` - Extension popup UI
  - `/new-tab` - New tab page override
  - `/content-ui` - UI injected into web pages
  - `/options` - Extension settings page
  
- `/chrome-extension` - Core extension files
  - `manifest.ts` - Extension manifest configuration
  - `/src/background` - Background service worker

## Troubleshooting

If the extension doesn't update:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card
3. Reload the browser tab you're testing on