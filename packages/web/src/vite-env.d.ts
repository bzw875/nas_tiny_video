/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_MONITOR_APP_ID?: string;
  readonly VITE_MONITOR_REPORT_URL?: string;
  readonly VITE_MONITOR_DEBUG?: string;
  readonly VITE_MONITOR_WHITE_SCREEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
