# Architecture Reference

## Process Boundaries

Use three clear layers:

- `main`: native capabilities and system integration
- `preload`: typed bridge only
- `renderer`: React UI

## Main Process Responsibilities

- app lifecycle
- BrowserWindow creation
- tray
- global shortcuts
- launching desktop apps
- opening external URLs
- database initialization
- repository/service composition
- lock state coordination

## Preload Responsibilities

- expose minimal APIs through `contextBridge`
- keep request/response contracts typed
- never expose raw Node modules

## Renderer Responsibilities

- page layout
- state orchestration
- user interaction
- search UI
- modal flows
- lock screen UI

## Suggested Main Modules

- `app/`
- `windows/`
- `tray/`
- `shortcuts/`
- `db/`
- `repositories/`
- `services/`
- `ipc/`

## Suggested Shared Modules

- `types/`
- `contracts/`
- `constants/`

## Preferred Data Flow

1. renderer triggers action
2. preload API validates the narrow call surface
3. main handler executes service/repository logic
4. result returns as typed payload
5. renderer updates Zustand/UI state

## Rules

- keep business logic out of React components
- keep SQL out of renderer code
- keep OS integrations out of renderer code
- keep IPC handlers thin and delegate to services
