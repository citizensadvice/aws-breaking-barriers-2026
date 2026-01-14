/**
 * PowerPoint Conversion Service
 * Requirements: 1.3 - Convert .pptx to PDF using LibreOffice Lambda layer, store in S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConversionContext, ConversionResult } from './types';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET_NAME || '';

// LibreOffice binary path (when using Lambda layer)
const LIBREOFFICE_PATH = process.env.LIBREOFFICE_PATH || '/opt/libreoffice/program/soffice';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Download file from S3 to local temp directory
 */
async function downloadFromS3(s3Key: string): Promise<string> {
  const tempDir = os.tmpdir();
  const fileName = path.basename(s3Key);
  const localPath = path.join(tempDir, fileName);

  const response = await s3Client.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  }));

  if (!response.Body) {
    throw new Error('S3_DOWNLOAD_FAILED: Empty response body from S3');
  }

  const bodyContents = await response.Body.transformToByteArray();
  fs.writeFileSync(localPath, Buffer.from(bodyContents));

  return localPath;
}

/**
 * Convert PowerPoint to PDF using LibreOffice
 */
function convertToPdf(inputPath: string): string {
  const outputDir = os.tmpdir();
  const inputFileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${inputFileName}.pdf`);

  try {
    // LibreOffice command for headless PDF conversion
    const command = `${LIBREOFFICE_PATH} --headless --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --norestore --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    
    console.log(`Executing LibreOffice conversion: ${command}`);
    
    execSync(command, {
      timeout: 60000, // 60 second timeout
      stdio: 'pipe',
      env: {
        ...process.env,
        HOME: '/tmp',
        FONTCONFIG_PATH: '/opt/fonts',
      },
    });

    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('POWERPOINT_CONVERSION_FAILED: Output PDF file not created');
    }

    return outputPath;
  } catch (error) {
    console.error('LibreOffice conversion error:', error);
    throw new Error(`POWERPOINT_CONVERSION_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload converted PDF to S3
 */
async function uploadToS3(localPath: string, s3Key: string): Promise<void> {
  const fileContent = fs.readFileSync(localPath);

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'application/pdf',
  }));
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(...filePaths: string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }
}

/**
 * Generate S3 key for converted document
 */
function generateConvertedS3Key(
  organizationId: string,
  documentId: string,
  originalFileName?: string
): string {
  const fileName = originalFileName
    ? originalFileName.replace(/\.(ppt|pptx)$/i, '.pdf')
    : `${documentId}.pdf`;
  return `${organizationId}/${documentId}/${fileName}`;
}

/**
 * Convert PowerPoint document to PDF and store in S3
 * Requirements: 1.3
 */
export async function convertPowerPoint(context: ConversionContext): Promise<ConversionResult> {
  const { documentId, s3Key, organizationId, fileName } = context;

  if (!s3Key) {
    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage: 'S3 key is required for PowerPoint conversion',
    };
  }

  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Download PowerPoint from S3
    console.log(`Downloading PowerPoint from S3: ${s3Key}`);
    inputPath = await downloadFromS3(s3Key);

    // Convert to PDF using LibreOffice
    console.log(`Converting PowerPoint to PDF: ${inputPath}`);
    outputPath = convertToPdf(inputPath);

    // Generate S3 key for converted file
    const convertedS3Key = generateConvertedS3Key(organizationId, documentId, fileName);

    // Upload converted PDF to S3
    console.log(`Uploading converted PDF to S3: ${convertedS3Key}`);
    await uploadToS3(outputPath, convertedS3Key);

    return {
      documentId,
      convertedS3Key,
      status: 'completed',
    };
  } catch (error) {
    console.error('PowerPoint conversion error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error during conversion';

    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage,
    };
  } finally {
    // Clean up temporary files
    if (inputPath) cleanupTempFiles(inputPath);
    if (outputPath) cleanupTempFiles(outputPath);
  }
}

/**
 * Check if LibreOffice is available
 */
export function isLibreOfficeAvailable(): boolean {
  try {
    execSync(`${LIBREOFFICE_PATH} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate PowerPoint file extension
 */
export function isPowerPointFile(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return extension === '.ppt' || extension === '.pptx';
}
