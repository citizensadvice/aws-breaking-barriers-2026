/**
 * Web Content Service
 * Fetches and processes web pages (HTML) and PDF URLs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET_NAME || '';

export interface WebContentResult {
  content: Buffer;
  contentType: 'html' | 'pdf';
  title?: string;
}

/**
 * Fetch content from a web URL
 * Supports HTML pages and direct PDF links
 */
export async function fetchWebContent(url: string): Promise<WebContentResult> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DocumentIngestion/1.0)',
      'Accept': 'text/html,application/pdf,*/*',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  const content = Buffer.from(arrayBuffer);

  // Check if it's a PDF
  if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
    return { content, contentType: 'pdf' };
  }

  // Otherwise treat as HTML
  const htmlContent = content.toString('utf-8');
  const title = extractTitle(htmlContent);
  const textContent = extractTextFromHtml(htmlContent);
  
  return {
    content: Buffer.from(textContent, 'utf-8'),
    contentType: 'html',
    title,
  };
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | undefined {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : undefined;
}

/**
 * Extract text content from HTML
 * Strips tags and cleans up whitespace
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  
  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  
  return result;
}

/**
 * Validate web URL
 */
export function validateWebUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // Block Google Docs URLs (handled separately)
    if (parsedUrl.hostname === 'docs.google.com') {
      return { isValid: false, error: 'Use googleDocsUrl field for Google Docs links' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Check if URL is a Google Docs URL
 */
export function isGoogleDocsUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'docs.google.com';
  } catch {
    return false;
  }
}
