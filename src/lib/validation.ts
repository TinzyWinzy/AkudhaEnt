export function validatePositiveNumber(value: number, label: string): string | null {
  if (isNaN(value)) return `${label}: must be a valid number.`;
  if (value <= 0) return `${label}: must be a positive number.`;
  return null;
}

export function validateNonNegativeNumber(value: number, label: string): string | null {
  if (isNaN(value)) return `${label}: must be a valid number.`;
  if (value < 0) return `${label}: cannot be negative.`;
  return null;
}

export function validateRequiredString(value: string | undefined, label: string): string | null {
  if (!value || value.trim().length === 0) return `${label}: is required.`;
  return null;
}

export function validateVaultLimit(requested: number, available: number, label: string): string | null {
  if (requested > available) {
    const shortfall = requested - available;
    return `VAULT LIMIT VIOLATION: ${label} requires ${requested} units, but current stock is ${available} units. Deficiency: ${shortfall} units.`;
  }
  return null;
}
