import axios from "axios";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { recordings, downloadPath } = req.body;

    if (!recordings || !downloadPath) {
        return res.status(400).json({ error: "Missing recordings or download path" });
    }

    async function downloadFile(url, fileName) {
        const filePath = path.join(downloadPath, fileName);

        // Skip if file already exists
        if (fs.existsSync(filePath)) {
            return { fileName, status: "Already downloaded" };
        }

        try {
            const response = await axios({
                url,
                method: "GET",
                responseType: "stream",
            });

            response.data.pipe(fs.createWriteStream(filePath));

            return { fileName, status: "Downloaded successfully" };
        } catch (error) {
            console.error(`Error downloading ${fileName}:`, error);
            return { fileName, status: "Download failed" };
        }
    }

    const batchSize = 5; // Download 5 at a time
    let results = [];

    for (let i = 0; i < recordings.length; i += batchSize) {
        const batch = recordings.slice(i, i + batchSize);
        console.log(`Downloading batch ${i / batchSize + 1}...`);

        const batchResults = await Promise.all(
            batch.map((file) => downloadFile(file.download_url, `${file.title}.m4a`))
        );

        results.push(...batchResults);

        // Notify when batch is complete
        console.log(`Batch ${i / batchSize + 1} completed.`);
        res.status(200).json({ message: `Batch ${i / batchSize + 1} downloaded`, results });
        return; // Stop after the first batch to allow continuation via UI
    }
}