import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ViewFileDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state;

  if (!file) {
    return (
      <div className="p-6 text-center text-red-500">
        No file data to display.
      </div>
    );
  }

  const goBack = () => {
    navigate("/employee-info");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div
        className="flex items-center gap-2 cursor-pointer self-start text-blue-600 hover:text-blue-800 mb-4"
        onClick={goBack}
      >
        <ArrowLeft className="w-5 h-5" />
        <h2 className="text-xl font-semibold">View File Details</h2>
      </div>

      {file.type.startsWith("image/") ? (
        <img
          src={file.url}
          alt="Preview"
          className="max-w-full h-auto rounded shadow-lg"
        />
      ) : (
        <iframe
          src={file.url}
          title="Document Preview"
          className="w-full max-w-3xl h-[500px] border rounded"
        />
      )}
    </div>
  );
};

export default ViewFileDetail;
