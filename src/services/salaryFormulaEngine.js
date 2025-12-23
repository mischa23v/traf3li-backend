/**
 * Salary Formula Engine
 *
 * A safe expression evaluator for salary component formulas.
 * Supports mathematical operations and payroll-specific variables.
 *
 * Supported Variables:
 * - basic: Basic salary
 * - gross: Gross salary
 * - net: Net salary
 * - housing: Housing allowance
 * - transport: Transportation allowance
 * - worked_days: Days worked in the period
 * - total_days: Total days in the period
 * - worked_hours: Hours worked
 * - overtime_hours: Overtime hours
 * - hourly_rate: Calculated hourly rate
 * - daily_rate: Calculated daily rate
 * - service_years: Years of service
 * - service_months: Months of service
 * - absence_days: Days absent
 * - late_hours: Hours late
 *
 * Supported Functions:
 * - min(a, b): Minimum of two values
 * - max(a, b): Maximum of two values
 * - round(value, decimals): Round to decimals
 * - floor(value): Round down
 * - ceil(value): Round up
 * - abs(value): Absolute value
 * - if(condition, trueVal, falseVal): Conditional
 * - percent(value, rate): Calculate percentage
 * - prorate(amount, worked, total): Prorate calculation
 *
 * Example Formulas:
 * - "basic * 0.25" - 25% of basic
 * - "min(basic * 0.1, 2000)" - 10% of basic capped at 2000
 * - "hourly_rate * overtime_hours * 1.5" - Overtime at 1.5x
 * - "if(service_years >= 5, basic * 0.1, basic * 0.05)" - Seniority bonus
 * - "prorate(basic, worked_days, total_days)" - Prorated basic
 *
 * @module services/salaryFormulaEngine
 */

/**
 * Tokenize a formula string
 * @param {string} formula - Formula string
 * @returns {Array} Array of tokens
 */
