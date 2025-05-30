import React, { useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DocumentCenter = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchEmpInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "https://attendancebackends.onrender.com/empinfo",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = response.data?.data;

        const formattedDocs = [
          {
            label: "Pancard",
            image: data.panImg,
            url: data.panImg,
          },
          {
            label: "Aadhaar Card",
            image: data.adharImg,
            url: data.adharImg,
          },
          {
            label: "Signature",
            image: data.signatureImage,
            url: data.signatureImage,
          },
          {
            label: "Certification",
            image: data.certificationImg,
            url: data.certificationImg,
          },
        ];

        setDocuments(formattedDocs);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    };

    fetchEmpInfo();
  }, []);

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url, {
        mode: "cors",
      });

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="md:hidden w-full p-2 max-w-md mx-auto bg-white rounded-lg shadow">
      <div className="grid grid-cols-2 gap-4">
        {documents.map((doc, index) => (
          <div key={index} className="rounded-lg overflow-hidden bg-gray-50">
            <div className="px-2 py-1 bg-white text-sm font-medium text-gray-700 flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-gray-200 rounded-full" />
              {doc.label}
            </div>

            <div className="relative">
              <img
                src={doc.image}
                alt={doc.label}
                className="w-full h-32 object-cover rounded-b"
              />

              {/* Small floating download button */}
              <button
                onClick={() => handleDownload(doc.url, `${doc.label}.jpg`)}
                className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 p-2 rounded-full text-white"
                title="Download"
              >
                <FaDownload />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-full py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DocumentCenter;
