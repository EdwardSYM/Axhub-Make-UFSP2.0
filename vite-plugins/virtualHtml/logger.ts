const VIRTUAL_HTML_LOG_PREFIX = '[虚拟HTML]';
const VIRTUAL_HTML_DEBUG_LOGS_ENABLED = false;

function formatMessage(message: string) {
  return `${VIRTUAL_HTML_LOG_PREFIX} ${message}`;
}

export function logVirtualHtmlDebug(message: string, ...args: unknown[]) {
  if (!VIRTUAL_HTML_DEBUG_LOGS_ENABLED) {
    return;
  }

  console.log(formatMessage(message), ...args);
}

export function logVirtualHtmlWarn(message: string, ...args: unknown[]) {
  console.warn(formatMessage(message), ...args);
}

export function logVirtualHtmlError(message: string, ...args: unknown[]) {
  console.error(formatMessage(message), ...args);
}
