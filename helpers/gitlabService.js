"use strict";
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import { getDates } from './githubService.js';

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
    const eventsUrl = `${baseUrl}/api/v4/users/${encodedUsername}/events?action=pushed&per_page=100`;

    const session = new Soup.Session();
    const message = Soup.Message.new('GET', eventsUrl);
    if (!message) {
        throw new Error('Failed to create Soup.Message');
    }

    if (token) {
        message.request_headers.append('PRIVATE-TOKEN', token);
    }
    message.request_headers.append('Content-Type', 'application/json');
    message.request_headers.append('User-Agent', 'GNOME Shell Extension Weekly Commits');

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

    const responseStr = new TextDecoder().decode(responseBytes.get_data());
    const events = JSON.parse(responseStr);
    if (!Array.isArray(events)) {
        console.error('Weekly Commits Extension: Unexpected GitLab API response structure:', events);
        throw new Error('Unexpected API response structure.');
    }

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay);
    const contributionMap = new Map(targetDates.map(date => [date, 0]));

    events.forEach(event => {
        if (!event || !event.created_at || event.action_name !== 'pushed to') {
            return;
        }

        const date = new Date(event.created_at);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (!contributionMap.has(dateStr)) {
            return;
        }

        let pushes;
        if (Number.isInteger(event.push_data?.commit_count)) {
            pushes = event.push_data.commit_count;
        } else {
            console.warn('Weekly Commits Extension: GitLab event missing push_data.commit_count, defaulting to 1.');
            pushes = 1;
        }
        contributionMap.set(dateStr, contributionMap.get(dateStr) + pushes);
    });

    return targetDates.map(date => contributionMap.get(date) || 0);
}
