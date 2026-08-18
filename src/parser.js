/**
 * parser.js
 * 
 * Deterministic text extraction parser for NutriVision commodity documents.
 * Extracts: Product Name, Batch Number, Expiration Date, Quantity.
 */

// Helper to normalize OCR text (removes common noise, trims lines)
export function normalizeText(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

export function parseProductName(text) {
  // Regex looks for "Product [Name]:", "Item:", "Commodity:" followed by any text
  const match = text.match(/(?:Product\s*(?:Name)?|Item|Commodity)\s*[:;-]\s*(.+)/i);
  if (match) return match[1].trim();

  // Fallback: If no label is found, check if there's any text at all
  // Often, the first line of a cropped product name is just the name itself
  const lines = text.split('\n');
  if (lines.length > 0 && !lines[0].includes(':')) {
    return lines[0].trim();
  }
  return null;
}

export function parseBatchNumber(text) {
  // Matches "Batch [No]:", "Lot [No]:", "B.No:" followed by alphanumeric codes
  const match = text.match(/(?:Batch\s*(?:No|Number)?|Lot\s*(?:No|Number)?|B\.?No)\s*[:;-]\s*([a-zA-Z0-9-]+)/i);
  if (match) return match[1].toUpperCase().trim();
  
  // Fallback: search for alphanumeric pattern of 4-10 characters if no label
  const fallbackMatch = text.match(/\b([A-Z0-9-]{4,12})\b/);
  if (fallbackMatch) return fallbackMatch[1];

  return null;
}

export function parseExpirationDate(text) {
  // Normalise O to 0 in date-like fields to handle OCR error (e.g. 1O-2027 -> 10-2027)
  const cleanText = text.replace(/([0-9])O/g, '$10').replace(/O([0-9])/g, '0$1');

  // Matches MM/YYYY, MM-YYYY, MM/DD/YYYY, MM-DD-YYYY
  const dateRegex = /(\d{1,2})[/-](\d{1,2}|20\d{2})\b/;
  const longDateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/;

  // Find date with label "EXP", "Expiry", "Expiration"
  const labelMatch = cleanText.match(/(?:Exp(?:iry|irations?)?\s*(?:Date)?)\s*[:;-]\s*([0-9/-]+)/i);
  if (labelMatch) {
    const rawDate = labelMatch[1].trim();
    if (rawDate.match(/[0-9/-]{5,10}/)) return rawDate;
  }

  // Fallback: scan text for any date patterns
  const longMatch = cleanText.match(longDateRegex);
  if (longMatch) return longMatch[0];

  const shortMatch = cleanText.match(dateRegex);
  if (shortMatch) return shortMatch[0];

  return null;
}

export function parseQuantity(text) {
  // Replace letter O/o with 0, I/l/i with 1 inside digits context
  const labelMatch = text.match(/(?:Qty|Quantity|Count|QTY)\s*[:;-]\s*([0-9olI]+)/i);
  if (labelMatch) {
    const rawQty = labelMatch[1]
      .replace(/[oO]/g, '0')
      .replace(/[lIi]/g, '1');
    const qty = parseInt(rawQty, 10);
    if (!isNaN(qty)) return qty;
  }

  // Fallback: find any stand-alone number in the text
  const numbers = text.match(/\b(\d+)\b/g);
  if (numbers) {
    // If only one number exists in the whole crop, it's likely the quantity
    if (numbers.length === 1) return parseInt(numbers[0], 10);
  }

  return null;
}

/**
 * Main parser pipeline
 */
export function parseOCRResult(rawText) {
  const normalized = normalizeText(rawText);
  return {
    productName: parseProductName(normalized),
    batchNumber: parseBatchNumber(normalized),
    expirationDate: parseExpirationDate(normalized),
    quantity: parseQuantity(normalized)
  };
}
