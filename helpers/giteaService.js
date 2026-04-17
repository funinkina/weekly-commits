"use strict";
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import { getDates } from './githubService.js';

/**
 * @param {string} username
 * @param {string} token
 * @param {boolean} showCurrentWeekOnly
 * @param {number} weekStartDay
 * @param {string} instanceUrl - Base URL of the Gitea/Forgejo instance (e.g. https://gitea.example.com)
 * @returns {Promise<number[]>}
 */
export async function fetchContributions(username, token, showCurrentWeekOnly = false, weekStartDay = 1, instanceUrl = '') {
    if (!username) {
        console.error('Weekly Commits Extension: Username is not configured.');
        return Array(7).fill(0);
    }

    const baseUrl = instanceUrl.replace(/\/+$/, '');
    if (!baseUrl) {
        console.error('Weekly Commits Extension: Gitea/Forgejo instance URL is not configured.');
        return Array(7).fill(0);
    }

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay);

    const url = `${baseUrl}/api/v1/users/${encodeURIComponent(username)}/heatmap`;
    const session = new Soup.Session();
    const message = Soup.Message.new('GET', url);
    if (!message) {
        throw new Error('Failed to create Soup.Message');
    }

    if (token) {
        message.request_headers.append('Authorization', `token ${token}`);
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
        const errorMsg = `Gitea/Forgejo API returned HTTP ${statusCode}`;
        console.error(`Weekly Commits Extension: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    const responseStr = new TextDecoder().decode(responseBytes.get_data());
    const result = JSON.parse(responseStr);

    if (!Array.isArray(result)) {
        console.error('Weekly Commits Extension: Unexpected Gitea/Forgejo API response structure:', result);
        throw new Error('Unexpected API response structure.');
    }

    // Build a map of date string (YYYY-MM-DD local) -> contribution count.
    // Gitea returns Unix timestamps (seconds). We use local timezone here to
    // stay consistent with getDates(), which also produces local-timezone date
    // strings.  Using a different timezone on either side would cause off-by-one
    // day mismatches for users not in UTC.
    const contributionMap = new Map();
    result.forEach(entry => {
        const date = new Date(entry.timestamp * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        // Accumulate in case multiple entries map to the same local date
        contributionMap.set(dateStr, (contributionMap.get(dateStr) || 0) + (entry.contributions || 0));
    });

    return targetDates.map(date => contributionMap.get(date) || 0);
}
