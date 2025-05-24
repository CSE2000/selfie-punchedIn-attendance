import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BankDetailsForm = () => {
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "",
    confirmed: false,
  });

  const [uploadedFile, setUploadedFile] = useState(null);

  const bankFields = [
    {
      key: "bankName",
      label: "Enter bank name",
      placeholder: "E.g. HDFC Bank",
      type: "text",
    },
    {
      key: "accountHolder",
      label: "Enter account holder name",
      placeholder: "E.g. John Doe",
      type: "text",
    },
    {
      key: "accountNumber",
      label: "Enter account number",
      placeholder: "E.g. 123456789012",
      type: "text",
    },
    {
      key: "ifsc",
      label: "Enter IFSC code",
      placeholder: "E.g. HDFC0001234",
      type: "text",
    },
    {
      key: "branch",
      label: "Enter branch name",
      placeholder: "E.g. MG Road Branch",
      type: "text",
    },
  ];

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("File should be in .pdf, .png, .jpg format");
        return;
      }

      setError(null);
      setUploadedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const requiredFields = [
      "bankName",
      "accountHolder",
      "accountNumber",
      "ifsc",
      "branch",
      "accountType",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field] || formData[field].trim() === ""
    );

    if (missingFields.length > 0) {
      setError("Please fill all the details");
      return;
    }

    if (!uploadedFile) {
      setError("Please upload a passbook/cheque image");
      return;
    }

    if (!formData.confirmed) {
      setError("Please confirm that the details are correct");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("User is not authenticated.");
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append("BankName", formData.bankName);
      submitData.append("AccountHolder", formData.accountHolder);
      submitData.append("AccountNumber", formData.accountNumber);
      submitData.append("IFSC", formData.ifsc);
      submitData.append("Branch", formData.branch);
      submitData.append("AccountType", formData.accountType);

      if (uploadedFile) {
        submitData.append("detailsimage", uploadedFile);
      }

      const response = await axios.post(
        "http://192.168.1.26:8000/paymentdetails",
        submitData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess("Bank details submitted successfully!");
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to submit bank details"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white py-4 sm:hidden">
      {error && (
        <div className="text-red-600 text-sm font-semibold mb-4">{error}</div>
      )}
      {success && (
        <div className="text-green-600 text-sm font-semibold mb-4">
          {success}
        </div>
      )}

      <form className="flex flex-wrap -mx-2 space-y-4" onSubmit={handleSubmit}>
        {bankFields.map(({ key, label, placeholder, type }) => (
          <div key={key} className="w-1/2 px-2 mb-4">
            <label className="block text-sm mb-1">{label}</label>
            <input
              className="w-full p-3 border rounded-md"
              placeholder={placeholder}
              type={type}
              value={formData[key]}
              onChange={(e) => handleInputChange(key, e.target.value)}
            />
          </div>
        ))}

        <div>
          <label className="block mb-1 text-sm text-gray-700">
            Select account type
          </label>
          <select
            className="w-full p-3 border rounded-md"
            value={formData.accountType}
            onChange={(e) => handleInputChange("accountType", e.target.value)}
          >
            <option value="">Select account type</option>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
          </select>
        </div>

        <div className="w-full px-2 border rounded-md p-4 mb-4 text-center">
          <label className="inline-flex flex-col items-center justify-center p-[1px] mx-auto bg-gray-200 rounded-full cursor-pointer">
            <span className="text-3xl text-gray-500">+</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
            />
          </label>
          <label className="block text-sm mb-2 text-blue-600">
            Upload passbook/Cheque image
            <p className="text-xs text-gray-500">
              File should be in .pdf, .png, .jpg less than 5MB
            </p>
          </label>

          {preview && (
            <img
              src={preview}
              alt="Uploaded preview"
              className="mt-3 max-w-xs w-full h-auto rounded-md border mx-auto"
            />
          )}
        </div>

        <div className="flex items-center space-x-2 px-2">
          <input
            type="checkbox"
            id="confirm"
            checked={formData.confirmed}
            onChange={(e) => handleInputChange("confirmed", e.target.checked)}
          />
          <label htmlFor="confirm" className="text-sm">
            I confirm the details are correct and share willingly.
          </label>
        </div>

        <div className="flex justify-between mt-6 px-2 w-full">
          <button
            type="button"
            className="px-6 py-2 bg-gray-200 rounded min-w-[100px] hover:bg-gray-300 transition"
            onClick={() => navigate("/profile")}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded min-w-[100px] hover:bg-indigo-700 transition"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Done"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

// const BankDetailsForm = () => {
//   const navigate = useNavigate();
//   const [preview, setPreview] = useState(null);

//   const bankFields = [
//     {
//       key: "bankName",
//       label: "Enter bank name",
//       placeholder: "E.g. HDFC Bank",
//       type: "text",
//     },
//     {
//       key: "accountHolder",
//       label: "Enter account holder name",
//       placeholder: "E.g. John Doe",
//       type: "text",
//     },
//     {
//       key: "accountNumber",
//       label: "Enter account number",
//       placeholder: "E.g. 123456789012",
//       type: "text",
//     },
//     {
//       key: "ifsc",
//       label: "Enter IFSC code",
//       placeholder: "E.g. HDFC0001234",
//       type: "text",
//     },
//     {
//       key: "branch",
//       label: "Enter branch name",
//       placeholder: "E.g. MG Road Branch",
//       type: "text",
//     },
//   ];

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setPreview(URL.createObjectURL(file));
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto min-h-screen bg-white py-4 sm:hidden">
//       <h2 className="text-lg font-semibold mb-4">Bank Details</h2>
//       <form className="flex flex-wrap -mx-2 space-y-4">
//         {bankFields.map(({ key, label, placeholder, type }) => (
//           <div key={key} className="w-1/2 px-2 mb-4">
//             <label className="block text-sm mb-1">{label}</label>
//             <input
//               className="w-full p-3 border rounded-md"
//               placeholder={placeholder}
//               type={type}
//             />
//           </div>
//         ))}

//         <div>
//           <label className="block mb-1 text-sm text-gray-700">
//             Select account type
//           </label>
//           <select className="w-full p-3 border rounded-md">
//             <option value="">Select account type</option>
//             <option value="savings">Savings</option>
//             <option value="current">Current</option>
//           </select>
//         </div>

//         {/* Upload passbook/cheque image */}
//         <div className="w-full px-2 border rounded-md p-4 mb-4 text-center">
//           <label className="inline-flex flex-col items-center justify-center p-[1px] mx-auto bg-gray-200 rounded-full cursor-pointer">
//             <span className="text-3xl text-gray-500">+</span>
//             <input type="file" className="hidden" onChange={handleFileChange} />
//           </label>
//           <label className="block text-sm mb-2 text-blue-600 text-">
//             Upload passbook/Cheque image
//             <p className="text-xs text-gray-500">
//               File should be in .pdf, .png, .jpg less than 5MB
//             </p>
//           </label>

//           {preview && (
//             <img
//               src={preview}
//               alt="Uploaded preview"
//               className="mt-3 max-w-xs w-full h-auto rounded-md border mx-auto"
//             />
//           )}
//         </div>

//         <div className="flex items-center space-x-2 px-2">
//           <input type="checkbox" id="confirm" />
//           <label htmlFor="confirm" className="text-sm">
//             I confirm the details are correct and share willingly.
//           </label>
//         </div>

//         {/* Buttons: Done on left, Cancel on right */}
//         <div className="flex justify-between mt-6 px-2 w-full">
//           <button
//             type="button"
//             className="px-6 py-2 bg-gray-200 rounded min-w-[100px] hover:bg-gray-300 transition"
//             onClick={() => navigate("/profile")}
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="px-6 py-2 bg-indigo-600 text-white rounded min-w-[100px] hover:bg-indigo-700 transition"
//           >
//             Done
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default BankDetailsForm;
