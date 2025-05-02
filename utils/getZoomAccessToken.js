import axios from "axios";
import qs from "querystring";

export async function getZoomAccessToken() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  const response = await axios.post(
    "https://zoom.us/oauth/token",
    qs.stringify({
      grant_type: "account_credentials",
      account_id: accountId
    }),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      }
    }
  );

  return response.data.access_token;
}
