const fetch = require('node-fetch');

// Replace with your GitHub token
const GITHUB_TOKEN = '***REMOVED***'; // REQUIRED

// Replace with any GitHub username
const GITHUB_USERNAME = 'funinkina';

// Get ISO date strings for the last 7 days
function getLast7DaysISO() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]); // 'YYYY-MM-DD'
    }
    return dates;
}

async function fetchDailyContributions(username) {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const query = `
    query {
      user(login: "${username}") {
        contributionsCollection(from: "${from}", to: "${to}") {
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
    }
  `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `bearer ${GITHUB_TOKEN}`
        },
        body: JSON.stringify({ query })
    });

    const result = await response.json();
    if (result.errors) {
        console.error('Error:', result.errors);
        return;
    }

    const days =
        result.data.user.contributionsCollection.contributionCalendar.weeks
            .flatMap(week => week.contributionDays)
            .filter(day => getLast7DaysISO().includes(day.date));

    for (const day of days) {
        console.log(`${day.date}: ${day.contributionCount} contributions`);
    }
}

fetchDailyContributions(GITHUB_USERNAME);
