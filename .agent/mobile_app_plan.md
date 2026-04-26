# LMNL Mobile Strategy Implementation Plan

This document outlines the steps required to transition the LMNL web platform into a mobile application experience.

---

## Option 1: Progressive Web App (PWA)
*The quickest way to get an app-like experience directly from the browser without App Store overhead.*

### 1. Setup & Dependencies
- Install the Vite PWA plugin: `npm install vite-plugin-pwa --save-dev`.
- Add high-resolution visual assets to the `/public` folder:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `apple-touch-icon.png`
  - Maskable icons for seamless background blending.

### 2. Configuration (`vite.config.js`)
- Integrate `VitePWA` into the plugins array.
- Configure the `manifest` object:
  - **name**: "LMNL"
  - **short_name**: "LMNL"
  - **theme_color**: "#FFFFFF"
  - **background_color**: "#FFFFFF"
  - **display**: "standalone" (removes the Safari browser chrome)
  - **orientation**: "portrait"

### 3. Service Worker & Caching
- Set up offline fallback caching strategies for core assets.

---

## Option 2: Capacitor (Standalone Native iOS App)
*Packaging the existing React codebase for submission to the official Apple App Store.*

### 1. Prerequisites
- An active Apple Developer Account ($99/year).
- A Mac running macOS with Xcode installed.

### 2. Initialization
- Install core Capacitor packages: `npm install @capacitor/core @capacitor/cli`.
- Initialize the project: `npx cap init LMNL com.lmnl.app --web-dir dist`.

### 3. iOS Integration
- Install the native iOS platform module: `npm install @capacitor/ios`.
- Add the iOS workspace: `npx cap add ios`.

### 4. Build Pipeline Update
- Add a mobile build script to `package.json`:
  ```json
  "scripts": {
    "build:ios": "npm run build && npx cap sync ios"
  }
  ```
- Open the project workspace in Xcode: `npx cap open ios`.

### 5. Xcode Configuration & Asset Generation
- Generate native App Icons and Launch Storyboards.
- Verify Code Signing & capabilities for production deployment.
