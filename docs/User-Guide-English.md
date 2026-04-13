# Desktop Console User Guide (English)

![App Icon](./en/app-icon.png)

## 1. What This App Does

Desktop Console is a local-first desktop launcher that helps users organize and open:

- Websites
- Local desktop applications
- Windows shortcuts
- Categorized workspaces
- Frequently used entries

It is designed for people who want a single control panel for daily tools, apps, and web destinations.

## 2. Interface Overview

![Main UI](./en/1.jpg)

The interface is divided into 3 main areas:

1. Left sidebar: categories
2. Top action bar: search, create category, add card, settings
3. Main content area: pinned cards, recent items, and card list

## 3. First-Time Setup

Recommended onboarding flow:

1. Create a few categories such as `Work`, `Study`, and `Tools`
2. Add website and app cards into the right categories
3. Open settings and configure tray behavior, hotkeys, and browser path

Additional notes:

- Users do not need to install a database manually
- On first launch, the app creates its local database automatically, applies the schema, and inserts default data
- On Windows, user data is stored by default at `%APPDATA%\\Desktop Console\\desktop-console.db`
- Example: `C:\\Users\\<YourUserName>\\AppData\\Roaming\\Desktop Console\\desktop-console.db`
- The packaged app inside the `version` folder does not include the developer's personal database

## 4. Creating Categories

Steps:

1. Click `New Category`
2. Enter a category name
3. Save it

Typical examples:

- Work
- Study
- Office Apps
- Tech Tools
- Common Sites

## 5. Adding Cards

### 5.1 Add a Website Card

Use website cards for services such as GitHub, Notion, Gitee, or company portals.

Steps:

1. Click `Add Card`
2. Select `Website`
3. Enter the name and URL
4. Choose a category
5. Save

Notes:

- Bare domains can be normalized to `https://...`
- The app will try to fetch the page title and favicon automatically

### 5.2 Add an App Card

Use app cards for local applications such as VS Code, WeChat, Typora, or WXWork.

Steps:

1. Click `Add Card`
2. Select `App`
3. Enter the app name
4. Enter an `.exe` path or a `.lnk` shortcut path
5. Choose a category
6. Save

Notes:

- `.exe` is supported
- `.lnk` is supported
- Windows shortcuts can be resolved into real executable paths and icons

## 6. Drag-and-Drop Import

Desktop Console supports drag-and-drop import.

Supported items:

- URL
- `.exe`
- `.lnk`
- `.url`

How to use it:

1. Open a specific category
2. Drag a file or link into the window
3. Drop it to create a new card automatically

Shortcut example:

## 7. Search and Quick Access

Use the search bar to search by:

- Card name
- Target path or URL
- Notes

This is useful when the app contains many entries.

## 8. Pinning and Recent Usage

Cards can be pinned so that your most important entries stay at the top.

The app also tracks recently used entries to help you reopen them quickly.

## 9. Settings

Available settings include:

- System tray behavior
- Global hotkey
- Default browser path
- Password lock
- Auto-lock timing

Recommended setup:

- Configure a global hotkey if you open the app frequently
- Set a dedicated browser path if websites must open in a specific browser

Data notes:

- If the browser path is left empty, website cards open with the system default browser

- If a browser path is provided, website cards are forced to open with that browser

- Your cards, categories, settings, and security data are stored in the local user-data directory, not inside the packaged release folder

  ![Shortcut Example](./en/2.jpg)

  

## 10. Tray and Hotkeys

When tray mode is enabled, closing the main window hides the app instead of exiting it.

Typical tray menu actions:

- Show Main Panel
- Quick Summon
- Hide Main Window
- Exit

A configured global hotkey can bring the app back instantly.

![Shortcut Example](./en/3.jpg)

![Shortcut Example](./en/4.jpg)

## 11. Recommended Usage Tips

Best practices:

1. Keep category names clear and short

2. Pin the entries you use every day

3. Prefer valid executables or working shortcuts for app cards

4. Clean up outdated entries regularly

   

   

## 12. Extra Images

### Early UI Concepts

This tool helps you organize frequently used desktop apps and websites for quick access. It is recommended to use it with the open-source utility **Everything**, which enables you to locate files and folders instantly.

The software is developed based on my personal preferences and daily usage needs. If you would like to customize Desktop Console further, you can get the source code on GitHub for secondary development. This project is completely free and open source. If you find it useful, please **star this repository** on GitHub to support me!