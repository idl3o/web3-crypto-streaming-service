/**
 * DateTime Service
 * 
 * Provides utilities for date/time operations, formatting, and timezone handling
 * throughout the application.
 */

// Default format strings
const FORMAT = {
    FULL_DATE: 'MMMM d, yyyy',
    SHORT_DATE: 'MMM d, yyyy',
    MINI_DATE: 'MM/dd/yyyy',
    ISO_DATE: 'yyyy-MM-dd',
    TIME: 'HH:mm',
    TIME_WITH_SECONDS: 'HH:mm:ss',
    DATETIME: 'MMM d, yyyy HH:mm',
    FULL_DATETIME: 'MMMM d, yyyy HH:mm:ss',
    RELATIVE: 'relative'
};

// Timezone options
const TIMEZONE = {
    UTC: 'UTC',
    LOCAL: 'local',
    BLOCKCHAIN: 'blockchain'  // Ethereum/blockchain timestamps
};

/**
 * Format a date with the specified format
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string or predefined format
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = FORMAT.FULL_DATE, options = {}) {
    if (!date) return '';

    // Convert to Date object if string or timestamp
    const dateObj = ensureDate(date);
    if (!dateObj) return '';

    // Handle relative time format
    if (format === FORMAT.RELATIVE) {
        return getRelativeTimeString(dateObj);
    }

    // Use predefined format if provided
    const formatString = FORMAT[format] || format;

    // Apply timezone if specified
    if (options.timezone) {
        return formatWithTimezone(dateObj, formatString, options.timezone);
    }

    // Default formatting
    try {
        const opts = {
            year: 'numeric',
            month: formatString.includes('MMMM') ? 'long' : formatString.includes('MMM') ? 'short' : '2-digit',
            day: formatString.includes('dd') ? '2-digit' : 'numeric'
        };

        if (formatString.includes('HH') || formatString.includes('hh')) {
            opts.hour = '2-digit';
            opts.minute = '2-digit';
        }

        if (formatString.includes('ss')) {
            opts.second = '2-digit';
        }

        return new Intl.DateTimeFormat(options.locale || 'en-US', opts).format(dateObj);
    } catch (error) {
        console.error('Date formatting error:', error);
        return dateObj.toLocaleString();
    }
}

/**
 * Format a date for blockchain display (compatible with block explorers)
 * 
 * @param {Date|string|number} date - Date to format 
 * @param {Object} options - Formatting options
 * @returns {string} Formatted blockchain date
 */
export function formatBlockchainDate(date, options = {}) {
    return formatDate(date, options.format || FORMAT.FULL_DATETIME, {
        ...options,
        timezone: TIMEZONE.UTC
    });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * 
 * @param {Date|string|number} date - Date to compare with now
 * @param {Object} options - Formatting options
 * @returns {string} Relative time string
 */
export function getRelativeTimeString(date, options = {}) {
    const dateObj = ensureDate(date);
    if (!dateObj) return '';

    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    const rtf = new Intl.RelativeTimeFormat(options.locale || 'en', {
        numeric: options.always ? 'always' : 'auto',
        style: options.style || 'long'
    });

    if (Math.abs(diffYears) >= 1) {
        return rtf.format(diffYears, 'year');
    } else if (Math.abs(diffMonths) >= 1) {
        return rtf.format(diffMonths, 'month');
    } else if (Math.abs(diffDays) >= 1) {
        return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
        return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffMins) >= 1) {
        return rtf.format(diffMins, 'minute');
    } else {
        return rtf.format(diffSecs, 'second');
    }
}

/**
 * Parse a date string or timestamp into a Date object
 * 
 * @param {string|number} input - Date string or timestamp
 * @param {Object} options - Parsing options
 * @returns {Date} Parsed date object
 */
