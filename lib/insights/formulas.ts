// Parent: REQ-0031

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safePercentage(numerator: number, denominator: number): number {
  return denominator > 0 ? round((100 * numerator) / denominator, 1) : 0;
}

export function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? round(numerator / denominator, 2) : 0;
}
