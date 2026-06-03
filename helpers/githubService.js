import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import { getDates, toLocalDateString } from './dateUtils.js';
import { session, USER_AGENT } from './http.js';

/**
 * @param {string} username
 * @param {string} token
 * @param {boolean} showCurrentWeekOnly
 * @param {number} weekStartDay
 * @returns {Promise<number[]>} 
 */
export async function fetchContributions(username, token, showCurrentWeekOnly = false, weekStartDay = 1) {
    if (!token || !username) {
        console.error('Weekly Commits Extension: GitHub token or username is not configured.');
        return Array(7).fill(0);
    }

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay);

    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 10);
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 3);
    const queryFromDate = fromDate.toISOString();
    const queryToDate = toDate.toISOString();

    // Pass user input as GraphQL variables rather than interpolating it into
    // the query string, so unusual usernames can't alter the query structure.
    const query = `
    query ($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
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
    const variables = { login: username, from: queryFromDate, to: queryToDate };

    const message = Soup.Message.new('POST', 'https://api.github.com/graphql');
    if (!message) {
        throw new Error('Failed to create Soup.Message');
    }
    message.request_headers.append('Authorization', `bearer ${token}`);
    message.request_headers.append('Content-Type', 'application/json');
    message.request_headers.append('User-Agent', USER_AGENT);

    const queryBytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify({ query, variables })));
    message.set_request_body_from_bytes('application/json', queryBytes);

    let responseBytes;
    try {
        responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    } catch (e) {
        console.error(`Weekly Commits Extension: Network error - ${e.message}`);
        throw e;
    }

    const statusCode = message.get_status();
    if (statusCode !== 200) {
        const errorMsg = `GitHub API returned HTTP ${statusCode}`;
        console.error(`Weekly Commits Extension: ${errorMsg}`);
        throw new Error(errorMsg);
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