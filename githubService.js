import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

export function getLast7DaysISO() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

/**
 * @param {string} username
 * @param {string} token
 * @returns {Promise<number[]>} 
 */
export async function fetchWeeklyContributions(username, token) {
    if (!token || token === 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN' || !username || username === 'YOUR_GITHUB_USERNAME') {
        console.error('Weekly Commits Extension: GitHub token or username is not configured.');
        return Array(7).fill(0);
    }

    const targetDates = getLast7DaysISO();
    const queryFromDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
    const queryToDate = new Date().toISOString();

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