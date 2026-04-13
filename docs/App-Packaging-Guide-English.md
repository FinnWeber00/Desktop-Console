# Desktop Console Windows Packaging Guide

![App Icon](./en/app-icon.png)

## 1. Document Purpose

This document explains how to package `Desktop Console` as a distributable Windows desktop application.
The current project is built with:

- Electron Forge
- Vite
- React 19
- TypeScript
- better-sqlite3

After packaging, the default output is:

```text
out/Desktop Console-win32-x64/Desktop Console.exe
```

## 2. Application Summary

Desktop Console is a local-first desktop launcher used to manage:

- Frequently used websites
- Local desktop applications
- Windows shortcuts (`.lnk`)
- Category-based navigation
- Fast summon and hotkey access

Its goal is to give users one unified panel for organizing and opening daily work entries.

## 3. Preparation Before Packaging

### 3.1 System Requirements

Recommended environment:

- Windows 10 or Windows 11
- Node.js 22.x
- npm 10.x
- Visual Studio 2022 Build Tools

### 3.2 Required Components

Because this project depends on `better-sqlite3`, Windows needs a working C++ toolchain.
Please install:

- `Visual Studio 2022 Build Tools`
- Workload: `Desktop development with C++`

It is also recommended to include:

- `MSVC v143 - VS 2022 C++ x64/x86 build tools`
- `Windows 10/11 SDK`
- `C++ core features`

### 3.3 Install Dependencies

Run this in the project root:

```powershell
npm.cmd install
```

## 4. Verify the Development Build First

Before packaging, verify that the app runs correctly in development mode:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run start
```

Notes:

- `typecheck` validates TypeScript types
- `lint` checks code style and static issues
- `start` launches the Electron development build

If the development build does not run correctly, fix that first before packaging.

## 5. Package the App

### 5.1 Run the Packaging Command

```powershell
npm.cmd run package
```

If packaging succeeds, the output is generated in:

```text
out/Desktop Console-win32-x64/
```

The main executable is:

```text
out/Desktop Console-win32-x64/Desktop Console.exe
```

### 5.2 Optional: Build an Installer

If you need an installer instead of a standalone packaged folder, run:

```powershell
npm.cmd run make
```

Notes:

- `package` is better for local verification or copying the packaged folder directly
- `make` is better when you need installer artifacts or releasable deliverables

## 6. Recommended Smoke Tests After Packaging

At minimum, verify the following:

1. Double-click `Desktop Console.exe` and confirm the main window opens
2. Check whether the tray menu renders correctly
3. Check whether the global hotkey registers successfully
4. Create a website card and confirm it opens correctly
5. Drag in an `.exe` or `.lnk` file and confirm an app card is created correctly
6. Check whether apps under Chinese or other non-ASCII paths display correctly

## 7. Common Issues

### 7.1 `better-sqlite3` Errors

If you see native module build or load errors, check:

- Whether `Visual Studio 2022 Build Tools` is installed
- Whether the C++ workload is installed
- Whether you re-ran `npm.cmd install`

### 7.2 Blank Window After Packaging

If the window opens but the UI is blank, confirm:

- The packaged build was not mixed with stale development artifacts
- You are launching the latest rebuilt `out/Desktop Console-win32-x64/Desktop Console.exe`
- There are no leftover old processes still running

### 7.3 Corrupted Chinese Path Metadata

If old data contains previously garbled Chinese paths, start the latest packaged build once again so the app can refresh its metadata automatically.

## 8. Recommended Release Flow

Suggested order:

1. `npm.cmd install`
2. `npm.cmd run typecheck`
3. `npm.cmd run lint`
4. `npm.cmd run package`
5. Manually run the packaged executable for smoke testing
6. After verification, upload the release to GitHub Releases or another distribution channel

## 9. Directory Notes

```text
assets/                       App icon resources
src/main/                     Main process code
src/renderer/                 Renderer process code
docs/                         Project documentation
out/Desktop Console-win32-x64 Packaged output directory
```

## 10. Images

### Current UI Preview

![Main UI Screenshot](./en/1.jpg)

### Windows Shortcut Example

![Shortcut Property Example](./en/2.jpg)
