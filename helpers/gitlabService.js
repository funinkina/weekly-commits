"use strict";
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import { getDates, toLocalDateString } from './githubService.js';
import { session, USER_AGENT } from './http.js';

const PER_PAGE = 100;   // GitLab's maximum page size for the events endpoint
const MAX_PAGES = 10;   // Safety cap (1000 events) for very active accounts

/**
 * @param {string} username
 * @param {string} token
 * @param {boolean} showCurrentWeekOnly
 * @param {number} weekStartDay
 * @param {string} instanceUrl - Base URL of the GitLab instance (e.g. https://gitlab.com)
 * @returns {Promise<number[]>}
 */
export async function fetchContributions(username, token, showCurrentWeekOnly = false, weekStartDay = 1, instanceUrl = '') {
    if (!username) {
        console.error('Weekly Commits Extension: Username is not configured.');
        return Array(7).fill(0);
    }

    const baseUrl = (instanceUrl || 'https://gitlab.com').replace(/\/+$/, '');
    const encodedUsername = encodeURIComponent(username);

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay);
    const contributionMap = new Map(targetDates.map(date => [date, 0]));

    // Bound the query to the window we care about. One day of slack on the
    // lower bound absorbs timezone differences between the server's `after`
    // filter (date-only) and our local-timezone date bucketing.
    const afterDate = new Date(`${targetDates[0]}T00:00:00`);
    afterDate.setDate(afterDate.getDate() - 1);
    const after = toLocalDateString(afterDate);

    // The events endpoint paginates; loop until a short/empty page or the cap.
    for (let page = 1; page <= MAX_PAGES; page++) {
        const eventsUrl = `${baseUrl}/api/v4/users/${encodedUsername}/events`
            + `?action=pushed&after=${after}&per_page=${PER_PAGE}&page=${page}`;
        const message = Soup.Message.new('GET', eventsUrl);
        if (!message) {
            throw new Error('Failed to create Soup.Message');
        }

        if (token) {
            message.request_headers.append('PRIVATE-TOKEN', token);
        }
        message.request_headers.append('Content-Type', 'application/json');
        message.request_headers.append('User-Agent', USER_AGENT);

        let responseBytes;
        try {
            responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        } catch (e) {
            console.error(`Weekly Commits Extension: Network error - ${e.message}`);
            throw e;
        }

        const statusCode = message.get_status();
        if (statusCode !== 200) {
            const errorMsg = `GitLab API returned HTTP ${statusCode}`;
            console.error(`Weekly Commits Extension: ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const events = JSON.parse(new TextDecoder().decode(responseBytes.get_data()));
        if (!Array.isArray(events)) {
            console.error('Weekly Commits Extension: Unexpected GitLab API response structure:', events);
            throw new Error('Unexpected API response structure.');
        }

        for (const event of events) {
            if (!event || !event.created_at || event.action_name !== 'pushed to') {
                continue;
            }

            const dateStr = toLocalDateString(new Date(event.created_at));
            if (!contributionMap.has(dateStr)) {
                continue;
            }

            let commits;
            if (Number.isInteger(event.push_data?.commit_count)) {
                commits = event.push_data.commit_count;
            } else {
                console.warn('Weekly Commits Extension: GitLab event missing push_data.commit_count, defaulting to 1.');
                commits = 1;
            }
            contributionMap.set(dateStr, contributionMap.get(dateStr) + commits);
        }

        if (events.length < PER_PAGE) {
            break; // last page reached
        }
    }

    return targetDates.map(date => contributionMap.get(date) || 0);
}
