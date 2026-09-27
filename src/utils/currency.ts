import { CurrencyCode, ExchangeRate } from '../types/finance';

export const EXCHANGE_RATES: Record<CurrencyCode, ExchangeRate> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', rateAgainstUSD: 1.0 },
  KHR: { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', rateAgainstUSD: 4065 },
};

/**
 * Converts an amount from source currency to USD base
 */
export function convertToUSD(amount: number, sourceCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[sourceCurrency]?.rateAgainstUSD || 1.0;
  return amount / rate;
}

/**
 * Converts an amount from USD base to target display currency
 */
export function convertFromUSD(usdAmount: number, targetCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[targetCurrency]?.rateAgainstUSD || 1.0;
  return usdAmount * rate;
}

/**
 * Converts between any two arbitrary currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  const inUSD = convertToUSD(amount, fromCurrency);
  return convertFromUSD(inUSD, toCurrency);
}

/**
 * Formats a monetary amount into a clean currency string with tabular layout
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  showCode: boolean = false
): string {
  const rateInfo = EXCHANGE_RATES[currencyCode] || EXCHANGE_RATES.USD;
  const isZeroDecimals = currencyCode === 'KHR';
  
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isZeroDecimals ? 0 : 2,
    maximumFractionDigits: isZeroDecimals ? 0 : 2,
  }).format(amount);

  if (showCode) {
    return `${rateInfo.symbol}${formattedNumber} ${currencyCode}`;
  }
  return `${rateInfo.symbol}${formattedNumber}`;
}
