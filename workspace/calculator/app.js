document.addEventListener('DOMContentLoaded', () => {
    const expressionDisplay = document.querySelector('.expression');
    const resultDisplay = document.querySelector('.result');
    const historyList = document.getElementById('history-list');
    const buttons = document.querySelector('.buttons');

    let currentExpression = '';
    let currentResult = '0';
    let history = [];
    let awaitingNewInput = true; // Flag to indicate if the next input should clear the display

    const MAX_HISTORY_ITEMS = 10;

    // Function to update the display
    function updateDisplay() {
        expressionDisplay.textContent = currentExpression === '' ? '0' : currentExpression;
        resultDisplay.textContent = currentResult;
    }

    // Function to add an item to history
    function addToHistory(expression, result) {
        history.unshift({ expression, result });
        if (history.length > MAX_HISTORY_ITEMS) {
            history.pop();
        }
        renderHistory();
    }

    // Function to render history
    function renderHistory() {
        historyList.innerHTML = '';
        history.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="history-expression">${item.expression}</div>
                <div class="history-result">${item.result}</div>
            `;
            listItem.addEventListener('click', () => {
                currentExpression = item.expression;
                currentResult = item.result;
                awaitingNewInput = true;
                updateDisplay();
            });
            historyList.appendChild(listItem);
        });
    }

    // Function to clear all
    function clearAll() {
        currentExpression = '';
        currentResult = '0';
        awaitingNewInput = true;
        updateDisplay();
    }

    // Function to handle backspace
    function backspace() {
        if (awaitingNewInput) {
            clearAll();
            return;
        }
        currentExpression = currentExpression.slice(0, -1);
        if (currentExpression === '') {
            currentResult = '0';
        }
        updateDisplay();
    }

    // Function to evaluate the expression
    function evaluateExpression() {
        if (currentExpression === '') return;

        try {
            // Basic validation to prevent arbitrary code execution
            if (!/^[0-9+\-*/().%√^loglnsincostan!eπ\s]+$/.test(currentExpression)) {
                throw new Error('Invalid characters in expression');
            }

            // Replace special functions with Math object equivalents
            let expressionToEvaluate = currentExpression
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E')
                .replace(/√/g, 'Math.sqrt')
                .replace(/log\(/g, 'Math.log10(') // Base 10 log
                .replace(/ln\(/g, 'Math.log(') // Natural log
                .replace(/sin\(/g, 'Math.sin(')
                .replace(/cos\(/g, 'Math.cos(')
                .replace(/tan\(/g, 'Math.tan(')
                .replace(/(\d+)%/g, '($1/100)') // Percentage
                .replace(/\^/g, '**'); // Power

            // Handle factorial
            expressionToEvaluate = expressionToEvaluate.replace(/(\d+)!/g, (match, num) => {
                let n = parseInt(num);
                if (n < 0) throw new Error('Factorial of negative number');
                let res = 1;
                for (let i = 2; i <= n; i++) res *= i;
                return res;
            });

            let result = eval(expressionToEvaluate);

            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }

            currentResult = result.toString();
            addToHistory(currentExpression, currentResult);
            currentExpression = currentResult; // Set expression to result for chaining
            awaitingNewInput = true;

        } catch (error) {
            currentResult = 'Error';
            console.error('Calculation error:', error);
            awaitingNewInput = true;
        }
        updateDisplay();
    }

    // Function to handle button clicks
    buttons.addEventListener('click', (e) => {
        if (!e.target.matches('.btn')) return;

        const value = e.target.dataset.value;

        if (value === 'AC') {
            clearAll();
            return;
        }

        if (value === 'DEL') {
            backspace();
            return;
        }

        if (value === '=') {
            evaluateExpression();
            return;
        }

        // If awaiting new input and a number or opening parenthesis is pressed, clear the expression
        if (awaitingNewInput && (/[0-9(πe]/.test(value))) {
            currentExpression = '';
            awaitingNewInput = false;
        } else if (awaitingNewInput && !(/[+\-*/%^√loglnsincostan]/.test(value))) {
            // If awaiting new input and an operator is pressed, allow chaining
            awaitingNewInput = false;
        }


        // Prevent multiple leading zeros
        if (currentExpression === '0' && value === '0') {
            return;
        }
        // Replace leading zero if a number is pressed
        if (currentExpression === '0' && /[1-9]/.test(value)) {
            currentExpression = value;
            updateDisplay();
            return;
        }

        // Prevent multiple decimal points in a number
        if (value === '.' && currentExpression.split(/[\+\-\*\/%^√loglnsincostan]/).pop().includes('.')) {
            return;
        }

        currentExpression += value;
        updateDisplay();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        const key = e.key;

        // Map keyboard keys to calculator buttons
        const keyMap = {
            'Enter': '=',
            'Escape': 'AC',
            'Backspace': 'DEL',
            '+': '+',
            '-': '-',
            '*': '*',
            '/': '/',
            '%': '%',
            '.': '.',
            '(': '(',
            ')': ')',
            '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
            '^': '^',
            'p': 'π', // Custom mapping for PI
            'e': 'e', // Custom mapping for E
            's': 'sin(', // Custom mapping for sin
            'c': 'cos(', // Custom mapping for cos
            't': 'tan(', // Custom mapping for tan
            'l': 'log(', // Custom mapping for log
            'n': 'ln(', // Custom mapping for ln
            'r': '√', // Custom mapping for square root
            '!': '!', // Custom mapping for factorial
        };

        const mappedValue = keyMap[key];

        if (mappedValue) {
            // Simulate a click on the corresponding button
            const button = document.querySelector(`.btn[data-value="${mappedValue}"]`);
            if (button) {
                button.click();
                e.preventDefault(); // Prevent default browser actions (e.g., Enter submitting forms)
            }
        } else if (/[0-9+\-*/().%^√loglnsincostan!eπ]/.test(key)) {
            // If it's a direct number or operator not in keyMap, append it
            const button = document.querySelector(`.btn[data-value="${key}"]`);
            if (button) {
                button.click();
                e.preventDefault();
            }
        }
    });

    // Initial display update
    updateDisplay();
    renderHistory();
});