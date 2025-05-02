import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import archiver from "archiver";
import {getZoomAccessToken} from "../../utils/getZoomAccessToken"
const accessToken = await getZoomAccessToken();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recordings } = req.body;
    if (!recordings || recordings.length === 0) {
      return res.status(400).json({ error: "No recordings provided" });
    }

    const zipFileName = `zoom_recordings_${Date.now()}.zip`;
    const zipPath = path.join(os.tmpdir(), zipFileName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    for (const rec of recordings) {
      const file = rec.recording_files.find(f => f.file_type === "M4A" || f.file_type === "MP4");
      if (!file) continue;

    //   const response = await axios.get(file.download_url, { responseType: "stream" });
    

    const response = await axios.get(`${file.download_url}?access_token=${accessToken}`, {
    responseType: "stream"
    });


      const sanitizedTitle = rec.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${sanitizedTitle}.${file.file_type.toLowerCase()}`;

      archive.append(response.data, { name: fileName });
    }

    await archive.finalize();

    output.on("close", () => {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);
      const readStream = fs.createReadStream(zipPath);
      readStream.pipe(res);
    });

    output.on("error", (err) => {
      console.error("ZIP error:", err);
      res.status(500).json({ error: "Failed to create zip" });
    });

  } catch (err) {
    console.error("Download zip error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
