/**
 * Format a Date as a local-timezone YYYY-MM-DD string.
 * Local time is used deliberately so all services agree on day boundaries
 * regardless of the user's timezone.
 * @param {Date} date
 * @returns {string}
 */
export function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the dates for display based on settings.
 * @param {boolean} asISOString - Return dates as YYYY-MM-DD strings vs Date objects
 * @param {boolean} showCurrentWeekOnly - Show only the current calendar week
 * @param {number} weekStartDay - Day the week starts on (0 = Sunday, 1 = Monday, …)
 * @returns {(string[]|Date[])} Array of 7 dates in the requested format
 */
export function getDates(asISOString = true, showCurrentWeekOnly = false, weekStartDay = 1) {
    const dates = [];
    const today = new Date();

    if (showCurrentWeekOnly) {
        const currentDay = today.getDay();
        let daysToSubtract = currentDay - weekStartDay;
        if (daysToSubtract < 0) daysToSubtract += 7;

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysToSubtract);

        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            dates.push(asISOString ? toLocalDateString(d) : d);
        }
    } else {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(asISOString ? toLocalDateString(d) : d);
        }
    }

    return dates;
}
