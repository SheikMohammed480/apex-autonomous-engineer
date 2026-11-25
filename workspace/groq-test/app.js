// app.js
// Modern counter implementation using ES6+ features.
// This module provides a Counter class with increment, decrement, reset,
// and value retrieval capabilities. It also exports a singleton instance
// for quick usage.

/**
 * Counter class encapsulating a numeric counter.
 */
class Counter {
  /**
   * Create a new Counter.
   * @param {number} [initial=0] - Starting value of the counter.
   */
  constructor(initial = 0) {
    if (typeof initial !== 'number' || isNaN(initial)) {
      throw new TypeError('Initial value must be a valid number');
    }
    this._value = initial;
  }

  /** Get the current counter value. */
  get value() {
    return this._value;
  }

  /** Set the counter to a specific value. */
  set value(val) {
    if (typeof val !== 'number' || isNaN(val)) {
      throw new TypeError('Counter value must be a valid number');
    }
    this._value = val;
  }

  /** Increment the counter by a step (default 1). */
  increment(step = 1) {
    if (typeof step !== 'number' || isNaN(step)) {
      throw new TypeError('Step must be a valid number');
    }
    this._value += step;
    return this._value;
  }

  /** Decrement the counter by a step (default 1). */
  decrement(step = 1) {
    if (typeof step !== 'number' || isNaN(step)) {
      throw new TypeError('Step must be a valid number');
    }
    this._value -= step;
    return this._value;
  }

  /** Reset the counter to its initial value (default 0). */
  reset(to = 0) {
    if (typeof to !== 'number' || isNaN(to)) {
      throw new TypeError('Reset value must be a valid number');
    }
    this._value = to;
    return this._value;
  }
}

// Export a default singleton instance for convenience.
const defaultCounter = new Counter();

export { Counter, defaultCounter };

// UI integration for modern counter UI
function updateDisplay() {
  const display = document.getElementById('counter-value');
  if (display) {
    display.textContent = defaultCounter.value;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const incBtn = document.getElementById('increment');
  const decBtn = document.getElementById('decrement');
  const resetBtn = document.getElementById('reset');

  // Initialize display
  updateDisplay();

  if (incBtn) {
    incBtn.addEventListener('click', () => {
      defaultCounter.increment();
      updateDisplay();
    });
  }
  if (decBtn) {
    decBtn.addEventListener('click', () => {
      defaultCounter.decrement();
      updateDisplay();
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      defaultCounter.reset();
      updateDisplay();
    });
  }
});

// Example usage (uncomment to test in a Node environment):
// console.log('Initial:', defaultCounter.value);
// defaultCounter.increment();
// console.log('After increment:', defaultCounter.value);
// defaultCounter.decrement(2);
// console.log('After decrement:', defaultCounter.value);
// defaultCounter.reset();
// console.log('After reset:', defaultCounter.value);
