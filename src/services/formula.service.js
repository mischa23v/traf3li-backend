/**
 * Formula Service
 *
 * Service for evaluating calculated/formula fields with support for:
 * - Math functions: SUM, AVG, MIN, MAX, ROUND, ABS, FLOOR, CEIL
 * - Text functions: CONCAT, LEFT, RIGHT, UPPER, LOWER, TRIM, LEN, SUBSTRING
 * - Date functions: TODAY, NOW, DATEDIFF, DATEADD, YEAR, MONTH, DAY, WEEKDAY
 * - Logical functions: IF, AND, OR, NOT, ISBLANK, ISNUMBER
 * - Field references: {fieldName}
 * - Caching with Redis
 *
 * @module services/formula.service
 */

const logger = require('../utils/logger');
const cacheService = require('./cache.service');
const { FormulaField } = require('../models/formulaField.model');

// Cache TTL in seconds (default: 5 minutes)
const CACHE_TTL = parseInt(process.env.FORMULA_CACHE_TTL) || 300;

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Formula Service Class
 */
class FormulaService {
  constructor() {
    // Define available functions
    this.functions = {
      // Math functions
      SUM: this._sum.bind(this),
      AVG: this._avg.bind(this),
      MIN: this._min.bind(this),
      MAX: this._max.bind(this),
      ROUND: this._round.bind(this),
      ABS: this._abs.bind(this),
      FLOOR: this._floor.bind(this),
      CEIL: this._ceil.bind(this),

      // Text functions
      CONCAT: this._concat.bind(this),
      LEFT: this._left.bind(this),
      RIGHT: this._right.bind(this),
      UPPER: this._upper.bind(this),
      LOWER: this._lower.bind(this),
      TRIM: this._trim.bind(this),
      LEN: this._len.bind(this),
      SUBSTRING: this._substring.bind(this),

      // Date functions
      TODAY: this._today.bind(this),
      NOW: this._now.bind(this),
      DATEDIFF: this._dateDiff.bind(this),
      DATEADD: this._dateAdd.bind(this),
      YEAR: this._year.bind(this),
      MONTH: this._month.bind(this),
      DAY: this._day.bind(this),
      WEEKDAY: this._weekday.bind(this),

      // Logical functions
      IF: this._if.bind(this),
      AND: this._and.bind(this),
      OR: this._or.bind(this),
      NOT: this._not.bind(this),
      ISBLANK: this._isBlank.bind(this),
      ISNUMBER: this._isNumber.bind(this)
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MATH FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  _sum(...args) {
    return args.reduce((sum, val) => sum + this._toNumber(val), 0);
  }

  _avg(...args) {
    if (args.length === 0) return 0;
    return this._sum(...args) / args.length;
  }

  _min(...args) {
    const numbers = args.map(v => this._toNumber(v));
    return Math.min(...numbers);
  }

  _max(...args) {
    const numbers = args.map(v => this._toNumber(v));
    return Math.max(...numbers);
  }

  _round(value, decimals = 0) {
    const num = this._toNumber(value);
    const dec = this._toNumber(decimals);
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  }

  _abs(value) {
    return Math.abs(this._toNumber(value));
  }

  _floor(value) {
    return Math.floor(this._toNumber(value));
  }

  _ceil(value) {
    return Math.ceil(this._toNumber(value));
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  _concat(...args) {
    return args.map(v => this._toString(v)).join('');
  }

  _left(text, length) {
    const str = this._toString(text);
    const len = this._toNumber(length);
    return str.substring(0, len);
  }

  _right(text, length) {
    const str = this._toString(text);
    const len = this._toNumber(length);
    return str.substring(str.length - len);
  }

  _upper(text) {
    return this._toString(text).toUpperCase();
  }

  _lower(text) {
    return this._toString(text).toLowerCase();
  }

  _trim(text) {
    return this._toString(text).trim();
  }

  _len(text) {
    return this._toString(text).length;
  }

  _substring(text, start, length) {
    const str = this._toString(text);
    const startIdx = this._toNumber(start);
    if (length !== undefined) {
      const len = this._toNumber(length);
      return str.substring(startIdx, startIdx + len);
    }
    return str.substring(startIdx);
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  _today() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  _now() {
    return new Date();
  }

  _dateDiff(date1, date2, unit = 'days') {
    const d1 = this._toDate(date1);
    const d2 = this._toDate(date2);
    const diffMs = d1.getTime() - d2.getTime();

    switch (unit.toLowerCase()) {
      case 'years':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      case 'months':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      case 'weeks':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      case 'hours':
        return Math.floor(diffMs / (1000 * 60 * 60));
      case 'minutes':
        return Math.floor(diffMs / (1000 * 60));
      case 'seconds':
        return Math.floor(diffMs / 1000);
      case 'days':
      default:
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  _dateAdd(date, amount, unit = 'days') {
    const d = this._toDate(date);
    const amt = this._toNumber(amount);
    const result = new Date(d);

    switch (unit.toLowerCase()) {
      case 'years':
        result.setFullYear(result.getFullYear() + amt);
        break;
      case 'months':
        result.setMonth(result.getMonth() + amt);
        break;
      case 'weeks':
        result.setDate(result.getDate() + (amt * 7));
        break;
      case 'hours':
        result.setHours(result.getHours() + amt);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amt);
        break;
      case 'seconds':
        result.setSeconds(result.getSeconds() + amt);
        break;
      case 'days':
      default:
        result.setDate(result.getDate() + amt);
        break;
    }

    return result;
  }

  _year(date) {
    return this._toDate(date).getFullYear();
  }

  _month(date) {
    return this._toDate(date).getMonth() + 1; // 1-based month
  }

  _day(date) {
    return this._toDate(date).getDate();
  }

  _weekday(date) {
    return this._toDate(date).getDay(); // 0 = Sunday, 6 = Saturday
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGICAL FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  _if(condition, trueValue, falseValue) {
    return this._toBoolean(condition) ? trueValue : falseValue;
  }

  _and(...args) {
    return args.every(arg => this._toBoolean(arg));
  }

  _or(...args) {
    return args.some(arg => this._toBoolean(arg));
  }

  _not(value) {
    return !this._toBoolean(value);
  }

  _isBlank(value) {
    return value === null || value === undefined ||
           (typeof value === 'string' && value.trim() === '');
  }

  _isNumber(value) {
    return typeof value === 'number' || !isNaN(parseFloat(value));
  }

  // ═══════════════════════════════════════════════════════════════
  // TYPE CONVERSION HELPERS
  // ═══════════════════════════════════════════════════════════════

  _toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (value instanceof Date) return value.getTime();
    return 0;
  }

  _toString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  _toDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        logger.warn(`Invalid date value: ${value}, using current date`);
        return new Date();
      }
      return date;
    }
    return new Date();
  }

  _toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1';
    }
    return !!value;
  }

