/**
 * Echo State Network (ESN) Module
 * Inspired by cogcities/plan9-cogcities-kernel
 *
 * Implements reservoir computing for commerce pattern recognition
 * with multi-framework state representation including Matula number encoding.
 */

// =====================================================================
// Constants for ESN training
// =====================================================================
/** Maximum washout period (initial steps discarded during training) */
const MAX_WASHOUT_PERIOD = 100;
/** Percentage of training data to use as washout */
const WASHOUT_PERCENTAGE = 0.1;

/**
 * ESN Configuration
 */
export interface ESNConfig {
  /** Number of reservoir nodes */
  reservoirSize: number;
  /** Input dimension */
  inputDim: number;
  /** Output dimension */
  outputDim: number;
  /** Spectral radius (should be < 1 for stability) */
  spectralRadius: number;
  /** Input scaling */
  inputScaling: number;
  /** Reservoir sparsity (0-1) */
  sparsity: number;
  /** Leaking rate for leaky integrator neurons */
  leakingRate: number;
  /** Regularization coefficient */
  regularization: number;
}

/**
 * ESN State representation
 * Can be viewed through multiple frameworks
 */
export interface ESNState {
  /** Reservoir state vector */
  reservoir: number[];
  /** Matula number encoding (prime factorization) */
  matulaNumber: bigint;
  /** Timestamp */
  timestamp: Date;
  /** Input that produced this state */
  input?: number[];
  /** Prediction output */
  output?: number[];
}

/**
 * Time series data point for commerce analytics
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  values: number[];
  labels?: string[];
}

/**
 * Echo State Network for Commerce Intelligence
 *
 * Uses reservoir computing for temporal pattern recognition
 * in sales, inventory, and customer behavior data.
 */
export class EchoStateNetwork {
  private config: ESNConfig;
  private inputWeights: number[][];
  private reservoirWeights: number[][];
  private outputWeights: number[][] | null = null;
  private state: number[];
  private stateHistory: ESNState[] = [];

  constructor(config: Partial<ESNConfig> = {}) {
    this.config = {
      reservoirSize: config.reservoirSize || 100,
      inputDim: config.inputDim || 10,
      outputDim: config.outputDim || 5,
      spectralRadius: config.spectralRadius || 0.9,
      inputScaling: config.inputScaling || 1.0,
      sparsity: config.sparsity || 0.1,
      leakingRate: config.leakingRate || 0.3,
      regularization: config.regularization || 1e-6,
    };

    this.inputWeights = this.initializeInputWeights();
    this.reservoirWeights = this.initializeReservoirWeights();
    this.state = new Array(this.config.reservoirSize).fill(0);
  }

  /**
   * Initialize input weight matrix
   */
  private initializeInputWeights(): number[][] {
    const { reservoirSize, inputDim, inputScaling } = this.config;
    const weights: number[][] = [];

    for (let i = 0; i < reservoirSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputDim; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * inputScaling;
      }
    }

