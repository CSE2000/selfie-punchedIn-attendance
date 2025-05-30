import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ViewFileDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const uploadedFiles = location.state || [];

  const goBack = () => {
    navigate("/employee-info");
  };

  if (!uploadedFiles.length) {
    return (
      <div className="p-6 text-center text-red-500">
        No files uploaded to display.
        <br />
        <button
          onClick={goBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  const labelsMap = {
    panCard: "PAN Card Image",
    adharCard: "Aadhar Card Image",
    signature: "Signature Image",
    certification: "Certification Image",
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div
        className="flex items-center gap-2 cursor-pointer text-blue-600 hover:text-blue-800 mb-4"
        onClick={goBack}
      >
        <ArrowLeft className="w-5 h-5" />
        <h2 className="text-xl font-semibold">View Uploaded Images</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {uploadedFiles.map(({ name, url }, index) => (
          <div key={index} className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium mb-2">
              {labelsMap[name] || name}
            </h3>
            <img
              src={url}
              alt={labelsMap[name] || name}
              className="w-full h-auto rounded"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewFileDetail;
