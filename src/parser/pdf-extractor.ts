/**
 * PDF Text Extraction Utility
 *
 * Extracts raw text from Hourglass PDF exports
 */

import fs from 'node:fs';
import path from 'node:path';
// pdf-parse doesn't have ESM exports, use createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export interface PDFExtractionResult {
  text: string;
  pages: number;
  filename: string;
}

/**
 * Extract text content from a PDF file
 */
export async function extractPDFText(filePath: string): Promise<PDFExtractionResult> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PDF file not found: ${absolutePath}`);
  }

  const dataBuffer = fs.readFileSync(absolutePath);
  const data = await pdf(dataBuffer);

  return {
    text: data.text,
    pages: data.numpages,
    filename: path.basename(filePath),
  };
}

/**
 * Extract text from multiple PDF files
 */
export async function extractMultiplePDFs(
  filePaths: string[]
): Promise<PDFExtractionResult[]> {
  const results: PDFExtractionResult[] = [];

  for (const filePath of filePaths) {
    const result = await extractPDFText(filePath);
    results.push(result);
  }

  return results;
}

/**
 * Determine if a PDF is midweek or weekend based on content
 */
export function detectMeetingType(text: string): 'midweek' | 'weekend' | 'unknown' {
  const lowerText = text.toLowerCase();

  // Midweek indicators
  if (
    lowerText.includes('midweek meeting') ||
    lowerText.includes('treasures from god') ||
    lowerText.includes('apply yourself') ||
    lowerText.includes('living as christians') ||
    lowerText.includes('pag-aaral ng kongregasyon') ||
    lowerText.includes('espirituwal na hiyas')
  ) {
    return 'midweek';
  }

  // Weekend indicators
  if (
    lowerText.includes('weekend meeting') ||
    lowerText.includes('watchtower reader') ||
    lowerText.includes('public talk') ||
    lowerText.includes('hospitality')
  ) {
    return 'weekend';
  }

  return 'unknown';
}