export function parseDate(input, options = {}) {
    if (!input) return null;

    try {
        if (typeof input === 'number') {
            // Handle blockchain timestamps (in seconds)
            if (options.blockchain && input < 10000000000) {
                return new Date(input * 1000);
            }
            return new Date(input);
        }

        if (typeof input === 'string') {
            // Try ISO format first
            const date = new Date(input);
            if (!isNaN(date.getTime())) {
                return date;
            }

            // Try other formats if specified
            if (options.format) {
                // Here we would use a date parsing library for custom formats
                // For now, fall back to built-in parser
                return new Date(input);
            }
        }

        return null;
    } catch (error) {
        console.error('Date parsing error:', error);
        return null;
    }
}

/**
 * Check if a date is valid
 * 
 * @param {Date|string|number} date - Date to validate
 * @returns {boolean} Whether the date is valid
 */
export function isValidDate(date) {
    const dateObj = ensureDate(date);
    return dateObj !== null && !isNaN(dateObj.getTime());
}

/**
 * Get start of day for a given date
 * 
 * @param {Date|string|number} date - Input date
 * @returns {Date} Date set to start of day
 */
export function startOfDay(date) {
    const dateObj = ensureDate(date || new Date());
    if (!dateObj) return new Date();

    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
}

/**
 * Get end of day for a given date
 * 
 * @param {Date|string|number} date - Input date
 * @returns {Date} Date set to end of day
 */
export function endOfDay(date) {
    const dateObj = ensureDate(date || new Date());
    if (!dateObj) return new Date();

    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
}

/**
 * Add time to a date
 * 
 * @param {Date|string|number} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (day, month, year, hour, minute, second)
 * @returns {Date} New date with added time
 */
export function addTime(date, amount, unit) {
    const dateObj = ensureDate(date);
    if (!dateObj) return new Date();

    const result = new Date(dateObj);

    switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
            result.setFullYear(result.getFullYear() + amount);
            break;
        case 'month':
        case 'months':
            result.setMonth(result.getMonth() + amount);
            break;
        case 'day':
        case 'days':
            result.setDate(result.getDate() + amount);
            break;
        case 'hour':
        case 'hours':
            result.setHours(result.getHours() + amount);
            break;
        case 'minute':
        case 'minutes':
            result.setMinutes(result.getMinutes() + amount);
            break;
        case 'second':
        case 'seconds':
            result.setSeconds(result.getSeconds() + amount);
            break;
        default:
            console.error(`Unknown time unit: ${unit}`);
    }

    return result;
}

/**
 * Get the difference between two dates
 * 
 * @param {Date|string|number} dateA - First date
 * @param {Date|string|number} dateB - Second date
 * @param {string} unit - Unit for result (days, hours, minutes, seconds, milliseconds)
 * @returns {number} Difference in the specified unit
 */
export function getDateDiff(dateA, dateB, unit = 'days') {
    const a = ensureDate(dateA);
    const b = ensureDate(dateB);

    if (!a || !b) return 0;

    const diffMs = a.getTime() - b.getTime();

    switch (unit.toLowerCase()) {
        case 'day':
        case 'days':
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case 'hour':
        case 'hours':
            return Math.floor(diffMs / (1000 * 60 * 60));
        case 'minute':
        case 'minutes':
            return Math.floor(diffMs / (1000 * 60));
        case 'second':
        case 'seconds':
            return Math.floor(diffMs / 1000);
        case 'millisecond':
        case 'milliseconds':
            return diffMs;
        default:
            console.error(`Unknown time unit: ${unit}`);
            return diffMs;
    }
}

/**
 * Format a date range
 * 
 * @param {Date|string|number} startDate - Range start date
 * @param {Date|string|number} endDate - Range end date
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDate, endDate, options = {}) {
    const start = ensureDate(startDate);
    const end = ensureDate(endDate);

    if (!start || !end) return '';

    const format = options.format || FORMAT.SHORT_DATE;
    const separator = options.separator || ' – ';

    // If dates are on the same day and format includes time
    if (format.includes('HH') || format.includes('hh')) {
        if (start.toDateString() === end.toDateString()) {
            // Same day, show date once with time range
            const dateStr = formatDate(start, FORMAT.SHORT_DATE);
            const startTimeStr = formatDate(start, FORMAT.TIME);
            const endTimeStr = formatDate(end, FORMAT.TIME);
            return `${dateStr}, ${startTimeStr}${separator}${endTimeStr}`;
        }
    }

    // Default: show full range
    return `${formatDate(start, format)}${separator}${formatDate(end, format)}`;
}

/**
 * Get common date range options
 * 
 * @returns {Array} Predefined date range options
 */
