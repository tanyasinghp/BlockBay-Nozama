/**
 * Validation utilities for Identity & Reputation service
 */

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate DID (Decentralized Identifier) format
 * Expected format: did:ethr:0x...
 */
export function validateDID(did: string): boolean {
  if (!did || typeof did !== 'string') {
    return false;
  }
  return /^did:ethr:0x[a-fA-F0-9]{40}$/.test(did);
}

/**
 * Validate rating value (1-5)
 */
export function validateRating(rating: number): boolean {
  return typeof rating === 'number' && rating >= 1 && rating <= 5 && Number.isInteger(rating);
}

/**
 * Validate reputation score (0-100)
 */
export function validateReputationScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.trim().slice(0, maxLength);
}

/**
 * Validate transaction hash format
 */
export function validateTxHash(txHash: string): boolean {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}
