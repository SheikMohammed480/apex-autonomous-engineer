/**
 * Cyberpunk Portfolio & Risk Management System
 * Handles balance, position tracking, margin, unrealized/realized PnL,
 * limit orders, and liquidation engine.
 */

class Portfolio {
    constructor(initialBalance = 100000) {
        this.balance = initialBalance;
        this.realizedPnl = 0;
        this.positions = [];
        this.limitOrders = [];
        this.nextPositionId = 1;
        this.nextOrderId = 1;

        // Callbacks
        this.onLiquidation = null;
        this.onOrderFilled = null;
    }

    /**
     * Calculate total margin used across open positions
     */
    get marginUsed() {
        return this.positions.reduce((sum, pos) => sum + pos.margin, 0);
    }

    /**
     * Calculate total unrealized P&L
     */
    get unrealizedPnl() {
        return this.positions.reduce((sum, pos) => sum + pos.pnl, 0);
    }

    /**
     * Calculate total account equity
     */
    get equity() {
        return this.balance + this.unrealizedPnl;
    }

    /**
     * Open a new market or limit position
     */
    openPosition({ symbol = 'CYBER/USDT', type, amount, price, leverage = 1 }) {
        amount = parseFloat(amount);
        price = parseFloat(price);
        leverage = parseInt(leverage, 10);

        if (isNaN(amount) || amount <= 0) {
            return { success: false, reason: 'Invalid amount.' };
        }
        if (isNaN(price) || price <= 0) {
            return { success: false, reason: 'Invalid price.' };
        }

        const positionValue = price * amount;
        const requiredMargin = positionValue / leverage;

        // Free margin check
        const freeMargin = this.equity - this.marginUsed;
        if (requiredMargin > freeMargin) {
            return {
                success: false,
                reason: `Insufficient margin! Required: $${requiredMargin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`
            };
        }

        // Calculate Liquidation Price
        // Long: Liq = Entry * (1 - 1 / Leverage)
        // Short: Liq = Entry * (1 + 1 / Leverage)
        let liquidationPrice;
        if (type.toUpperCase() === 'LONG' || type.toUpperCase() === 'BUY') {
            type = 'LONG';
            liquidationPrice = price * (1 - 0.95 / leverage); // 95% maintenance margin
        } else {
            type = 'SHORT';
            liquidationPrice = price * (1 + 0.95 / leverage);
        }

        const position = {
            id: `POS-${this.nextPositionId++}`,
            symbol,
            type,
            amount,
            entryPrice: price,
            currentPrice: price,
            leverage,
            margin: requiredMargin,
            liquidationPrice: Math.max(0.01, liquidationPrice),
            pnl: 0,
            pnlPercent: 0,
            timestamp: Date.now()
        };

        this.positions.push(position);
        this.renderUI();
        return { success: true, position };
    }

    /**
     * Place a pending Limit Order
     */
    addLimitOrder({ symbol = 'CYBER/USDT', type, amount, price, leverage = 1 }) {
        amount = parseFloat(amount);
        price = parseFloat(price);
        leverage = parseInt(leverage, 10);

        const requiredMargin = (price * amount) / leverage;
        const freeMargin = this.equity - this.marginUsed;

        if (requiredMargin > freeMargin) {
            return {
                success: false,
                reason: `Insufficient margin for limit order! Needed: $${requiredMargin.toFixed(2)}`
            };
        }

        const order = {
            id: `ORD-${this.nextOrderId++}`,
            symbol,
            type: type.toUpperCase(), // BUY or SELL
            amount,
            price,
            leverage,
            margin: requiredMargin,
            timestamp: Date.now()
        };

        this.limitOrders.push(order);
        this.renderUI();
        return { success: true, order };
    }

