import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getMonitor } from 'agiex-monitor';

interface Props {
  children: ReactNode;
}

export class MonitorErrorBoundary extends Component<Props> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    const monitor = getMonitor();
    monitor?.report({
      type: 'error',
      subType: 'framework_error',
      data: {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      },
      breadcrumbs: monitor.getBreadcrumbs(),
    });
  }

  render() {
    return this.props.children;
  }
}