  // ═══════════════════════════════════════════════════════════════
  // FORMULA PARSING & EVALUATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse field references from formula
   * Extracts {fieldName} patterns
   * @param {String} formula - Formula string
   * @returns {Array<String>} Array of field names
   */
  parseFieldReferences(formula) {
    if (!formula || typeof formula !== 'string') {
      return [];
    }

    const regex = /\{([^}]+)\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(formula)) !== null) {
      matches.push(match[1].trim());
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Get formula dependencies
   * @param {String} formula - Formula string
   * @returns {Array<String>} Unique list of field dependencies
   */
  getDependencies(formula) {
    return this.parseFieldReferences(formula);
  }

  /**
   * Tokenize a formula string
   * @param {String} formula - Formula string
   * @returns {Array} Array of tokens
   */
  _tokenize(formula) {
    const tokens = [];
    let current = '';
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        i++;
        continue;
      }

      // Handle string literals
      if (char === '"' || char === "'") {
        if (current) {
          tokens.push(current);
          current = '';
        }
        const quote = char;
        let str = '';
        i++;
        while (i < formula.length && formula[i] !== quote) {
          if (formula[i] === '\\' && i + 1 < formula.length) {
            i++;
            str += formula[i];
          } else {
            str += formula[i];
          }
          i++;
        }
        tokens.push({ type: 'string', value: str });
        i++; // Skip closing quote
        continue;
      }

      // Handle operators and brackets
      if ('+-*/%(),.>=<!=&|'.includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }

        // Handle multi-char operators
        const next = formula[i + 1];
        if ((char === '>' && next === '=') ||
            (char === '<' && next === '=') ||
            (char === '!' && next === '=') ||
            (char === '=' && next === '=') ||
            (char === '&' && next === '&') ||
            (char === '|' && next === '|')) {
          tokens.push(char + next);
          i += 2;
        } else {
          tokens.push(char);
          i++;
        }
        continue;
      }

      // Accumulate identifiers and numbers
      current += char;
      i++;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse tokens into an AST
   * @param {Array} tokens - Array of tokens
   * @returns {Object} AST node
   */
  _parse(tokens) {
    let pos = 0;

    const parseExpression = () => {
      return parseOr();
    };

    const parseOr = () => {
      let left = parseAnd();
      while (pos < tokens.length && tokens[pos] === '||') {
        pos++;
        const right = parseAnd();
        left = { type: 'binary', op: '||', left, right };
      }
      return left;
    };

    const parseAnd = () => {
      let left = parseComparison();
      while (pos < tokens.length && tokens[pos] === '&&') {
        pos++;
        const right = parseComparison();
        left = { type: 'binary', op: '&&', left, right };
      }
      return left;
    };

    const parseComparison = () => {
      let left = parseAddSub();
      while (pos < tokens.length && ['>', '<', '>=', '<=', '==', '!='].includes(tokens[pos])) {
        const op = tokens[pos++];
        const right = parseAddSub();
        left = { type: 'binary', op, left, right };
      }
      return left;
    };

    const parseAddSub = () => {
      let left = parseMulDiv();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseMulDiv();
        left = { type: 'binary', op, left, right };
      }
      return left;
    };

    const parseMulDiv = () => {
      let left = parseUnary();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
        const op = tokens[pos++];
        const right = parseUnary();
        left = { type: 'binary', op, left, right };
      }
      return left;
    };

    const parseUnary = () => {
      if (tokens[pos] === '-') {
        pos++;
        const arg = parseUnary();
        return { type: 'unary', op: '-', arg };
      }
      return parsePrimary();
    };

    const parsePrimary = () => {
      const token = tokens[pos];

      // String literal
      if (typeof token === 'object' && token.type === 'string') {
        pos++;
        return { type: 'string', value: token.value };
      }

      // Number
      if (typeof token === 'string' && /^-?\d+(\.\d+)?$/.test(token)) {
        pos++;
        return { type: 'number', value: parseFloat(token) };
      }

      // Parenthesis
      if (token === '(') {
        pos++;
        const expr = parseExpression();
        if (tokens[pos] !== ')') {
          throw new Error('Missing closing parenthesis');
        }
        pos++;
        return expr;
      }

      // Function call or variable
      if (typeof token === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
        pos++;
        if (tokens[pos] === '(') {
          // Function call
          pos++;
          const args = [];
          while (tokens[pos] !== ')') {
            args.push(parseExpression());
            if (tokens[pos] === ',') pos++;
          }
          pos++;
          return { type: 'function', name: token, args };
        }
        return { type: 'variable', name: token };
      }

      throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    };

    const ast = parseExpression();

    if (pos < tokens.length) {
      throw new Error(`Unexpected token: ${JSON.stringify(tokens[pos])}`);
    }

    return ast;
  }

  /**
   * Safe evaluate expression
   * Evaluates an AST node with a context
   * @param {Object} node - AST node
   * @param {Object} context - Variable values
   * @returns {*} Result value
   */
  _evaluateNode(node, context) {
    switch (node.type) {
      case 'number':
        return node.value;

      case 'string':
        return node.value;

      case 'variable': {
        const value = context[node.name];
        if (value === undefined) {
          logger.warn(`Unknown variable in formula: ${node.name}, defaulting to null`);
          return null;
        }
        return value;
      }

      case 'unary':
        if (node.op === '-') {
          return -this._toNumber(this._evaluateNode(node.arg, context));
        }
        throw new Error(`Unknown unary operator: ${node.op}`);

      case 'binary': {
        const left = this._evaluateNode(node.left, context);
        const right = this._evaluateNode(node.right, context);

        switch (node.op) {
          case '+':
            // String concatenation or numeric addition
            if (typeof left === 'string' || typeof right === 'string') {
              return this._toString(left) + this._toString(right);
            }
            return this._toNumber(left) + this._toNumber(right);
          case '-':
            return this._toNumber(left) - this._toNumber(right);
          case '*':
            return this._toNumber(left) * this._toNumber(right);
          case '/':
            const divisor = this._toNumber(right);
            return divisor !== 0 ? this._toNumber(left) / divisor : 0;
          case '%':
            const mod = this._toNumber(right);
            return mod !== 0 ? this._toNumber(left) % mod : 0;
          case '>':
            return this._toNumber(left) > this._toNumber(right);
          case '<':
            return this._toNumber(left) < this._toNumber(right);
          case '>=':
            return this._toNumber(left) >= this._toNumber(right);
          case '<=':
            return this._toNumber(left) <= this._toNumber(right);
          case '==':
            return left === right;
          case '!=':
            return left !== right;
          case '&&':
            return this._toBoolean(left) && this._toBoolean(right);
          case '||':
            return this._toBoolean(left) || this._toBoolean(right);
          default:
            throw new Error(`Unknown binary operator: ${node.op}`);
        }
      }

      case 'function': {
        const funcName = node.name.toUpperCase();
        const func = this.functions[funcName];

        if (!func) {
          throw new Error(`Unknown function: ${node.name}`);
        }

        const args = node.args.map(arg => this._evaluateNode(arg, context));
        return func(...args);
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Safe evaluate expression
   * Supports basic operators and function calls without using eval()
   * @param {String} expression - Expression to evaluate
   * @param {Object} context - Variable values
   * @returns {*} Result value
   */
  safeEval(expression, context = {}) {
    if (!expression || typeof expression !== 'string') {
      return null;
    }

    try {
      const tokens = this._tokenize(expression.trim());
      const ast = this._parse(tokens);
      return this._evaluateNode(ast, context);
    } catch (error) {
      logger.error('Formula evaluation error', {
        error: error.message,
        expression,
        contextKeys: Object.keys(context)
      });
      throw error;
    }
  }

  /**
   * Evaluate formula for a record
   * Replaces field references {fieldName} with values from record
   * @param {String} formula - Formula string with {fieldName} references
   * @param {Object} record - Record data
   * @param {String} entityType - Entity type (for logging)
   * @returns {Promise<*>} Calculated result
   */
  async evaluate(formula, record, entityType) {
    try {
      // Replace field references {fieldName} with actual values
      const context = {};
      const fieldRefs = this.parseFieldReferences(formula);

      // Build context from record
      for (const fieldName of fieldRefs) {
        // Support nested field access with dot notation
        const value = this._getNestedValue(record, fieldName);
        context[fieldName] = value;
      }

      // Replace {fieldName} with variable names in formula
      let processedFormula = formula;
      for (const fieldName of fieldRefs) {
        const regex = new RegExp(`\\{${escapeRegex(fieldName)}\\}`, 'g');
        processedFormula = processedFormula.replace(regex, fieldName);
      }

      // Evaluate the processed formula
      const result = this.safeEval(processedFormula, context);

      logger.debug('Formula evaluated', {
        entityType,
        formula: formula.substring(0, 100),
        result,
        contextKeys: Object.keys(context)
      });

      return result;
    } catch (error) {
      logger.error('Formula evaluation failed', {
        error: error.message,
        formula: formula.substring(0, 100),
        entityType
      });
      throw error;
    }
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to get value from
   * @param {String} path - Dot-notation path (e.g., 'user.name')
   * @returns {*} Value at path
   */
  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Validate formula syntax
   * @param {String} formula - Formula to validate
   * @param {String} entityType - Entity type (optional, for field validation)
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateFormula(formula, entityType) {
    const result = {
      valid: true,
      errors: []
    };

    if (!formula || typeof formula !== 'string' || formula.trim().length === 0) {
      result.valid = false;
      result.errors.push('Formula cannot be empty');
      return result;
    }

    // Check balanced braces for field references
    let braceBalance = 0;
    for (const char of formula) {
      if (char === '{') braceBalance++;
      if (char === '}') braceBalance--;
      if (braceBalance < 0) {
        result.valid = false;
        result.errors.push('Unbalanced braces in field references');
        break;
      }
    }
    if (braceBalance !== 0 && result.valid) {
      result.valid = false;
      result.errors.push('Unbalanced braces in field references');
    }

    // Try to parse and validate syntax
    try {
      // Replace field references with dummy values for syntax checking
      const fieldRefs = this.parseFieldReferences(formula);
      let testFormula = formula;
      for (const fieldName of fieldRefs) {
        const regex = new RegExp(`\\{${escapeRegex(fieldName)}\\}`, 'g');
        testFormula = testFormula.replace(regex, '0');
      }

      // Try to tokenize and parse
      const tokens = this._tokenize(testFormula);
      this._parse(tokens);
    } catch (error) {
      result.valid = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Format result based on return type
   * @param {*} value - Value to format
   * @param {Object} formulaField - FormulaField document
   * @returns {String} Formatted string
   */
  formatResult(value, formulaField) {
    if (value === null || value === undefined) {
      return '';
    }

    const returnType = formulaField.returnType || 'number';
    const format = formulaField.format || {};

    switch (returnType) {
      case 'number':
      case 'currency': {
        const numValue = this._toNumber(value);
        if (isNaN(numValue)) return '';

        const decimals = format.decimals !== undefined ? format.decimals : 2;
        let formatted = numValue.toFixed(decimals);

        if (format.prefix) formatted = format.prefix + formatted;
        if (format.suffix) formatted = formatted + format.suffix;

        return formatted;
      }

      case 'date': {
        const date = this._toDate(value);
        const dateFormat = format.dateFormat || 'YYYY-MM-DD';

        // Basic date formatting
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return dateFormat
          .replace('YYYY', year)
          .replace('MM', month)
          .replace('DD', day);
      }

      case 'boolean':
        return this._toBoolean(value) ? 'Yes' : 'No';

      case 'text':
      default:
        return this._toString(value);
    }
  }

  /**
   * Calculate and cache result
   * @param {Object} formulaField - FormulaField document
   * @param {Object} record - Record data
   * @param {String} firmId - Firm ID
   * @returns {Promise<*>} Calculated result
   */
  async calculateAndCache(formulaField, record, firmId) {
    const cacheKey = `formula:${firmId}:${formulaField._id}:${record._id || record.id}`;

    try {
      // Check cache if enabled
      if (formulaField.cacheEnabled) {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug('Formula cache hit', { cacheKey });
          return cached;
        }
      }

      // Evaluate formula
      const result = await this.evaluate(
        formulaField.formula,
        record,
        formulaField.entityType
      );

      // Store in cache if enabled
      if (formulaField.cacheEnabled) {
        await cacheService.set(cacheKey, result, CACHE_TTL);
        logger.debug('Formula cached', { cacheKey, result });
      }

      return result;
    } catch (error) {
      logger.error('Calculate and cache failed', {
        error: error.message,
        formulaId: formulaField._id,
        recordId: record._id || record.id
      });
      throw error;
    }
  }

  /**
   * Invalidate cache when dependent field changes
   * @param {String} entityType - Entity type
   * @param {String} recordId - Record ID
   * @param {Array<String>} changedFields - Changed field names
   * @param {String} firmId - Firm ID
   * @returns {Promise<Number>} Number of cache entries invalidated
   */
  async invalidateCache(entityType, recordId, changedFields, firmId) {
    try {
      // Find formulas that depend on changed fields
      const formulas = await FormulaField.find({
        firmId,
        entityType,
        isActive: true,
        cacheEnabled: true,
        dependencies: { $in: changedFields }
      });

      if (formulas.length === 0) {
        return 0;
      }

      // Delete cache entries for affected formulas
      let deletedCount = 0;
      for (const formula of formulas) {
        const cacheKey = `formula:${firmId}:${formula._id}:${recordId}`;
        await cacheService.del(cacheKey);
        deletedCount++;
      }

      logger.info('Formula cache invalidated', {
        entityType,
        recordId,
        changedFields,
        formulasAffected: formulas.length,
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('Cache invalidation failed', {
        error: error.message,
        entityType,
        recordId,
        changedFields
      });
      return 0;
    }
  }

  /**
   * Get all formula values for a record
   * @param {String} entityType - Entity type
   * @param {String} recordId - Record ID
   * @param {String} firmId - Firm ID
   * @param {Object} record - Record data (optional, will be fetched if not provided)
   * @returns {Promise<Object>} Map of formula name -> value
   */
  async getFormulaValues(entityType, recordId, firmId, record = null) {
    try {
      // Get all active formulas for entity type
      const formulas = await FormulaField.getActiveFormulas(firmId, entityType);

      if (formulas.length === 0) {
        return {};
      }

      // If record not provided, we need to fetch it
      // This would require knowledge of the model, so we'll assume it's provided
      if (!record) {
        logger.warn('Record not provided for formula calculation', {
          entityType,
          recordId
        });
        return {};
      }

      // Calculate each formula
      const results = {};
      for (const formula of formulas) {
        try {
          const value = await this.calculateAndCache(formula, record, firmId);
          results[formula.name] = {
            raw: value,
            formatted: this.formatResult(value, formula),
            returnType: formula.returnType
          };
        } catch (error) {
          logger.error('Formula calculation failed', {
            error: error.message,
            formulaName: formula.name,
            recordId
          });
          results[formula.name] = {
            raw: null,
            formatted: '',
            error: error.message
          };
        }
      }

      return results;
    } catch (error) {
      logger.error('Get formula values failed', {
        error: error.message,
        entityType,
        recordId
      });
      throw error;
    }
  }
}

// Export as singleton
module.exports = new FormulaService();
