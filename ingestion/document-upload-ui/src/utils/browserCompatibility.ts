/**
 * Browser Compatibility Utilities
 * Detects browser capabilities and provides graceful degradation
 */

export interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
  missingFeatures: string[];
}

/**
 * Minimum supported browser versions
 */
const MINIMUM_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
};

/**
 * Detects the current browser and version
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name = 'unknown';
  let version = 0;

  // Chrome
  if (/Chrome\/(\d+)/.test(userAgent) && !/Edg\//.test(userAgent)) {
    name = 'chrome';
    version = parseInt(RegExp.$1, 10);
  }
  // Edge (Chromium-based)
  else if (/Edg\/(\d+)/.test(userAgent)) {
    name = 'edge';
    version = parseInt(RegExp.$1, 10);
  }
  // Firefox
  else if (/Firefox\/(\d+)/.test(userAgent)) {
    name = 'firefox';
    version = parseInt(RegExp.$1, 10);
  }
  // Safari
  else if (/Version\/(\d+).*Safari/.test(userAgent)) {
    name = 'safari';
    version = parseInt(RegExp.$1, 10);
  }

  const missingFeatures = checkRequiredFeatures();
  const isSupported = isBrowserSupported(name, version) && missingFeatures.length === 0;

  return {
    name,
    version,
    isSupported,
    missingFeatures,
  };
}

/**
 * Checks if the browser version is supported
 */
function isBrowserSupported(name: string, version: number): boolean {
  const minVersion = MINIMUM_VERSIONS[name as keyof typeof MINIMUM_VERSIONS];
  if (!minVersion) {
    // Unknown browser - allow but may have issues
    return true;
  }
  return version >= minVersion;
}

/**
 * Checks for required browser features
 */
function checkRequiredFeatures(): string[] {
  const missing: string[] = [];

  // Check for required APIs
  if (!window.File || !window.FileReader || !window.FileList) {
    missing.push('File API');
  }

  if (!window.FormData) {
    missing.push('FormData API');
  }

  if (!window.fetch) {
    missing.push('Fetch API');
  }

  if (!window.Promise) {
    missing.push('Promise');
  }

  if (!window.localStorage) {
    missing.push('LocalStorage');
  }

  // Check for drag and drop support
  if (!('draggable' in document.createElement('div'))) {
    missing.push('Drag and Drop API');
  }

  return missing;
}

/**
 * Displays a browser compatibility warning
 */
export function showBrowserWarning(browserInfo: BrowserInfo): void {
  const warningDiv = document.createElement('div');
  warningDiv.id = 'browser-warning';
  warningDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: #fff3cd;
    color: #856404;
    padding: 15px;
    text-align: center;
    z-index: 10000;
    border-bottom: 2px solid #ffc107;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  `;

  let message = '';
  if (!browserInfo.isSupported) {
    message = `
      <strong>Browser Compatibility Warning</strong><br>
      Your browser (${browserInfo.name} ${browserInfo.version}) may not be fully supported.
      For the best experience, please use:<br>
      Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
    `;
  }

  if (browserInfo.missingFeatures.length > 0) {
    message += `<br><br>Missing features: ${browserInfo.missingFeatures.join(', ')}`;
  }

  warningDiv.innerHTML = message;
  document.body.insertBefore(warningDiv, document.body.firstChild);
}

/**
 * Checks browser compatibility and shows warning if needed
 */
export function checkBrowserCompatibility(): BrowserInfo {
  const browserInfo = detectBrowser();

  if (!browserInfo.isSupported || browserInfo.missingFeatures.length > 0) {
    showBrowserWarning(browserInfo);
  }

  return browserInfo;
}

/**
 * Feature detection for specific capabilities
 */
export const features = {
  /**
   * Check if drag and drop is supported
   */
  hasDragAndDrop(): boolean {
    return 'draggable' in document.createElement('div');
  },

  /**
   * Check if File API is supported
   */
  hasFileAPI(): boolean {
    return !!(window.File && window.FileReader && window.FileList);
  },

  /**
   * Check if touch events are supported
   */
  hasTouchSupport(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Check if service workers are supported
   */
  hasServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  },

  /**
   * Check if IndexedDB is supported
   */
  hasIndexedDB(): boolean {
    return 'indexedDB' in window;
  },
};