    return weights;
  }

  /**
   * Initialize reservoir weight matrix with desired spectral radius
   */
  private initializeReservoirWeights(): number[][] {
    const { reservoirSize, sparsity, spectralRadius } = this.config;
    const weights: number[][] = [];

    // Create sparse random matrix
    for (let i = 0; i < reservoirSize; i++) {
      weights[i] = [];
      for (let j = 0; j < reservoirSize; j++) {
        if (Math.random() < sparsity) {
          weights[i][j] = Math.random() * 2 - 1;
        } else {
          weights[i][j] = 0;
        }
      }
    }

    // Scale to desired spectral radius
    const maxEigenvalue = this.estimateSpectralRadius(weights);
    if (maxEigenvalue > 0) {
      const scale = spectralRadius / maxEigenvalue;
      for (let i = 0; i < reservoirSize; i++) {
        for (let j = 0; j < reservoirSize; j++) {
          weights[i][j] *= scale;
        }
      }
    }

    return weights;
  }

  /**
   * Estimate spectral radius using power iteration
   */
  private estimateSpectralRadius(matrix: number[][]): number {
    const n = matrix.length;
    let v = new Array(n).fill(1);
    let eigenvalue = 0;

    // Power iteration
    for (let iter = 0; iter < 100; iter++) {
      const newV = new Array(n).fill(0);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newV[i] += matrix[i][j] * v[j];
        }
      }

      const norm = Math.sqrt(newV.reduce((sum, x) => sum + x * x, 0));
      if (norm > 0) {
        for (let i = 0; i < n; i++) {
          newV[i] /= norm;
        }
      }

      eigenvalue = norm;
      v = newV;
    }

    return eigenvalue;
  }

  /**
   * Update reservoir state with new input
   */
  updateState(input: number[]): ESNState {
    const { reservoirSize, leakingRate } = this.config;
    const newState = new Array(reservoirSize).fill(0);

    // Compute pre-activation: Win * input + W * state
    for (let i = 0; i < reservoirSize; i++) {
      // Input contribution
      for (let j = 0; j < input.length; j++) {
        newState[i] += this.inputWeights[i][j] * input[j];
      }

      // Reservoir contribution
      for (let j = 0; j < reservoirSize; j++) {
        newState[i] += this.reservoirWeights[i][j] * this.state[j];
      }

      // Apply tanh activation
      newState[i] = Math.tanh(newState[i]);
    }

    // Apply leaky integration
    for (let i = 0; i < reservoirSize; i++) {
      this.state[i] =
        (1 - leakingRate) * this.state[i] + leakingRate * newState[i];
    }

    // Create state representation
    const esnState: ESNState = {
      reservoir: [...this.state],
      matulaNumber: this.encodeAsMatulaNumber(this.state),
      timestamp: new Date(),
      input,
    };

    // Compute output if trained
    if (this.outputWeights) {
      esnState.output = this.computeOutput(this.state);
    }

    this.stateHistory.push(esnState);

    return esnState;
  }

  /**
   * Train output weights using ridge regression
   */
  train(trainingData: { input: number[]; target: number[] }[]): void {
    const { reservoirSize, regularization } = this.config;

    // Collect reservoir states for training data
    const states: number[][] = [];
    const targets: number[][] = [];

    // Reset state
    this.state = new Array(reservoirSize).fill(0);

    // Washout period + collect states
    const washout = Math.min(MAX_WASHOUT_PERIOD, Math.floor(trainingData.length * WASHOUT_PERCENTAGE));

    for (let i = 0; i < trainingData.length; i++) {
      this.updateState(trainingData[i].input);

      if (i >= washout) {
        states.push([...this.state]);
        targets.push(trainingData[i].target);
      }
    }

    // Solve ridge regression: W_out = Y * X^T * (X * X^T + λI)^{-1}
    // Using simplified pseudo-inverse for small datasets
    this.outputWeights = this.solveRidgeRegression(states, targets, regularization);
  }

  /**
   * Solve ridge regression using normal equations
   */
  private solveRidgeRegression(
    X: number[][],
    Y: number[][],
    lambda: number
  ): number[][] {
    const n = X.length;
    const d = X[0].length;
    const m = Y[0].length;

    // X^T * X + λI
    const XtX: number[][] = [];
    for (let i = 0; i < d; i++) {
      XtX[i] = [];
      for (let j = 0; j < d; j++) {
        let sum = i === j ? lambda : 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][i] * X[k][j];
        }
        XtX[i][j] = sum;
      }
    }

    // X^T * Y
    const XtY: number[][] = [];
    for (let i = 0; i < d; i++) {
      XtY[i] = [];
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][i] * Y[k][j];
        }
        XtY[i][j] = sum;
      }
    }

    // Solve (X^T * X + λI) * W = X^T * Y using Gaussian elimination
    return this.solveLinearSystem(XtX, XtY);
  }

  /**
   * Solve linear system using Gaussian elimination
   */
  private solveLinearSystem(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    const m = B[0].length;

    // Create augmented matrix
    const aug: number[][] = A.map((row, i) => [...row, ...B[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j < n + m; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    // Back substitution
    const result: number[][] = [];
    for (let i = 0; i < n; i++) {
      result[i] = new Array(m).fill(0);
    }

    for (let i = n - 1; i >= 0; i--) {
      for (let j = 0; j < m; j++) {
        let sum = aug[i][n + j];
        for (let k = i + 1; k < n; k++) {
          sum -= aug[i][k] * result[k][j];
        }
        result[i][j] = sum / aug[i][i];
      }
    }

    return result;
  }

  /**
   * Compute output from reservoir state
   */
  private computeOutput(state: number[]): number[] {
    if (!this.outputWeights) return [];

    const output: number[] = [];
    for (let i = 0; i < this.config.outputDim; i++) {
      let sum = 0;
      for (let j = 0; j < state.length; j++) {
        sum += this.outputWeights[j][i] * state[j];
      }
      output.push(sum);
    }

    return output;
  }

  /**
   * Predict next values in time series
   */
  predict(input: number[]): number[] {
    const state = this.updateState(input);
    return state.output || [];
  }

  /**
   * Encode reservoir state as Matula number
   * Uses prime factorization for efficient state comparison
   *
   * State = ∏ p_i^e_i where:
   *   p_i = i-th prime
   *   e_i = quantized activation level (0-10)
   */
  encodeAsMatulaNumber(state: number[]): bigint {
    const primes = this.getPrimes(state.length);
    let result = BigInt(1);

    for (let i = 0; i < state.length; i++) {
      // Quantize state to 0-10 range
      const quantized = Math.max(
        0,
        Math.min(10, Math.round((state[i] + 1) * 5))
      );

      if (quantized > 0) {
        result *= BigInt(primes[i]) ** BigInt(quantized);
      }
    }

    return result;
  }

  /**
   * Decode Matula number back to approximate state
   */
  decodeMatulaNumber(matula: bigint): number[] {
    const primes = this.getPrimes(this.config.reservoirSize);
    const state: number[] = [];

    for (let i = 0; i < this.config.reservoirSize; i++) {
      let exponent = 0;
      let temp = matula;

      while (temp % BigInt(primes[i]) === BigInt(0)) {
        exponent++;
        temp /= BigInt(primes[i]);
      }

      // Convert back to -1 to 1 range
      state.push(exponent / 5 - 1);
    }

    return state;
  }

  /**
   * Get first n prime numbers
   */
  private getPrimes(n: number): number[] {
    const primes: number[] = [];
    let candidate = 2;

    while (primes.length < n) {
      let isPrime = true;
      for (const p of primes) {
        if (p * p > candidate) break;
        if (candidate % p === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        primes.push(candidate);
      }
      candidate++;
    }

    return primes;
  }

  /**
   * Get state history
   */
  getStateHistory(): ESNState[] {
    return [...this.stateHistory];
  }

  /**
   * Compare two states using Matula numbers
   * Returns similarity score 0-1
   */
  compareStates(state1: ESNState, state2: ESNState): number {
    const m1 = state1.matulaNumber;
    const m2 = state2.matulaNumber;

    // GCD-based similarity
    const gcd = this.bigIntGcd(m1, m2);
    const max = m1 > m2 ? m1 : m2;

    if (max === BigInt(0)) return 1;

    // Convert to number for division (may lose precision for very large numbers)
    return Number(gcd) / Number(max);
  }

  private bigIntGcd(a: bigint, b: bigint): bigint {
    while (b !== BigInt(0)) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * Reset the network state
   */
  reset(): void {
    this.state = new Array(this.config.reservoirSize).fill(0);
    this.stateHistory = [];
  }

  /**
   * Get current state
   */
  getCurrentState(): ESNState {
    return {
      reservoir: [...this.state],
      matulaNumber: this.encodeAsMatulaNumber(this.state),
      timestamp: new Date(),
    };
  }

  /**
   * Export network configuration and weights
   */
  export(): ESNExport {
    return {
      config: this.config,
      inputWeights: this.inputWeights,
      reservoirWeights: this.reservoirWeights,
      outputWeights: this.outputWeights,
      state: this.state,
    };
  }

  /**
   * Import network from exported data
   */
  static import(data: ESNExport): EchoStateNetwork {
    const esn = new EchoStateNetwork(data.config);
    esn.inputWeights = data.inputWeights;
    esn.reservoirWeights = data.reservoirWeights;
    esn.outputWeights = data.outputWeights;
    esn.state = data.state;
    return esn;
  }
}

/**
 * ESN export format
 */
export interface ESNExport {
  config: ESNConfig;
  inputWeights: number[][];
  reservoirWeights: number[][];
  outputWeights: number[][] | null;
  state: number[];
}

/**
 * Commerce-specific ESN applications
 */
export class CommerceESN {
  private salesESN: EchoStateNetwork;
  private inventoryESN: EchoStateNetwork;
  private customerESN: EchoStateNetwork;

  constructor() {
    // Sales prediction ESN
    this.salesESN = new EchoStateNetwork({
      reservoirSize: 50,
      inputDim: 7, // Day of week, hour, promotions, etc.
      outputDim: 1, // Predicted sales
      spectralRadius: 0.9,
    });

    // Inventory optimization ESN
    this.inventoryESN = new EchoStateNetwork({
      reservoirSize: 30,
      inputDim: 5, // Current stock, demand, lead time, etc.
      outputDim: 1, // Reorder quantity
      spectralRadius: 0.85,
    });

    // Customer behavior ESN
    this.customerESN = new EchoStateNetwork({
      reservoirSize: 40,
      inputDim: 8, // Purchase history, browsing, demographics
      outputDim: 3, // Next action probabilities
      spectralRadius: 0.95,
    });
  }

  /**
   * Predict sales for next period
   */
  predictSales(context: SalesContext): number {
    const input = this.encodeSalesContext(context);
    const prediction = this.salesESN.predict(input);
    return prediction[0] || 0;
  }

  /**
   * Get inventory reorder recommendation
   */
  recommendReorder(context: InventoryContext): number {
    const input = this.encodeInventoryContext(context);
    const recommendation = this.inventoryESN.predict(input);
    return Math.max(0, Math.round(recommendation[0] || 0));
  }

  /**
   * Predict customer next action
   */
  predictCustomerAction(context: CustomerContext): CustomerActionPrediction {
    const input = this.encodeCustomerContext(context);
    const prediction = this.customerESN.predict(input);

    return {
      purchaseProbability: Math.max(0, Math.min(1, prediction[0] || 0)),
      cartAbandonmentRisk: Math.max(0, Math.min(1, prediction[1] || 0)),
      churnRisk: Math.max(0, Math.min(1, prediction[2] || 0)),
    };
  }

  private encodeSalesContext(context: SalesContext): number[] {
    return [
      context.dayOfWeek / 7,
      context.hourOfDay / 24,
      context.isPromotion ? 1 : 0,
      context.recentSales / 1000,
      context.seasonality || 0,
      context.weatherIndex || 0.5,
      context.competitorActivity || 0.5,
    ];
  }

  private encodeInventoryContext(context: InventoryContext): number[] {
    return [
      context.currentStock / context.maxStock,
      context.averageDemand / 100,
      context.leadTimeDays / 30,
      context.safetyStockDays / 14,
      context.seasonalityFactor || 1,
    ];
  }

  private encodeCustomerContext(context: CustomerContext): number[] {
    return [
      context.totalOrders / 100,
      context.averageOrderValue / 500,
      context.daysSinceLastOrder / 365,
      context.cartValue / 200,
      context.browsingTimeMinutes / 60,
      context.emailEngagement || 0.5,
      context.loyaltyPoints / 1000,
      context.returnRate || 0,
    ];
  }
}

// Context interfaces
export interface SalesContext {
  dayOfWeek: number;
  hourOfDay: number;
  isPromotion: boolean;
  recentSales: number;
  seasonality?: number;
  weatherIndex?: number;
  competitorActivity?: number;
}

export interface InventoryContext {
  currentStock: number;
  maxStock: number;
  averageDemand: number;
  leadTimeDays: number;
  safetyStockDays: number;
  seasonalityFactor?: number;
}

export interface CustomerContext {
  totalOrders: number;
  averageOrderValue: number;
  daysSinceLastOrder: number;
  cartValue: number;
  browsingTimeMinutes: number;
  emailEngagement?: number;
  loyaltyPoints: number;
  returnRate?: number;
}

export interface CustomerActionPrediction {
  purchaseProbability: number;
  cartAbandonmentRisk: number;
  churnRisk: number;
}
