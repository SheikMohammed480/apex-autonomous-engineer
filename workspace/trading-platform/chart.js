/**
 * Cyberpunk Canvas Chart Engine
 * Renders Candlesticks, Volume, Indicators (SMA, EMA, BB, RSI, MACD), Crosshair & Tooltips
 */

class TradingChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id ${canvasId} not found`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.candles = [];
        this.indicators = {
            sma: false,
            ema: false,
            bb: false,
            rsi: false,
            macd: false
        };

        this.mousePos = null;
        this.hoveredCandleIndex = -1;

        // Visual Colors
        this.colors = {
            bg: '#080210',
            grid: 'rgba(0, 255, 204, 0.07)',
            text: '#00ccff',
            bullish: '#00ff99',
            bullishAlpha: 'rgba(0, 255, 153, 0.3)',
            bearish: '#ff3366',
            bearishAlpha: 'rgba(255, 51, 102, 0.3)',
            sma: '#ffcc00',
            ema: '#00ccff',
            bbUpper: '#ff00ff',
            bbMiddle: '#ffcc00',
            bbLower: '#ff00ff',
            bbArea: 'rgba(255, 0, 255, 0.05)',
            rsiLine: '#cc33ff',
            macdLine: '#00ccff',
            macdSignal: '#ff9900',
            crosshair: 'rgba(0, 255, 204, 0.4)'
        };

        this.initEvents();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.render();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = null;
            this.hoveredCandleIndex = -1;
            this.render();
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 800;
        this.height = rect.height || 400;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        this.render();
    }

    setCandles(candles) {
        this.candles = candles || [];
        this.render();
    }

    toggleIndicator(name, isActive) {
        if (name in this.indicators) {
            this.indicators[name] = isActive !== undefined ? isActive : !this.indicators[name];
            this.render();
        }
    }

    render() {
        if (!this.ctx) return;

        const w = this.width;
        const h = this.height;

        // Clear canvas background
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, w, h);

        if (this.candles.length === 0) {
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '14px "Share Tech Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('WAITING FOR MARKET DATA STREAM...', w / 2, h / 2);
            return;
        }

        const paddingRight = 65;
        const paddingBottom = 20;
        const paddingTop = 25;
        
        const hasSubchart = this.indicators.rsi || this.indicators.macd;
        const mainChartHeight = hasSubchart ? (h - paddingTop - paddingBottom) * 0.70 : (h - paddingTop - paddingBottom);
        const subChartHeight = hasSubchart ? (h - paddingTop - paddingBottom) * 0.25 : 0;
        const subChartTop = paddingTop + mainChartHeight + (h - paddingTop - paddingBottom) * 0.05;

        const chartWidth = w - paddingRight;

        // Calculate Visible Candle Layout
        const candleCount = this.candles.length;
        const slotWidth = chartWidth / candleCount;
        const candleWidth = Math.max(1, slotWidth * 0.7);

        // Find Min and Max Prices for Main Chart
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        for (let i = 0; i < candleCount; i++) {
            const c = this.candles[i];
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
        }

        // Calculate Indicator values for overlay bounding
        let smaValues = [], emaValues = [], bbValues = { upper: [], middle: [], lower: [] };
        if (this.indicators.sma) smaValues = Indicators.calculateSMA(this.candles, 14);
        if (this.indicators.ema) emaValues = Indicators.calculateEMA(this.candles, 14);
        if (this.indicators.bb) bbValues = Indicators.calculateBollingerBands(this.candles, 20, 2);

        // Adjust bounds if BB active
        if (this.indicators.bb && bbValues.upper.length > 0) {
            bbValues.upper.forEach(val => { if (val && val > maxPrice) maxPrice = val; });
            bbValues.lower.forEach(val => { if (val && val < minPrice) minPrice = val; });
        }

        const priceMargin = (maxPrice - minPrice) * 0.05 || 1;
        maxPrice += priceMargin;
        minPrice -= priceMargin;

        const priceToY = (price) => {
            return paddingTop + mainChartHeight - ((price - minPrice) / (maxPrice - minPrice)) * mainChartHeight;
        };

        // Draw Grid Lines (Horizontal & Vertical)
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        const gridSteps = 6;
        for (let i = 0; i <= gridSteps; i++) {
            const y = paddingTop + (mainChartHeight / gridSteps) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(chartWidth, y);
            this.ctx.stroke();

            // Price Labels
            const priceVal = maxPrice - (i / gridSteps) * (maxPrice - minPrice);
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '10px "Share Tech Mono", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(priceVal.toFixed(2), chartWidth + 5, y + 3);
        }

        // Volume Overlay at bottom of main chart
        let maxVol = 0;
        this.candles.forEach(c => { if (c.volume > maxVol) maxVol = c.volume; });
        const volMaxHeight = mainChartHeight * 0.2;

        for (let i = 0; i < candleCount; i++) {
            const c = this.candles[i];
            const x = i * slotWidth + slotWidth / 2;
            const isBull = c.close >= c.open;
            const volH = (c.volume / (maxVol || 1)) * volMaxHeight;
            const volY = paddingTop + mainChartHeight - volH;

            this.ctx.fillStyle = isBull ? this.colors.bullishAlpha : this.colors.bearishAlpha;
            this.ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volH);
        }

        // Draw Bollinger Bands Shading & Lines
        if (this.indicators.bb && bbValues.upper.length > 0) {
            // Shading
            this.ctx.fillStyle = this.colors.bbArea;
            this.ctx.beginPath();
            let started = false;
            for (let i = 0; i < candleCount; i++) {
                if (bbValues.upper[i] !== null && bbValues.lower[i] !== null) {
                    const x = i * slotWidth + slotWidth / 2;
                    const yU = priceToY(bbValues.upper[i]);
                    if (!started) {
                        this.ctx.moveTo(x, yU);
                        started = true;
                    } else {
                        this.ctx.lineTo(x, yU);
                    }
                }
            }
            for (let i = candleCount - 1; i >= 0; i--) {
                if (bbValues.upper[i] !== null && bbValues.lower[i] !== null) {
                    const x = i * slotWidth + slotWidth / 2;
                    const yL = priceToY(bbValues.lower[i]);
                    this.ctx.lineTo(x, yL);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();

            // Upper Band
            this.drawLineSeries(bbValues.upper, slotWidth, priceToY, this.colors.bbUpper, 1, [3, 3]);
            // Middle Band
            this.drawLineSeries(bbValues.middle, slotWidth, priceToY, this.colors.bbMiddle, 1);
            // Lower Band
            this.drawLineSeries(bbValues.lower, slotWidth, priceToY, this.colors.bbLower, 1, [3, 3]);
        }

        // Draw SMA / EMA Overlays
        if (this.indicators.sma) {
            this.drawLineSeries(smaValues, slotWidth, priceToY, this.colors.sma, 1.5);
        }
        if (this.indicators.ema) {
            this.drawLineSeries(emaValues, slotWidth, priceToY, this.colors.ema, 1.5);
        }

        // Draw Candlesticks
        for (let i = 0; i < candleCount; i++) {
            const c = this.candles[i];
            const x = i * slotWidth + slotWidth / 2;
            const openY = priceToY(c.open);
            const closeY = priceToY(c.close);
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);
            const isBull = c.close >= c.open;

            const color = isBull ? this.colors.bullish : this.colors.bearish;

            // High/Low Wick
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, highY);
            this.ctx.lineTo(x, lowY);
            this.ctx.stroke();

            // Body
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));

            this.ctx.fillStyle = isBull ? '#0a291d' : '#2d0a14';
            this.ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }

        // Draw Active Subchart (RSI or MACD)
        if (hasSubchart) {
            // Divider Line
            this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
            this.ctx.beginPath();
            this.ctx.moveTo(0, subChartTop - 5);
            this.ctx.lineTo(chartWidth, subChartTop - 5);
            this.ctx.stroke();

            if (this.indicators.rsi) {
                this.renderRSI(slotWidth, subChartTop, subChartHeight, chartWidth);
            } else if (this.indicators.macd) {
                this.renderMACD(slotWidth, subChartTop, subChartHeight, chartWidth);
            }
        }

        // Mouse Hover & Crosshair logic
        if (this.mousePos && this.mousePos.x <= chartWidth) {
            const hoveredIndex = Math.floor(this.mousePos.x / slotWidth);
            if (hoveredIndex >= 0 && hoveredIndex < candleCount) {
                this.hoveredCandleIndex = hoveredIndex;
                const candle = this.candles[hoveredIndex];

                const snapX = hoveredIndex * slotWidth + slotWidth / 2;
                const snapY = this.mousePos.y;

                // Vertical Crosshair line
                this.ctx.strokeStyle = this.colors.crosshair;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.moveTo(snapX, paddingTop);
                this.ctx.lineTo(snapX, h - paddingBottom);
                this.ctx.stroke();

                // Horizontal Crosshair line
                this.ctx.beginPath();
                this.ctx.moveTo(0, snapY);
                this.ctx.lineTo(chartWidth, snapY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);

                // Draw Hover Price Badge on Y-axis
                if (snapY >= paddingTop && snapY <= paddingTop + mainChartHeight) {
                    const hoveredPrice = maxPrice - ((snapY - paddingTop) / mainChartHeight) * (maxPrice - minPrice);
                    this.ctx.fillStyle = '#00ffcc';
                    this.ctx.fillRect(chartWidth + 2, snapY - 9, 60, 18);
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 10px "Share Tech Mono", monospace';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(hoveredPrice.toFixed(2), chartWidth + 5, snapY + 3);
                }

                // Render Hover Tooltip Box
                this.renderTooltip(candle, hoveredIndex, snapX, snapY, smaValues, emaValues, bbValues);
            }
        }
    }

    drawLineSeries(dataArray, slotWidth, priceToYFn, color, width = 1, dash = []) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.setLineDash(dash);
        this.ctx.beginPath();
        let started = false;

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            if (val !== null && val !== undefined) {
                const x = i * slotWidth + slotWidth / 2;
                const y = priceToYFn(val);
                if (!started) {
                    this.ctx.moveTo(x, y);
                    started = true;
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    renderRSI(slotWidth, top, subHeight, chartWidth) {
        const rsiValues = Indicators.calculateRSI(this.candles, 14);

        // Subchart Title
        this.ctx.fillStyle = this.colors.rsiLine;
        this.ctx.font = 'bold 11px "Share Tech Mono", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('RSI (14)', 10, top + 12);

        // Oversold 30 & Overbought 70 reference lines
        const rsiToY = (val) => top + subHeight - (val / 100) * subHeight;

        this.ctx.strokeStyle = 'rgba(255, 51, 102, 0.4)';
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, rsiToY(70));
        this.ctx.lineTo(chartWidth, rsiToY(70));
        this.ctx.stroke();

        this.ctx.strokeStyle = 'rgba(0, 255, 153, 0.4)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, rsiToY(30));
        this.ctx.lineTo(chartWidth, rsiToY(30));
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Labels
        this.ctx.fillStyle = '#ff3366';
        this.ctx.fillText('70', chartWidth + 5, rsiToY(70) + 3);
        this.ctx.fillStyle = '#00ff99';
        this.ctx.fillText('30', chartWidth + 5, rsiToY(30) + 3);

        // RSI Line
        this.drawLineSeries(rsiValues, slotWidth, rsiToY, this.colors.rsiLine, 1.5);
    }

    renderMACD(slotWidth, top, subHeight, chartWidth) {
        const { macd, signal, histogram } = Indicators.calculateMACD(this.candles, 12, 26, 9);

        // Subchart Title
        this.ctx.fillStyle = this.colors.macdLine;
        this.ctx.font = 'bold 11px "Share Tech Mono", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('MACD (12, 26, 9)', 10, top + 12);

        let maxVal = 0.01;
        for (let i = 0; i < macd.length; i++) {
            if (macd[i] !== null) maxVal = Math.max(maxVal, Math.abs(macd[i]));
            if (signal[i] !== null) maxVal = Math.max(maxVal, Math.abs(signal[i]));
            if (histogram[i] !== null) maxVal = Math.max(maxVal, Math.abs(histogram[i]));
        }

        const macdToY = (val) => top + (subHeight / 2) - (val / (maxVal * 1.2)) * (subHeight / 2);
        const zeroY = macdToY(0);

        // Zero line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, zeroY);
        this.ctx.lineTo(chartWidth, zeroY);
        this.ctx.stroke();

        // Histogram Bars
        for (let i = 0; i < histogram.length; i++) {
            if (histogram[i] !== null) {
                const x = i * slotWidth + slotWidth / 2;
                const hY = macdToY(histogram[i]);
                const barWidth = Math.max(1, slotWidth * 0.6);
                this.ctx.fillStyle = histogram[i] >= 0 ? this.colors.bullishAlpha : this.colors.bearishAlpha;
                this.ctx.fillRect(x - barWidth / 2, Math.min(zeroY, hY), barWidth, Math.abs(hY - zeroY));
            }
        }

        // MACD & Signal Lines
        this.drawLineSeries(macd, slotWidth, macdToY, this.colors.macdLine, 1.5);
        this.drawLineSeries(signal, slotWidth, macdToY, this.colors.macdSignal, 1.5);
    }

    renderTooltip(candle, index, x, y, smaValues, emaValues, bbValues) {
        const boxW = 160;
        const boxH = 110;
        let boxX = x + 15;
        let boxY = y - 10;

        if (boxX + boxW > this.width - 60) boxX = x - boxW - 15;
        if (boxY + boxH > this.height) boxY = this.height - boxH - 10;
        if (boxY < 10) boxY = 10;

        this.ctx.fillStyle = 'rgba(10, 0, 25, 0.9)';
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        this.ctx.font = '11px "Share Tech Mono", monospace';
        this.ctx.textAlign = 'left';

        const dateStr = new Date(candle.time).toLocaleTimeString();
        this.ctx.fillStyle = '#00ccff';
        this.ctx.fillText(`TIME:  ${dateStr}`, boxX + 8, boxY + 16);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`OPEN:  $${candle.open.toFixed(2)}`, boxX + 8, boxY + 32);
        this.ctx.fillText(`HIGH:  $${candle.high.toFixed(2)}`, boxX + 8, boxY + 46);
        this.ctx.fillText(`LOW:   $${candle.low.toFixed(2)}`, boxX + 8, boxY + 60);

        const isBull = candle.close >= candle.open;
        this.ctx.fillStyle = isBull ? this.colors.bullish : this.colors.bearish;
        this.ctx.fillText(`CLOSE: $${candle.close.toFixed(2)}`, boxX + 8, boxY + 74);

        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(`VOL:   ${candle.volume.toFixed(1)}`, boxX + 8, boxY + 88);

        // Indicator Overlay Info in Tooltip
        let extraY = boxY + 102;
        if (this.indicators.sma && smaValues[index] !== null) {
            this.ctx.fillStyle = this.colors.sma;
            this.ctx.fillText(`SMA: $${smaValues[index].toFixed(2)}`, boxX + 8, extraY);
        }
    }
}