    /**
     * Cancel limit order by ID
     */
    cancelLimitOrder(orderId) {
        const idx = this.limitOrders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            const removed = this.limitOrders.splice(idx, 1)[0];
            this.renderUI();
            return { success: true, order: removed };
        }
        return { success: false, reason: 'Order not found' };
    }

    /**
     * Close position by ID
     */
    closePosition(positionId, currentPrice) {
        const index = this.positions.findIndex(p => p.id === positionId);
        if (index === -1) return { success: false, reason: 'Position not found' };

        const pos = this.positions[index];
        const closePrice = currentPrice || pos.currentPrice;
        
        let pnl = 0;
        if (pos.type === 'LONG') {
            pnl = (closePrice - pos.entryPrice) * pos.amount;
        } else {
            pnl = (pos.entryPrice - closePrice) * pos.amount;
        }

        this.balance += pnl;
        this.realizedPnl += pnl;
        this.positions.splice(index, 1);
        this.renderUI();

        return { success: true, pnl, closedPosition: pos };
    }

    /**
     * Update open positions and pending limit orders on market price updates
     */
    updateMarketPrice(currentPrice) {
        const liquidated = [];

        // Update PnL & Check Liquidations
        for (let i = this.positions.length - 1; i >= 0; i--) {
            const pos = this.positions[i];
            pos.currentPrice = currentPrice;

            if (pos.type === 'LONG') {
                pos.pnl = (currentPrice - pos.entryPrice) * pos.amount;
            } else {
                pos.pnl = (pos.entryPrice - currentPrice) * pos.amount;
            }
            pos.pnlPercent = (pos.pnl / pos.margin) * 100;

            // Liquidation logic
            let isLiquidated = false;
            if (pos.type === 'LONG' && currentPrice <= pos.liquidationPrice) {
                isLiquidated = true;
            } else if (pos.type === 'SHORT' && currentPrice >= pos.liquidationPrice) {
                isLiquidated = true;
            }

            if (isLiquidated) {
                const loss = -pos.margin; // Total loss of margin
                this.balance += loss;
                this.realizedPnl += loss;
                liquidated.push({ ...pos, finalLoss: loss });
                this.positions.splice(i, 1);

                if (this.onLiquidation) {
                    this.onLiquidation(pos);
                }
            }
        }

        // Check Limit Orders execution
        for (let i = this.limitOrders.length - 1; i >= 0; i--) {
            const ord = this.limitOrders[i];
            let triggered = false;

            if (ord.type === 'BUY' && currentPrice <= ord.price) {
                triggered = true;
            } else if (ord.type === 'SELL' && currentPrice >= ord.price) {
                triggered = true;
            }

            if (triggered) {
                this.limitOrders.splice(i, 1);
                const res = this.openPosition({
                    symbol: ord.symbol,
                    type: ord.type === 'BUY' ? 'LONG' : 'SHORT',
                    amount: ord.amount,
                    price: currentPrice,
                    leverage: ord.leverage
                });
                if (res.success && this.onOrderFilled) {
                    this.onOrderFilled(ord, res.position);
                }
            }
        }

        this.renderUI();
        return liquidated;
    }

    /**
     * Render portfolio summary and positions table to DOM
     */
    renderUI() {
        // Render Summary
        const balanceEl = document.getElementById('portfolio-balance');
        const equityEl = document.getElementById('portfolio-equity');
        const marginEl = document.getElementById('portfolio-margin-used');
        const unrealizedEl = document.getElementById('portfolio-unrealized-pnl');
        const realizedEl = document.getElementById('portfolio-realized-pnl');

        const formatUSD = (val) => {
            const prefix = val < 0 ? '-$' : '$';
            return prefix + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        if (balanceEl) balanceEl.textContent = formatUSD(this.balance);
        if (equityEl) equityEl.textContent = formatUSD(this.equity);
        if (marginEl) marginEl.textContent = formatUSD(this.marginUsed);

        if (unrealizedEl) {
            const uPnl = this.unrealizedPnl;
            unrealizedEl.textContent = formatUSD(uPnl);
            unrealizedEl.style.color = uPnl >= 0 ? '#00ff99' : '#ff3366';
            unrealizedEl.style.textShadow = uPnl >= 0 ? '0 0 10px rgba(0,255,153,0.5)' : '0 0 10px rgba(255,51,102,0.5)';
        }

        if (realizedEl) {
            const rPnl = this.realizedPnl;
            realizedEl.textContent = formatUSD(rPnl);
            realizedEl.style.color = rPnl >= 0 ? '#00ff99' : '#ff3366';
            realizedEl.style.textShadow = rPnl >= 0 ? '0 0 10px rgba(0,255,153,0.5)' : '0 0 10px rgba(255,51,102,0.5)';
        }

        // Render Positions Table
        const table = document.getElementById('positions-table');
        if (!table) return;

        let tbody = table.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            table.appendChild(tbody);
        }

        if (this.positions.length === 0 && this.limitOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #667799; padding: 20px;">No open positions or pending orders</td></tr>`;
            return;
        }

        let html = '';

        // Open Positions
        this.positions.forEach(pos => {
            const pnlColor = pos.pnl >= 0 ? '#00ff99' : '#ff3366';
            const badgeClass = pos.type === 'LONG' ? 'long-badge' : 'short-badge';
            
            html += `
                <tr class="position-row">
                    <td><strong>${pos.symbol}</strong> <span class="lev-tag">${pos.leverage}x</span></td>
                    <td><span class="${badgeClass}">${pos.type}</span></td>
                    <td>${pos.amount.toFixed(4)}</td>
                    <td>$${pos.entryPrice.toFixed(2)}</td>
                    <td>$${pos.currentPrice.toFixed(2)}</td>
                    <td style="color: ${pnlColor}; font-weight: bold;">
                        ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)} (${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(1)}%)
                    </td>
                    <td style="color: #ff9900;">$${pos.liquidationPrice.toFixed(2)}</td>
                    <td>
                        <button class="close-btn" onclick="window.appPortfolio.closePosition('${pos.id}')">Close</button>
                    </td>
                </tr>
            `;
        });

        // Limit Orders
        this.limitOrders.forEach(ord => {
            html += `
                <tr class="limit-order-row" style="opacity: 0.8; font-style: italic;">
                    <td><strong>${ord.symbol}</strong> <span class="lev-tag">${ord.leverage}x</span></td>
                    <td><span class="limit-badge">${ord.type} LIMIT</span></td>
                    <td>${ord.amount.toFixed(4)}</td>
                    <td>$${ord.price.toFixed(2)} (Target)</td>
                    <td>-</td>
                    <td style="color: #00ccff;">PENDING</td>
                    <td>-</td>
                    <td>
                        <button class="cancel-btn" onclick="window.appPortfolio.cancelLimitOrder('${ord.id}')">Cancel</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }
}