function tokenize(formula) {
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
function parse(tokens) {
    let pos = 0;

    function parseExpression() {
        return parseOr();
    }

    function parseOr() {
        let left = parseAnd();
        while (pos < tokens.length && tokens[pos] === '||') {
            pos++;
            const right = parseAnd();
            left = { type: 'binary', op: '||', left, right };
        }
        return left;
    }

    function parseAnd() {
        let left = parseComparison();
        while (pos < tokens.length && tokens[pos] === '&&') {
            pos++;
            const right = parseComparison();
            left = { type: 'binary', op: '&&', left, right };
        }
        return left;
    }

    function parseComparison() {
        let left = parseAddSub();
        while (pos < tokens.length && ['>', '<', '>=', '<=', '==', '!='].includes(tokens[pos])) {
            const op = tokens[pos++];
            const right = parseAddSub();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    function parseAddSub() {
        let left = parseMulDiv();
        while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
            const op = tokens[pos++];
            const right = parseMulDiv();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    function parseMulDiv() {
        let left = parseUnary();
        while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
            const op = tokens[pos++];
            const right = parseUnary();
            left = { type: 'binary', op, left, right };
        }
        return left;
    }

    function parseUnary() {
        if (tokens[pos] === '-') {
            pos++;
            const arg = parseUnary();
            return { type: 'unary', op: '-', arg };
        }
        return parsePrimary();
    }

    function parsePrimary() {
        const token = tokens[pos];

        // Number
        if (/^-?\d+(\.\d+)?$/.test(token)) {
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
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
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

        throw new Error(`Unexpected token: ${token}`);
    }

    const ast = parseExpression();

    if (pos < tokens.length) {
        throw new Error(`Unexpected token: ${tokens[pos]}`);
    }

    return ast;
}

/**
 * Evaluate an AST node
 * @param {Object} node - AST node
 * @param {Object} context - Variable values
 * @returns {number} Calculated value
 */
function evaluate(node, context) {
    switch (node.type) {
        case 'number':
            return node.value;

        case 'variable': {
            const value = context[node.name];
            if (value === undefined) {
                console.warn(`Unknown variable: ${node.name}, using 0`);
                return 0;
            }
            return typeof value === 'number' ? value : parseFloat(value) || 0;
        }

        case 'unary':
            if (node.op === '-') {
                return -evaluate(node.arg, context);
            }
            throw new Error(`Unknown unary operator: ${node.op}`);

        case 'binary': {
            const left = evaluate(node.left, context);
            const right = evaluate(node.right, context);

            switch (node.op) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return right !== 0 ? left / right : 0;
                case '%': return right !== 0 ? left % right : 0;
                case '>': return left > right ? 1 : 0;
                case '<': return left < right ? 1 : 0;
                case '>=': return left >= right ? 1 : 0;
                case '<=': return left <= right ? 1 : 0;
                case '==': return left === right ? 1 : 0;
                case '!=': return left !== right ? 1 : 0;
                case '&&': return (left && right) ? 1 : 0;
                case '||': return (left || right) ? 1 : 0;
                default:
                    throw new Error(`Unknown binary operator: ${node.op}`);
            }
        }

        case 'function': {
            const args = node.args.map(arg => evaluate(arg, context));

            switch (node.name.toLowerCase()) {
                case 'min':
                    return Math.min(...args);
                case 'max':
                    return Math.max(...args);
                case 'round':
                    return args.length > 1
                        ? Math.round(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1])
                        : Math.round(args[0]);
                case 'floor':
                    return Math.floor(args[0]);
                case 'ceil':
                    return Math.ceil(args[0]);
                case 'abs':
                    return Math.abs(args[0]);
                case 'if':
                    return args[0] ? args[1] : (args[2] || 0);
                case 'percent':
                    return (args[0] * args[1]) / 100;
                case 'prorate':
                    return args[2] > 0 ? (args[0] * args[1]) / args[2] : 0;
                case 'sum':
                    return args.reduce((a, b) => a + b, 0);
                case 'avg':
                    return args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0;
                case 'power':
                case 'pow':
                    return Math.pow(args[0], args[1] || 1);
                case 'sqrt':
                    return Math.sqrt(args[0]);
                default:
                    throw new Error(`Unknown function: ${node.name}`);
            }
        }

        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}

/**
 * Validate a formula string
 * @param {string} formula - Formula to validate
 * @returns {Object} Validation result { valid: boolean, error?: string, variables?: string[] }
 */
function validateFormula(formula) {
    try {
        const tokens = tokenize(formula);
        const ast = parse(tokens);

        // Extract variables
        const variables = new Set();
        function extractVariables(node) {
            if (node.type === 'variable') {
                variables.add(node.name);
            } else if (node.type === 'binary') {
                extractVariables(node.left);
                extractVariables(node.right);
            } else if (node.type === 'unary') {
                extractVariables(node.arg);
            } else if (node.type === 'function') {
                node.args.forEach(extractVariables);
            }
        }
        extractVariables(ast);

        return {
            valid: true,
            variables: Array.from(variables)
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Calculate formula value
 * @param {string} formula - Formula string
 * @param {Object} context - Variable values
 * @returns {number} Calculated value
 */
function calculateFormula(formula, context = {}) {
    if (!formula || typeof formula !== 'string') {
        return 0;
    }

    try {
        const tokens = tokenize(formula.trim());
        const ast = parse(tokens);
        return evaluate(ast, context);
    } catch (error) {
        console.error(`Formula evaluation error: ${error.message}`, { formula, context });
        return 0;
    }
}

/**
 * Build context for salary calculation
 * @param {Object} employee - Employee data
 * @param {Object} earnings - Current earnings totals
 * @param {Object} period - Pay period data
 * @returns {Object} Context object for formula evaluation
 */
function buildSalaryContext(employee = {}, earnings = {}, period = {}) {
    const basic = employee.basicSalary || employee.basic || 0;
    const housing = employee.housingAllowance || earnings.housing || 0;
    const transport = employee.transportAllowance || earnings.transport || 0;

    // Calculate gross
    const gross = earnings.totalEarnings || (basic + housing + transport);

    // Calculate deductions (if available)
    const deductions = earnings.totalDeductions || 0;
    const net = gross - deductions;

    // Calculate rates
    const totalDays = period.totalDays || 30;
    const workedDays = period.workedDays || totalDays;
    const totalHours = period.totalHours || (totalDays * 8);
    const workedHours = period.workedHours || (workedDays * 8);

    const dailyRate = totalDays > 0 ? basic / totalDays : 0;
    const hourlyRate = totalHours > 0 ? basic / totalHours : 0;

    // Service calculation
    const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : null;
    let serviceYears = 0;
    let serviceMonths = 0;
    if (joiningDate) {
        const now = new Date();
        const diffMs = now - joiningDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        serviceYears = Math.floor(diffDays / 365);
        serviceMonths = Math.floor(diffDays / 30);
    }

    return {
        // Salary amounts
        basic,
        housing,
        transport,
        gross,
        net,

        // Rates
        daily_rate: dailyRate,
        hourly_rate: hourlyRate,
        dailyRate, // alias
        hourlyRate, // alias

        // Period info
        total_days: totalDays,
        worked_days: workedDays,
        totalDays, // alias
        workedDays, // alias
        total_hours: totalHours,
        worked_hours: workedHours,
        overtime_hours: period.overtimeHours || 0,
        overtimeHours: period.overtimeHours || 0, // alias

        // Attendance
        absence_days: period.absenceDays || 0,
        absenceDays: period.absenceDays || 0, // alias
        late_hours: period.lateHours || 0,
        lateHours: period.lateHours || 0, // alias

        // Service
        service_years: serviceYears,
        service_months: serviceMonths,
        serviceYears, // alias
        serviceMonths, // alias

        // Employee details
        employee_grade: employee.grade || 0,
        grade: employee.grade || 0,

        // Custom components (can be extended)
        ...earnings.components
    };
}

/**
 * Get list of supported variables
 * @returns {Array} List of variable names with descriptions
 */
function getSupportedVariables() {
    return [
        { name: 'basic', description: 'Basic salary', descriptionAr: 'الراتب الأساسي' },
        { name: 'housing', description: 'Housing allowance', descriptionAr: 'بدل السكن' },
        { name: 'transport', description: 'Transportation allowance', descriptionAr: 'بدل المواصلات' },
        { name: 'gross', description: 'Gross salary', descriptionAr: 'إجمالي الراتب' },
        { name: 'net', description: 'Net salary', descriptionAr: 'صافي الراتب' },
        { name: 'daily_rate', description: 'Daily rate', descriptionAr: 'المعدل اليومي' },
        { name: 'hourly_rate', description: 'Hourly rate', descriptionAr: 'المعدل بالساعة' },
        { name: 'total_days', description: 'Total days in period', descriptionAr: 'إجمالي أيام الفترة' },
        { name: 'worked_days', description: 'Days worked', descriptionAr: 'أيام العمل' },
        { name: 'worked_hours', description: 'Hours worked', descriptionAr: 'ساعات العمل' },
        { name: 'overtime_hours', description: 'Overtime hours', descriptionAr: 'ساعات العمل الإضافي' },
        { name: 'absence_days', description: 'Days absent', descriptionAr: 'أيام الغياب' },
        { name: 'late_hours', description: 'Hours late', descriptionAr: 'ساعات التأخير' },
        { name: 'service_years', description: 'Years of service', descriptionAr: 'سنوات الخدمة' },
        { name: 'service_months', description: 'Months of service', descriptionAr: 'أشهر الخدمة' },
        { name: 'grade', description: 'Employee grade', descriptionAr: 'درجة الموظف' }
    ];
}

/**
 * Get list of supported functions
 * @returns {Array} List of function names with descriptions
 */
function getSupportedFunctions() {
    return [
        { name: 'min', syntax: 'min(a, b)', description: 'Minimum of two values' },
        { name: 'max', syntax: 'max(a, b)', description: 'Maximum of two values' },
        { name: 'round', syntax: 'round(value, decimals)', description: 'Round to decimals' },
        { name: 'floor', syntax: 'floor(value)', description: 'Round down' },
        { name: 'ceil', syntax: 'ceil(value)', description: 'Round up' },
        { name: 'abs', syntax: 'abs(value)', description: 'Absolute value' },
        { name: 'if', syntax: 'if(condition, trueVal, falseVal)', description: 'Conditional' },
        { name: 'percent', syntax: 'percent(value, rate)', description: 'Calculate percentage' },
        { name: 'prorate', syntax: 'prorate(amount, worked, total)', description: 'Prorate calculation' },
        { name: 'sum', syntax: 'sum(a, b, ...)', description: 'Sum of values' },
        { name: 'avg', syntax: 'avg(a, b, ...)', description: 'Average of values' },
        { name: 'pow', syntax: 'pow(base, exponent)', description: 'Power calculation' },
        { name: 'sqrt', syntax: 'sqrt(value)', description: 'Square root' }
    ];
}

module.exports = {
    calculateFormula,
    validateFormula,
    buildSalaryContext,
    getSupportedVariables,
    getSupportedFunctions
};
