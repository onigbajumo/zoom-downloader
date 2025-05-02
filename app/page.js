"use client";
import { useState, useEffect } from "react";

export default function ZoomRecordingsManager() {
  const [recordings, setRecordings] = useState([]);
  const [selectedRecordings, setSelectedRecordings] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);


  const fetchRecordings = async () => {
    setLoading(true);
    const response = await fetch(`/api/recordings?from=${fromDate}&to=${toDate}`);
    const data = await response.json();
  
    // Descending by date
    const sorted = [...(data.recordings || [])].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  
    setRecordings(sorted);
    setLoading(false);
  };
  

  const handleFromDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    setFromDate(e.target.value);
    const oneMonthLater = new Date(selectedDate);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    setToDate(oneMonthLater.toISOString().split("T")[0]);
  };

  const toggleSelectRecording = (rec) => {
    if (selectedRecordings.includes(rec)) {
      setSelectedRecordings(selectedRecordings.filter((r) => r !== rec));
    } else if (selectedRecordings.length < 30) {
      setSelectedRecordings([...selectedRecordings, rec]);
    } else {
      alert("You can only select up to 30 recordings.");
    }
  };

  const triggerDownload = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSingle = (rec) => {
    const file = rec.recording_files.find((f) => f.file_type === "M4A" || f.file_type === "MP4");
    if (!file) return alert("No audio/video file found.");
    triggerDownload(file.download_url, `${rec.title}.${file.file_type.toLowerCase()}`);
  };

  const startBulkDownload = () => {
    if (selectedRecordings.length === 0) {
      alert("Select recordings to download.");
      return;
    }
  
    const downloadNext = (index) => {
      if (index >= selectedRecordings.length) {
        
        setSelectedRecordings([]);
        return;
      }
  
      const rec = selectedRecordings[index];
      const file = rec.recording_files.find((f) => f.file_type === "MP4");
  
      if (file) {
        const link = document.createElement("a");
        link.href = file.download_url;
        link.download = `${rec.title}.${file.file_type.toLowerCase()}`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  
        // Wait 3 seconds before next download
        setTimeout(() => downloadNext(index + 1), 3000);
      } else {
        // Skip and continue
        downloadNext(index + 1);
      }
    };
  
    downloadNext(0);
  };

  const downloadZip = async () => {
    if (selectedRecordings.length === 0) {
      alert("Please select recordings.");
      return;
    }
  
    setZipLoading(true);
  
    try {
      const response = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordings: selectedRecordings }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to generate zip.");
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "zoom_recordings.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSelectedRecordings([]);
    } catch (err) {
      alert(err.message);
    }
  
    setZipLoading(false);
  };
  
  
  
  

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Top Panel: Filters + Bulk Download */}
      <div className="bg-white p-4 rounded-md shadow-md mb-6">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Fetch Zoom Recording </h2>
            <div className="flex gap-2 flex-wrap">
              <input type="date" value={fromDate} onChange={handleFromDateChange} className="p-2 border rounded-md" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border rounded-md" min={fromDate} />
              <button onClick={fetchRecordings} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md">
                {loading ? "Fetching..." : "Fetch"}
              </button>
            </div>
          </div>

          {/* {selectedRecordings.length > 0 && (
            <button onClick={startBulkDownload} className="bg-green-600 text-white px-5 py-2 rounded-md h-fit">
              📥 Download Selected ({selectedRecordings.length}/10)
            </button>
          )} */}

{selectedRecordings.length > 0 && (
  <button
    onClick={downloadZip}
    disabled={zipLoading}
    className={`bg-green-600 text-white px-5 py-2 rounded-md h-fit ${zipLoading ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {zipLoading ? "Zipping..." : `📥 Download Selected as ZIP (${selectedRecordings.length}/10)`}
  </button>
)}

        </div>
      </div>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.length > 0 ? (
          recordings.map((rec, idx) => (
            <div key={idx} className="bg-white p-4 rounded-md shadow-md flex flex-col justify-between">
              <div>
                <img src="https://st1.zoom.us/fe-static/fe-recording-v3/img/default-thumbnail.B5Z-bMyG.png" className="w-full h-40 object-cover rounded-md mb-2" />
                <p className="font-bold text-gray-800 truncate">{rec.title}</p>
                <p className="text-sm text-gray-600">📅 {new Date(rec.date).toDateString()}</p>
                <p className="text-sm text-gray-600">⏳ {rec.duration}</p>
              </div>
              <div className="mt-3 space-y-2">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" checked={selectedRecordings.includes(rec)} onChange={() => toggleSelectRecording(rec)} />
                  <span className="text-sm">Select</span>
                </label>
                <button onClick={() => downloadSingle(rec)} className="w-full bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600">
                  Download Now
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full">No recordings found.</p>
        )}
      </div>
    </div>
  );
};
