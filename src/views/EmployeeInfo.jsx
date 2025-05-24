import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ImagePlus } from "lucide-react";

const EmployeeInfo = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    pancard: null,
    aadhaar: null,
    signature: null,
    certification: null,
  });

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => ({
        ...prev,
        [field]: {
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name,
        },
      }));
    }
  };

  const handleView = (fileData) => {
    if (fileData) {
      navigate("/view-file", { state: fileData });
    }
  };

  const fields = [
    {
      key: "pancard",
      label: "Enter PAN card number",
      placeholder: "E.g DBBPB1556G",
    },
    {
      key: "aadhaar",
      label: "Enter Aadhar card number",
      placeholder: "E.g 1234 5678 9012",
    },
    {
      key: "signature",
      label: "Scanned Signature",
      placeholder: "E.g Full Name & Signature",
    },
    {
      key: "certification",
      label: "Professional Certifications Number",
      placeholder: "E.g Certificate ID: 1234-5678",
    },
  ];

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white shadow-sm rounded-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Employment info</h2>
        <button
          className="text-xs flex items-center gap-1 text-blue-600 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50"
          onClick={() => handleView(Object.values(files).find((f) => f))}
        >
          <Eye className="w-4 h-4" />
          View File
        </button>
      </div>

      <form className="flex flex-wrap -mx-2">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="w-full md:w-1/3 px-2 mb-4">
            <label className="block text-sm text-gray-700 mb-1">{label}</label>

            {/* Input + Add Image */}
            <div className="flex items-center gap-2">
              <input
                className="flex-1 p-3 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400"
                placeholder={placeholder}
              />
              <label className="cursor-pointer inline-flex items-center gap-1 text-sm text-purple-600">
                <ImagePlus className="w-5 h-5" />
                <span>Add</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => handleFileUpload(e, key)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ))}

        {/* Footer Buttons */}
        <div className="w-full px-2 flex justify-between pt-4">
          <button
            type="button"
            className="w-[48%] py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-[48%] py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeInfo;
