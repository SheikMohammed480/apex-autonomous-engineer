/**
 * Cyberpunk Trading Platform - Main Application Controller
 * Coordinates MarketEngine, TradingChart, Portfolio, and Auto-Trading Bot
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Engines
    const chart = new TradingChart('tradingChart');
    const portfolio = new Portfolio(100000);

    // 2. State & History
    let currentSymbol = 'CYBER/USDT';
    let currentPrice = MarketEngine.getPrice();
    let prevPrice = currentPrice;
    let botActive = false;
    let candles = [];

    // Generate initial candle history (50 bars)
    let baseTime = Date.now() - (50 * 60 * 1000);
    let runningPrice = currentPrice * 0.95;
    for (let i = 0; i < 50; i++) {
        let open = runningPrice;
        let change = (Math.random() - 0.49) * 25;
        let close = open + change;
        let high = Math.max(open, close) + Math.random() * 15;
        let low = Math.min(open, close) - Math.random() * 15;
        let volume = Math.floor(Math.random() * 80) + 10;
        candles.push({
            time: baseTime + (i * 60 * 1000),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: volume
        });
        runningPrice = close;
    }
    chart.setCandles(candles);

    // 3. UI Element References
    const tickerBanner = document.getElementById('ticker-banner');
    const bidsList = document.getElementById('bids-list');
    const asksList = document.getElementById('asks-list');
    const balanceEl = document.getElementById('portfolio-balance');
    const equityEl = document.getElementById('portfolio-equity');
    const marginUsedEl = document.getElementById('portfolio-margin-used');
    const unrealizedPnlEl = document.getElementById('portfolio-unrealized-pnl');
    const realizedPnlEl = document.getElementById('portfolio-realized-pnl');
    const positionsTableBody = document.querySelector('#open-positions-table tbody');

    const orderTypeSelect = document.getElementById('orderType');
    const limitPriceGroup = document.getElementById('limitPriceGroup');
    const limitPriceInput = document.getElementById('limitPrice');
    const orderAmountInput = document.getElementById('orderAmount');
    const leverageSlider = document.getElementById('leverage');
    const leverageVal = document.getElementById('leverageVal');
    const buyBtn = document.getElementById('buyBtn');
    const sellBtn = document.getElementById('sellBtn');

    const toggleBotBtn = document.getElementById('toggleBotBtn');
    const botStatusEl = document.getElementById('botStatus');
    const botStrategySelect = document.getElementById('botStrategy');
    const botAmountInput = document.getElementById('botAmount');

    // 4. Indicator Toggle Buttons
    const indicatorMap = {
        'toggleRSI': 'rsi',
        'toggleMACD': 'macd',
        'toggleBB': 'bb',
        'toggleSMA': 'sma',
        'toggleEMA': 'ema'
    };
    Object.entries(indicatorMap).forEach(([btnId, indName]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                chart.toggleIndicator(indName);
            });
        }
    });

    // Leverage slider listener
    if (leverageSlider && leverageVal) {
        leverageSlider.addEventListener('input', (e) => {
            leverageVal.textContent = `${e.target.value}x`;
        });
    }

    // Order type listener (market vs limit)
    if (orderTypeSelect && limitPriceGroup) {
        orderTypeSelect.addEventListener('change', (e) => {
            limitPriceGroup.style.display = e.target.value === 'limit' ? 'block' : 'none';
            if (e.target.value === 'limit' && limitPriceInput) {
                limitPriceInput.value = currentPrice.toFixed(2);
            }
        });
    }

    // 5. Order Execution Handlers
    function executeTrade(side) {
        const amount = parseFloat(orderAmountInput.value) || 0.1;
        const leverage = parseInt(leverageSlider.value, 10) || 1;
        const orderType = orderTypeSelect ? orderTypeSelect.value : 'market';
        const price = orderType === 'limit' && limitPriceInput ? parseFloat(limitPriceInput.value) : currentPrice;

        try {
            const res = portfolio.openPosition({
                symbol: currentSymbol,
                type: side,
                amount: amount,
                price: price,
                leverage: leverage
            });
            if (res && res.error) {
                alert(res.error);
            } else {
                renderPortfolio();
            }
        } catch (err) {
            console.error('Trade execution failed:', err);
        }
    }

    if (buyBtn) buyBtn.addEventListener('click', () => executeTrade('buy'));
    if (sellBtn) sellBtn.addEventListener('click', () => executeTrade('sell'));

    // 6. Automated Trading Bot
    if (toggleBotBtn) {
        toggleBotBtn.addEventListener('click', () => {
            botActive = !botActive;
            if (botActive) {
                toggleBotBtn.textContent = 'Stop Bot';
                toggleBotBtn.classList.add('active');
                botStatusEl.textContent = 'Status: Active (Scanning Signals)';
                botStatusEl.style.color = '#00ff99';
            } else {
                toggleBotBtn.textContent = 'Start Bot';
                toggleBotBtn.classList.remove('active');
                botStatusEl.textContent = 'Status: Inactive';
                botStatusEl.style.color = '#ff3366';
            }
        });
    }

    function runBotLogic() {
        if (!botActive || candles.length < 15) return;
        const amount = parseFloat(botAmountInput.value) || 0.05;
        const strategy = botStrategySelect.value;

        if (strategy === 'rsi') {
            const rsiValues = Indicators.calculateRSI(candles, 14);
            const latestRsi = rsiValues[rsiValues.length - 1];
            if (latestRsi !== null) {
                if (latestRsi < 30) {
                    portfolio.openPosition({ symbol: currentSymbol, type: 'buy', amount, price: currentPrice, leverage: 5 });
                    renderPortfolio();
                } else if (latestRsi > 70) {
                    portfolio.openPosition({ symbol: currentSymbol, type: 'sell', amount, price: currentPrice, leverage: 5 });
                    renderPortfolio();
                }
            }
        }
    }

    // 7. Render Functions
    function renderOrderBook(book) {
        if (!bidsList || !asksList) return;
        bidsList.innerHTML = (book.bids || []).slice(0, 8).map(b => `
            <div class="order-row bid-row">
                <span class="price" style="color: #00ff99;">$${b.price.toFixed(2)}</span>
                <span class="size">${b.size}</span>
            </div>
        `).join('');

        asksList.innerHTML = (book.asks || []).slice(0, 8).map(a => `
            <div class="order-row ask-row">
                <span class="price" style="color: #ff3366;">$${a.price.toFixed(2)}</span>
                <span class="size">${a.size}</span>
            </div>
        `).join('');
    }

    function renderPortfolio() {
        portfolio.updatePositions(currentPrice);

        if (balanceEl) balanceEl.textContent = `$${portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (equityEl) equityEl.textContent = `$${portfolio.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (marginUsedEl) marginUsedEl.textContent = `$${portfolio.marginUsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const unpnl = portfolio.unrealizedPnl;
        if (unrealizedPnlEl) {
            unrealizedPnlEl.textContent = `${unpnl >= 0 ? '+' : ''}$${unpnl.toFixed(2)}`;
            unrealizedPnlEl.style.color = unpnl >= 0 ? '#00ff99' : '#ff3366';
        }

        if (realizedPnlEl) {
            const rpnl = portfolio.realizedPnl;
            realizedPnlEl.textContent = `${rpnl >= 0 ? '+' : ''}$${rpnl.toFixed(2)}`;
            realizedPnlEl.style.color = rpnl >= 0 ? '#00ff99' : '#ff3366';
        }

        // Render open positions table
        if (positionsTableBody) {
            positionsTableBody.innerHTML = portfolio.positions.map(p => `
                <tr>
                    <td><strong>${p.symbol}</strong></td>
                    <td style="color: ${p.type === 'buy' ? '#00ff99' : '#ff3366'};">${p.type.toUpperCase()} ${p.leverage}x</td>
                    <td>${p.amount}</td>
                    <td>$${p.entryPrice.toFixed(2)}</td>
                    <td>$${p.currentPrice.toFixed(2)}</td>
                    <td style="color: ${p.pnl >= 0 ? '#00ff99' : '#ff3366'};">${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}</td>
                    <td>
                        <button class="close-pos-btn" data-id="${p.id}" style="padding: 2px 8px; font-size: 11px; background: #ff3366; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Close
                        </button>
                    </td>
                </tr>
            `).join('');

            // Bind close buttons
            document.querySelectorAll('.close-pos-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.dataset.id, 10);
                    portfolio.closePosition(id, currentPrice);
                    renderPortfolio();
                });
            });
        }
    }

    // 8. Main Live Market Tick Loop (runs every 600ms)
    let tickCounter = 0;
    setInterval(() => {
        prevPrice = currentPrice;
        const marketData = MarketEngine.tick();
        currentPrice = marketData.price;
        tickCounter++;

        // Update ticker banner
        if (tickerBanner) {
            const diff = currentPrice - prevPrice;
            const diffPct = ((diff / prevPrice) * 100).toFixed(2);
            const color = diff >= 0 ? '#00ff99' : '#ff3366';
            const arrow = diff >= 0 ? '▲' : '▼';
            tickerBanner.innerHTML = `
                <div style="display: flex; gap: 24px; align-items: center; justify-content: center; width: 100%;">
                    <span><strong>CYBER/USDT</strong>: <span style="color: ${color}; font-size: 16px; font-weight: bold;">$${currentPrice.toFixed(2)} ${arrow} (${diffPct}%)</span></span>
                    <span>24h High: <strong style="color: #00ff99;">$${(currentPrice * 1.08).toFixed(2)}</strong></span>
                    <span>24h Low: <strong style="color: #ff3366;">$${(currentPrice * 0.92).toFixed(2)}</strong></span>
                    <span>24h Vol: <strong>14,892.4 BTC</strong></span>
                </div>
            `;
        }

        // Update live candle or create new candle every 15 ticks
        if (candles.length > 0) {
            let lastCandle = candles[candles.length - 1];
            if (tickCounter % 15 === 0) {
                // Spawn new candle
                candles.push({
                    time: Date.now(),
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice,
                    volume: Math.floor(Math.random() * 50) + 5
                });
                if (candles.length > 70) candles.shift();
            } else {
                // Update current candle
                lastCandle.close = currentPrice;
                lastCandle.high = Math.max(lastCandle.high, currentPrice);
                lastCandle.low = Math.min(lastCandle.low, currentPrice);
                lastCandle.volume += 1;
            }
            chart.setCandles(candles);
        }

        // Update Order Book
        renderOrderBook(marketData.orderBook);

        // Update Portfolio & Positions
        renderPortfolio();

        // Run Bot Check
        runBotLogic();

    }, 600);

    // Initial renders
    renderPortfolio();
    renderOrderBook(MarketEngine.getOrderBook());
});
