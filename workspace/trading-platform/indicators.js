/**
 * Technical Indicators Engine for Cyberpunk Trading Platform
 * Supports: SMA, EMA, RSI, MACD, Bollinger Bands
 */

const Indicators = (function() {
    /**
     * Extracts close prices array from candle objects or accepts raw array of numbers
     * @param {Array<Object|Number>} data - Array of candles {close} or numbers
     * @returns {Array<Number>}
     */
    function extractPrices(data) {
        if (!Array.isArray(data) || data.length === 0) return [];
        if (typeof data[0] === 'number') return data;
        return data.map(d => (d && d.close !== undefined) ? d.close : Number(d));
    }

    /**
     * Simple Moving Average (SMA)
     * @param {Array} data - Candle array or price array
     * @param {Number} period - Window size
     * @returns {Array<Number|null>}
     */
    function calculateSMA(data, period = 14) {
        const prices = extractPrices(data);
        const result = new Array(prices.length).fill(null);
        if (prices.length < period || period <= 0) return result;

        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        result[period - 1] = sum / period;

        for (let i = period; i < prices.length; i++) {
            sum += prices[i] - prices[i - period];
            result[i] = sum / period;
        }

        return result;
    }

    /**
     * Exponential Moving Average (EMA)
     * @param {Array} data - Candle array or price array
     * @param {Number} period - Smoothing period
     * @returns {Array<Number|null>}
     */
    function calculateEMA(data, period = 14) {
        const prices = extractPrices(data);
        const result = new Array(prices.length).fill(null);
        if (prices.length < period || period <= 0) return result;

        const k = 2 / (period + 1);

        // First EMA value is SMA of first 'period' elements
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        let prevEma = sum / period;
        result[period - 1] = prevEma;

        for (let i = period; i < prices.length; i++) {
            const ema = (prices[i] * k) + (prevEma * (1 - k));
            result[i] = ema;
            prevEma = ema;
        }

        return result;
    }

    /**
     * Relative Strength Index (RSI) using Wilder's Smoothing
     * @param {Array} data - Candle array or price array
     * @param {Number} period - RSI period (default 14)
     * @returns {Array<Number|null>}
     */
    function calculateRSI(data, period = 14) {
        const prices = extractPrices(data);
        const result = new Array(prices.length).fill(null);
        if (prices.length <= period || period <= 0) return result;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change >= 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        if (avgLoss === 0) {
            result[period] = 100;
        } else {
            const rs = avgGain / avgLoss;
            result[period] = 100 - (100 / (1 + rs));
        }

        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            if (avgLoss === 0) {
                result[i] = 100;
            } else {
                const rs = avgGain / avgLoss;
                result[i] = 100 - (100 / (1 + rs));
            }
        }

        return result;
    }

    /**
     * Moving Average Convergence Divergence (MACD)
     * @param {Array} data - Candle array or price array
     * @param {Number} fastPeriod - Fast EMA period (default 12)
     * @param {Number} slowPeriod - Slow EMA period (default 26)
     * @param {Number} signalPeriod - Signal line EMA period (default 9)
     * @returns {Object} { macd: Array, signal: Array, histogram: Array }
     */
    function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const prices = extractPrices(data);
        const len = prices.length;
        const macdLine = new Array(len).fill(null);
        const signalLine = new Array(len).fill(null);
        const histogram = new Array(len).fill(null);

        if (len < slowPeriod) {
            return { macd: macdLine, signal: signalLine, histogram };
        }

        const fastEma = calculateEMA(prices, fastPeriod);
        const slowEma = calculateEMA(prices, slowPeriod);

        for (let i = 0; i < len; i++) {
            if (fastEma[i] !== null && slowEma[i] !== null) {
                macdLine[i] = fastEma[i] - slowEma[i];
            }
        }

        // Calculate Signal line as EMA of MACD values
        const validMacdValues = [];
        const validIndices = [];
        for (let i = 0; i < len; i++) {
            if (macdLine[i] !== null) {
                validMacdValues.push(macdLine[i]);
                validIndices.push(i);
            }
        }

        if (validMacdValues.length >= signalPeriod) {
            const macdSignalEma = calculateEMA(validMacdValues, signalPeriod);
            for (let k = 0; k < validMacdValues.length; k++) {
                const origIndex = validIndices[k];
                if (macdSignalEma[k] !== null) {
                    signalLine[origIndex] = macdSignalEma[k];
                    histogram[origIndex] = macdLine[origIndex] - signalLine[origIndex];
                }
            }
        }

        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    /**
     * Bollinger Bands
     * @param {Array} data - Candle array or price array
     * @param {Number} period - Moving average window (default 20)
     * @param {Number} stdDevMult - Standard deviation multiplier (default 2)
     * @returns {Object} { upper: Array, middle: Array, lower: Array }
     */
    function calculateBollingerBands(data, period = 20, stdDevMult = 2) {
        const prices = extractPrices(data);
        const len = prices.length;
        const upper = new Array(len).fill(null);
        const middle = calculateSMA(prices, period);
        const lower = new Array(len).fill(null);

        for (let i = period - 1; i < len; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = middle[i];
            
            const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
            const stdDev = Math.sqrt(variance);

            upper[i] = mean + (stdDev * stdDevMult);
            lower[i] = mean - (stdDev * stdDevMult);
        }

        return {
            upper,
            middle,
            lower
        };
    }

    return {
        calculateSMA,
        calculateEMA,
        calculateRSI,
        calculateMACD,
        calculateBollingerBands
    };
})();