export function getCommonDateRanges() {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(addTime(today, -1, 'day'));
    const lastWeekStart = startOfDay(addTime(today, -6, 'day'));
    const lastMonthStart = startOfDay(addTime(today, -1, 'month'));
    const lastQuarterStart = startOfDay(addTime(today, -3, 'month'));
    const lastYearStart = startOfDay(addTime(today, -1, 'year'));
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return [
        { label: 'Today', start: today, end: now },
        { label: 'Yesterday', start: yesterday, end: endOfDay(yesterday) },
        { label: 'Last 7 days', start: lastWeekStart, end: now },
        { label: 'Last 30 days', start: lastMonthStart, end: now },
        { label: 'Last 90 days', start: lastQuarterStart, end: now },
        { label: 'Last 365 days', start: lastYearStart, end: now },
        { label: 'This month', start: monthStart, end: now },
        { label: 'This year', start: yearStart, end: now },
        { label: 'All time', start: new Date(2000, 0, 1), end: now }
    ];
}

/**
 * Check if a date is between two other dates
 * 
 * @param {Date|string|number} date - Date to check
 * @param {Date|string|number} startDate - Range start
 * @param {Date|string|number} endDate - Range end
 * @param {boolean} inclusive - Whether to include range boundaries
 * @returns {boolean} Whether date is in range
 */
export function isDateInRange(date, startDate, endDate, inclusive = true) {
    const dateObj = ensureDate(date);
    const start = ensureDate(startDate);
    const end = ensureDate(endDate);

    if (!dateObj || !start || !end) return false;

    const dateTime = dateObj.getTime();

    if (inclusive) {
        return dateTime >= start.getTime() && dateTime <= end.getTime();
    } else {
        return dateTime > start.getTime() && dateTime < end.getTime();
    }
}

// Helper functions
function ensureDate(input) {
    if (!input) return null;

    if (input instanceof Date) {
        return input;
    }

    try {
        // Handle timestamp (number)
        if (typeof input === 'number') {
            return new Date(input);
        }

        // Handle string
        if (typeof input === 'string') {
            const date = new Date(input);
            return isNaN(date.getTime()) ? null : date;
        }

        return null;
    } catch (error) {
        console.error('Error converting to date:', error);
        return null;
    }
}

function formatWithTimezone(date, formatString, timezone) {
    try {
        // For blockchain/UTC timezone
        if (timezone === TIMEZONE.UTC || timezone === TIMEZONE.BLOCKCHAIN) {
            const opts = { timeZone: 'UTC' };

            if (formatString.includes('y')) opts.year = 'numeric';
            if (formatString.includes('M')) opts.month = formatString.includes('MMMM') ? 'long' : formatString.includes('MMM') ? 'short' : '2-digit';
            if (formatString.includes('d')) opts.day = formatString.includes('dd') ? '2-digit' : 'numeric';
            if (formatString.includes('H') || formatString.includes('h')) {
                opts.hour = '2-digit';
                opts.minute = '2-digit';
            }
            if (formatString.includes('s')) opts.second = '2-digit';

            return new Intl.DateTimeFormat('en-US', opts).format(date);
        }

        // Default to local timezone
        return date.toLocaleString();
    } catch (error) {
        console.error('Timezone formatting error:', error);
        return date.toLocaleString();
    }
}

// Export constants
export { FORMAT, TIMEZONE };

// Default export
export default {
    formatDate,
    formatBlockchainDate,
    getRelativeTimeString,
    parseDate,
    isValidDate,
    startOfDay,
    endOfDay,
    addTime,
    getDateDiff,
    formatDateRange,
    getCommonDateRanges,
    isDateInRange,
    FORMAT,
    TIMEZONE
};
