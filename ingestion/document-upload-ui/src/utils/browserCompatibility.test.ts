import { detectBrowser, features } from './browserCompatibility';

describe('Browser Compatibility Utilities', () => {
  describe('detectBrowser', () => {
    it('should detect browser information', () => {
      const browserInfo = detectBrowser();
      
      expect(browserInfo).toHaveProperty('name');
      expect(browserInfo).toHaveProperty('version');
      expect(browserInfo).toHaveProperty('isSupported');
      expect(browserInfo).toHaveProperty('missingFeatures');
      expect(Array.isArray(browserInfo.missingFeatures)).toBe(true);
    });

    it('should detect supported browser in test environment', () => {
      const browserInfo = detectBrowser();
      
      // In test environment (jsdom), browser detection may return 'unknown'
      // but should still provide valid structure
      expect(typeof browserInfo.name).toBe('string');
      expect(typeof browserInfo.version).toBe('number');
      expect(typeof browserInfo.isSupported).toBe('boolean');
    });
  });

  describe('features', () => {
    it('should check for File API support', () => {
      const hasFileAPI = features.hasFileAPI();
      expect(typeof hasFileAPI).toBe('boolean');
    });

    it('should check for drag and drop support', () => {
      const hasDragAndDrop = features.hasDragAndDrop();
      expect(typeof hasDragAndDrop).toBe('boolean');
    });

    it('should check for touch support', () => {
      const hasTouchSupport = features.hasTouchSupport();
      expect(typeof hasTouchSupport).toBe('boolean');
    });

    it('should check for service worker support', () => {
      const hasServiceWorker = features.hasServiceWorker();
      expect(typeof hasServiceWorker).toBe('boolean');
    });

    it('should check for IndexedDB support', () => {
      const hasIndexedDB = features.hasIndexedDB();
      expect(typeof hasIndexedDB).toBe('boolean');
    });
  });

  describe('Feature Detection', () => {
    it('should detect File API in test environment', () => {
      // jsdom provides File API
      expect(features.hasFileAPI()).toBe(true);
    });

    it('should detect drag and drop capability', () => {
      const element = document.createElement('div');
      const hasDraggable = 'draggable' in element;
      expect(features.hasDragAndDrop()).toBe(hasDraggable);
    });
  });
});
