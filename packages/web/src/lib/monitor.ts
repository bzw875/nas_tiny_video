import { init } from 'agiex-monitor';

const appId = import.meta.env.VITE_MONITOR_APP_ID ?? 'nas-tiny-video';
const reportUrl = import.meta.env.VITE_MONITOR_REPORT_URL?.trim();

function monitorHostPattern(url: string): RegExp | undefined {
  try {
    const host = new URL(url, window.location.origin).host;
    return new RegExp(host.replace(/\./g, '\\.'));
  } catch {
    return undefined;
  }
}

/** 在应用渲染前调用一次 */
export function setupMonitor(): void {
  if (!reportUrl) {
    if (import.meta.env.DEV) {
      console.warn('[monitor] 未配置 VITE_MONITOR_REPORT_URL，监控未启动');
    }
    return;
  }

  const ignoreMonitorSelf = monitorHostPattern(reportUrl);

  init({
    appId,
    reportUrl,
    debug:
      import.meta.env.DEV &&
      import.meta.env.VITE_MONITOR_DEBUG !== 'false',
    enableWhiteScreen: import.meta.env.VITE_MONITOR_WHITE_SCREEN === 'true',
    whiteScreenSelectors: ['#root'],
    ignoreErrors: [/ResizeObserver loop/, /Script error/],
    whitelistUrls: ignoreMonitorSelf ? [ignoreMonitorSelf] : undefined,
    sampling: {
      performance: 1,
      error: 1,
      behavior: 0.5,
      api: 0.5,
    },
  });
}
