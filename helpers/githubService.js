"use strict";
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

/**
 * Get the dates for display based on settings
 * @param {boolean} asISOString - Whether to return dates as ISO strings or Date objects
 * @param {boolean} showCurrentWeekOnly - Whether to show only the current week
 * @param {number} weekStartDay - Day the week starts on (0 = Sunday, 1 = Monday, etc.)
 * @returns {(string[]|Date[])} Array of dates in the requested format
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

            if (asISOString) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dates.push(`${year}-${month}-${day}`);
            } else {
                dates.push(d);
            }
        }
    } else {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            if (asISOString) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dates.push(`${year}-${month}-${day}`);
            } else {
                dates.push(d);
            }
        }
    }

    return dates;
}

/**
 * @param {string} username
 * @param {string} token
 * @param {boolean} showCurrentWeekOnly
 * @param {number} weekStartDay
 * @returns {Promise<number[]>} 
 */
export async function fetchContributions(username, token, showCurrentWeekOnly = false, weekStartDay = 1) {
    if (!token || token === 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN' || !username || username === 'YOUR_GITHUB_USERNAME') {
        console.error('Weekly Commits Extension: GitHub token or username is not configured.');
        return Array(7).fill(0);
    }

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay);

    const queryFromDate = new Date(new Date().setDate(new Date().getDate() - 10)).toISOString();
    const queryToDate = new Date(new Date().setDate(new Date().getDate() + 3)).toISOString();
    console.log(`Weekly Commits Extension: Querying contributions from ${queryFromDate} to ${queryToDate}`);

    const query = `
    query {
        user(login: "${username}") {
            contributionsCollection(from: "${queryFromDate}", to: "${queryToDate}") {
                contributionCalendar {
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                        }
                    }
                }
            }
        }
    }`;

    const session = new Soup.Session();
    const message = Soup.Message.new('POST', 'https://api.github.com/graphql');
    if (!message) {
        throw new Error('Failed to create Soup.Message');
    }
    message.request_headers.append('Authorization', `bearer ${token}`);
    message.request_headers.append('Content-Type', 'application/json');
    message.request_headers.append('User-Agent', 'GNOME Shell Extension Weekly Commits');

    const queryBytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify({ query })));
    message.set_request_body_from_bytes('application/json', queryBytes);

    let responseBytes;
    try {
        responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    } catch (e) {
        console.error(`Weekly Commits Extension: Network error - ${e.message}`);
        throw e;
    }

    const responseStr = new TextDecoder().decode(responseBytes.get_data());
    const result = JSON.parse(responseStr);

    if (result.errors) {
        console.error('Weekly Commits Extension: GitHub API Error:', result.errors);
        throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (!result.data || !result.data.user || !result.data.user.contributionsCollection) {
        console.error('Weekly Commits Extension: Unexpected API response structure:', result);
        throw new Error('Unexpected API response structure.');
    }

    const allContributionDays = result.data.user.contributionsCollection.contributionCalendar.weeks
        .flatMap(week => week.contributionDays);

    const contributionMap = new Map();
    allContributionDays.forEach(day => contributionMap.set(day.date, day.contributionCount));

    return targetDates.map(date => contributionMap.get(date) || 0);
}
