
const MarketEngine = (function() {
    let price = 10000; // Initial price
    let volatility = 0.0001; // Daily volatility
    let drift = 0.00001; // Daily drift
    let orderBook = {
        bids: [],
        asks: []
    };
    const MAX_ORDER_BOOK_DEPTH = 50;
    const MIN_SPREAD = 0.5; // Minimum spread
    const MAX_SPREAD = 5.0; // Maximum spread
    const LIQUIDITY_FACTOR = 0.001; // How much volume affects price

    function generateGeometricBrownianMotionPrice() {
        const dt = 1 / (24 * 60 * 60); // Time step for 1 second
        const shock = volatility * Math.sqrt(dt) * gaussianRandom();
        const trend = drift * dt;
        price *= (1 + trend + shock);
        return price;
    }

    function gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num;
    }

    function generateOrderBook() {
        const currentPrice = price;
        const spread = MIN_SPREAD + Math.random() * (MAX_SPREAD - MIN_SPREAD);
        const bidPrice = currentPrice - spread / 2;
        const askPrice = currentPrice + spread / 2;

        orderBook.bids = [];
        orderBook.asks = [];

        // Generate bids
        for (let i = 0; i < MAX_ORDER_BOOK_DEPTH; i++) {
            const priceOffset = Math.random() * spread * 2;
            const bid = {
                price: parseFloat((bidPrice - priceOffset).toFixed(2)),
                size: Math.floor(Math.random() * 100) + 1
            };
            orderBook.bids.push(bid);
        }

        // Generate asks
        for (let i = 0; i < MAX_ORDER_BOOK_DEPTH; i++) {
            const priceOffset = Math.random() * spread * 2;
            const ask = {
                price: parseFloat((askPrice + priceOffset).toFixed(2)),
                size: Math.floor(Math.random() * 100) + 1
            };
            orderBook.asks.push(ask);
        }

        orderBook.bids.sort((a, b) => b.price - a.price);
        orderBook.asks.sort((a, b) => a.price - b.price);

        // Trim to top 10 for display
        orderBook.bids = orderBook.bids.slice(0, 10);
        orderBook.asks = orderBook.asks.slice(0, 10);
    }

    function matchOrder(type, orderPrice, orderSize) {
        let filledSize = 0;
        let filledPrice = 0;
        let remainingSize = orderSize;
        let trades = [];

        if (type === 'buy') {
            for (let i = 0; i < orderBook.asks.length && remainingSize > 0; i++) {
                const ask = orderBook.asks[i];
                if (orderPrice >= ask.price) {
                    const tradeSize = Math.min(remainingSize, ask.size);
                    trades.push({ price: ask.price, size: tradeSize });
                    filledSize += tradeSize;
                    filledPrice += ask.price * tradeSize;
                    remainingSize -= tradeSize;
                    ask.size -= tradeSize;
                }
            }
        } else if (type === 'sell') {
            for (let i = 0; i < orderBook.bids.length && remainingSize > 0; i++) {
                const bid = orderBook.bids[i];
                if (orderPrice <= bid.price) {
                    const tradeSize = Math.min(remainingSize, bid.size);
                    trades.push({ price: bid.price, size: tradeSize });
                    filledSize += tradeSize;
                    filledPrice += bid.price * tradeSize;
                    remainingSize -= tradeSize;
                    bid.size -= tradeSize;
                }
            }
        }

        // Remove empty orders from the book
        orderBook.bids = orderBook.bids.filter(bid => bid.size > 0);
        orderBook.asks = orderBook.asks.filter(ask => ask.size > 0);

        if (filledSize > 0) {
            const avgFilledPrice = filledPrice / filledSize;
            // Simulate price impact based on trade volume
            const priceImpact = (type === 'buy' ? 1 : -1) * (filledSize * LIQUIDITY_FACTOR);
            price += priceImpact;
            return {
                filled: true,
                filledSize: filledSize,
                avgFilledPrice: avgFilledPrice,
                remainingSize: remainingSize,
                trades: trades
            };
        }
        return { filled: false };
    }

    function getMarketData() {
        return {
            price: parseFloat(price.toFixed(2)),
            orderBook: orderBook
        };
    }

    function init() {
        generateOrderBook();
    }

    init();

    return {
        tick: function() {
            price = generateGeometricBrownianMotionPrice();
            generateOrderBook();
            return getMarketData();
        },
        getPrice: function() {
            return parseFloat(price.toFixed(2));
        },
        getOrderBook: function() {
            return orderBook;
        },
        executeOrder: function(type, orderPrice, orderSize) {
            return matchOrder(type, orderPrice, orderSize);
        }
    };
})();
