import axios from "axios";
import qs from "querystring";

const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const accountId = process.env.ZOOM_ACCOUNT_ID;

async function getAccessToken() {
    const url = "https://zoom.us/oauth/token";

    try {
        const response = await axios.post(url, qs.stringify({
            grant_type: "account_credentials",
            account_id: accountId
        }), {
            headers: {
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        return response.data.access_token;

    } catch (error) {
        console.error("Error getting access token:", error);
        throw new Error("Failed to authenticate with Zoom API");
    }
}

async function fetchRecordings(accessToken, userId, fromDate, toDate, nextPageToken = "") {
    const url = `https://api.zoom.us/v2/users/${userId}/recordings?from=${fromDate}&to=${toDate}&page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ""}`;

    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    let recordings = response.data.meetings.map(meeting => ({
        title: meeting.topic,
        duration: meeting.duration + " minutes",
        date: meeting.start_time,
        recording_files: meeting.recording_files.map(file => ({
            file_type: file.file_type,
            download_url: file.download_url
        }))
    }));

    // If there's another page, fetch more
    if (response.data.next_page_token) {
        const moreRecordings = await fetchRecordings(accessToken, userId, fromDate, toDate, response.data.next_page_token);
        recordings = recordings.concat(moreRecordings);
    }

    return recordings;
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const accessToken = await getAccessToken();
        const userId = process.env.ZOOM_USER_ID;
        const { from, to } = req.query;

        const fromDate = from || new Date().toISOString().split("T")[0];
        const toDate = to || new Date().toISOString().split("T")[0];

        const recordings = await fetchRecordings(accessToken, userId, fromDate, toDate);

        return res.status(200).json({
            total_recordings: recordings.length,
            recordings
        });

    } catch (error) {
        console.error("Error fetching recordings:", error);
        return res.status(500).json({ error: "Failed to fetch recordings" });
    }
}