import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ImagePlus } from "lucide-react";
import axios from "axios";

const EmployeeInfo = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [empId, setEmpId] = useState(null); // Store employee info document ID

  const [formData, setFormData] = useState({
    panCard: "",
    adharCard: "",
    signature: "",
    certification: "",
  });

  const [files, setFiles] = useState({
    panCard: null,
    adharCard: null,
    signature: null,
    certification: null,
  });

  // GET employee data and attached base64 files
  useEffect(() => {
    const fetchEmpInfo = async () => {
      try {
        const response = await axios.get("https://attendancebackends.onrender.com/empinfo", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = response.data?.data;

        if (!data) return;

        setEmpId(data._id || null);

        setFormData({
          panCard: data.panCard || "",
          adharCard: data.adharCard || "",
          signature: data.signature || "",
          certification: data.certification || "",
        });

        // If your backend returns file URLs (like your example response), you might want to show previews from URLs:
        setFiles({
          panCard: data.panImg ? { url: data.panImg } : null,
          adharCard: data.adharImg ? { url: data.adharImg } : null,
          signature: data.signatureImage ? { url: data.signatureImage } : null,
          certification: data.certificationImg
            ? { url: data.certificationImg }
            : null,
        });
      } catch (error) {
        console.error("Error fetching employee info:", error);
      }
    };

    fetchEmpInfo();
  }, [token]);

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => ({
          ...prev,
          [field]: {
            file,
            url: URL.createObjectURL(file),
            type: file.type,
            name: `${field}.${file.name.split(".").pop()}`, // e.g. pancard.jpg
            binary: reader.result, // base64 string
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleView = () => {
    const uploadedFiles = Object.entries(files)
      .filter(([_, file]) => file?.url)
      .map(([key, file]) => ({
        ...file,
        name: key,
      }));
    if (uploadedFiles.length > 0) {
      navigate("/view-file", { state: uploadedFiles });
    } else {
      alert("No files uploaded.");
    }
  };

  const handleChange = (e, key) => {
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const isFormValid = () => {
    const allTextFilled = Object.values(formData).every(
      (val) => val.trim() !== ""
    );
    const allFilesUploaded = Object.values(files).every(
      (fileObj) => fileObj && (fileObj.file || fileObj.url) // allow existing URLs or new files
    );
    return allTextFilled && allFilesUploaded;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      alert(
        "Please fill all fields and upload all required files before submitting."
      );
      return;
    }

    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });

      // Append each file as "userdoc"
      Object.keys(files).forEach((key) => {
        if (files[key]?.file) {
          const file = files[key].file;
          const fileWithCustomName = new File(
            [file],
            `${key}.${file.name.split(".").pop()}`,
            {
              type: file.type,
            }
          );
          payload.append("userdoc", fileWithCustomName);
        }
      });

      if (empId) {
        // PUT request to update existing data
        await axios.put(`https://attendancebackends.onrender.com/empinfo/${empId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Employee info updated successfully!");
      } else {
        // POST request to create new
        await axios.post("https://attendancebackends.onrender.com/empinfo", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        alert("Employee info submitted successfully!");
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      alert("Submission failed.");
    }
  };

  const fields = [
    {
      key: "panCard",
      label: "Enter PAN card number",
      placeholder: "E.g DBBPB1556G",
    },
    {
      key: "adharCard",
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
    <div className="max-w-sm mx-auto min-h-screen bg-white shadow-sm rounded-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Employment info</h2>
        <button
          className="text-xs flex items-center gap-1 text-blue-600 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50"
          onClick={handleView}
          type="button"
        >
          <Eye className="w-4 h-4" />
          View File
        </button>
      </div>

      <form className="flex flex-wrap -mx-2" onSubmit={handleSubmit}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="w-full px-2 mb-4">
            <label className="block text-sm text-gray-700 mb-1">{label}</label>

            <div className="flex items-center gap-2">
              <input
                className="flex-1 p-3 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400"
                placeholder={placeholder}
                value={formData[key]}
                onChange={(e) => handleChange(e, key)}
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
            disabled={!isFormValid()}
            className={`w-[48%] py-2 text-sm rounded ${
              isFormValid()
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeInfo;

// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Eye, ImagePlus } from "lucide-react";
// import axios from "axios";

// const EmployeeInfo = () => {
//   const navigate = useNavigate();
//   const token = localStorage.getItem("token");

//   const [formData, setFormData] = useState({
//     panCard: "",
//     adharCard: "",
//     signature: "",
//     certification: "",
//   });

//   const [files, setFiles] = useState({
//     pancard: null,
//     aadhaar: null,
//     signature: null,
//     certification: null,
//   });

//   // GET employee data and attached base64 files
//   useEffect(() => {
//     const fetchEmpInfo = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.8:8000/empinfo", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         const data = response.data?.data;

//         setFormData((prev) => ({
//           ...prev,
//           panCard: data?.panCard || "",
//           adharCard: data?.adharCard || "",
//           signature: data?.signature || "",
//           certification: data?.certification || "",
//         }));

//         // Handle base64 file (assuming backend returns under keys "pancard", "aadhaar", etc. with base64 data)
//         const updatedFiles = {};

//         ["panCard", "adharCard", "signature", "certification"].forEach(
//           (key) => {
//             const fileData = data?.[key];
//             if (fileData?.base64) {
//               const byteString = atob(fileData.base64.split(",")[1]);
//               const mimeType = fileData.type;
//               const ab = new ArrayBuffer(byteString.length);
//               const ia = new Uint8Array(ab);
//               for (let i = 0; i < byteString.length; i++) {
//                 ia[i] = byteString.charCodeAt(i);
//               }
//               const blob = new Blob([ab], { type: mimeType });
//               const url = URL.createObjectURL(blob);

//               updatedFiles[key] = {
//                 url,
//                 name: fileData.name,
//                 type: mimeType,
//                 binary: fileData.base64,
//                 file: new File([blob], fileData.name, { type: mimeType }),
//               };
//             }
//           }
//         );

//         setFiles(updatedFiles);
//       } catch (error) {
//         console.error("Error fetching employee info:", error);
//       }
//     };

//     fetchEmpInfo();
//   }, [token]);

//   const handleFileUpload = (e, field) => {
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         setFiles((prev) => ({
//           ...prev,
//           [field]: {
//             file,
//             url: URL.createObjectURL(file),
//             type: file.type,
//             name: `${field}.${file.name.split(".").pop()}`, // e.g. pancard.jpg
//             binary: reader.result,
//           },
//         }));
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleView = () => {
//     const uploadedFiles = Object.entries(files)
//       .filter(([_, file]) => file?.url)
//       .map(([key, file]) => ({
//         ...file,
//         name: key,
//       }));
//     if (uploadedFiles.length > 0) {
//       navigate("/view-file", { state: uploadedFiles });
//     } else {
//       alert("No files uploaded.");
//     }
//   };

//   const handleChange = (e, key) => {
//     setFormData((prev) => ({
//       ...prev,
//       [key]: e.target.value,
//     }));
//   };

//   const isFormValid = () => {
//     const allTextFilled = Object.values(formData).every(
//       (val) => val.trim() !== ""
//     );
//     const allFilesUploaded = Object.values(files).every(
//       (fileObj) => fileObj && fileObj.file
//     );
//     return allTextFilled && allFilesUploaded;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!isFormValid()) {
//       alert(
//         "Please fill all fields and upload all required files before submitting."
//       );
//       return;
//     }

//     try {
//       const payload = new FormData();
//       Object.keys(formData).forEach((key) => {
//         payload.append(key, formData[key]);
//       });

//       // Append each file as "userdoc"
//       Object.keys(files).forEach((key) => {
//         if (files[key]?.file) {
//           const file = files[key].file;
//           const fileWithCustomName = new File(
//             [file],
//             `${key}.${file.name.split(".").pop()}`,
//             {
//               type: file.type,
//             }
//           );
//           payload.append("userdoc", fileWithCustomName); // all files under key 'userdoc'
//         }
//       });

//       await axios.post("http://192.168.1.8:8000/empinfo", payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       alert("Employee info submitted successfully!");
//     } catch (error) {
//       console.error("Failed to submit:", error);
//       alert("Submission failed.");
//     }
//   };

//   const fields = [
//     {
//       key: "panCard",
//       label: "Enter PAN card number",
//       placeholder: "E.g DBBPB1556G",
//     },
//     {
//       key: "adharCard",
//       label: "Enter Aadhar card number",
//       placeholder: "E.g 1234 5678 9012",
//     },
//     {
//       key: "signature",
//       label: "Scanned Signature",
//       placeholder: "E.g Full Name & Signature",
//     },
//     {
//       key: "certification",
//       label: "Professional Certifications Number",
//       placeholder: "E.g Certificate ID: 1234-5678",
//     },
//   ];

//   return (
//     <div className="max-w-sm mx-auto min-h-screen bg-white shadow-sm rounded-md p-4">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-base font-semibold">Employment info</h2>
//         <button
//           className="text-xs flex items-center gap-1 text-blue-600 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50"
//           onClick={handleView}
//         >
//           <Eye className="w-4 h-4" />
//           View File
//         </button>
//       </div>

//       <form className="flex flex-wrap -mx-2" onSubmit={handleSubmit}>
//         {fields.map(({ key, label, placeholder }) => (
//           <div key={key} className="w-full px-2 mb-4">
//             <label className="block text-sm text-gray-700 mb-1">{label}</label>

//             <div className="flex items-center gap-2">
//               <input
//                 className="flex-1 p-3 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400"
//                 placeholder={placeholder}
//                 value={formData[key]}
//                 onChange={(e) => handleChange(e, key)}
//               />
//               <label className="cursor-pointer inline-flex items-center gap-1 text-sm text-purple-600">
//                 <ImagePlus className="w-5 h-5" />
//                 <span>Add</span>
//                 <input
//                   type="file"
//                   accept="image/*,.pdf,.doc,.docx"
//                   onChange={(e) => handleFileUpload(e, key)}
//                   className="hidden"
//                 />
//               </label>
//             </div>
//           </div>
//         ))}

//         <div className="w-full px-2 flex justify-between pt-4">
//           <button
//             type="button"
//             className="w-[48%] py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
//             onClick={() => navigate("/profile")}
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={!isFormValid()}
//             className={`w-[48%] py-2 text-sm rounded ${
//               isFormValid()
//                 ? "bg-indigo-600 text-white hover:bg-indigo-700"
//                 : "bg-gray-300 text-gray-600 cursor-not-allowed"
//             }`}
//           >
//             Apply
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default EmployeeInfo;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Eye, ImagePlus } from "lucide-react";

// const EmployeeInfo = () => {
//   const navigate = useNavigate();

//   const [files, setFiles] = useState({
//     pancard: null,
//     aadhaar: null,
//     signature: null,
//     certification: null,
//   });

//   const handleFileUpload = (e, field) => {
//     const file = e.target.files[0];
//     if (file) {
//       setFiles((prev) => ({
//         ...prev,
//         [field]: {
//           url: URL.createObjectURL(file),
//           type: file.type,
//           name: file.name,
//         },
//       }));
//     }
//   };

//   const handleView = (fileData) => {
//     if (fileData) {
//       navigate("/view-file", { state: fileData });
//     }
//   };

//   const fields = [
//     {
//       key: "pancard",
//       label: "Enter PAN card number",
//       placeholder: "E.g DBBPB1556G",
//     },
//     {
//       key: "aadhaar",
//       label: "Enter Aadhar card number",
//       placeholder: "E.g 1234 5678 9012",
//     },
//     {
//       key: "signature",
//       label: "Scanned Signature",
//       placeholder: "E.g Full Name & Signature",
//     },
//     {
//       key: "certification",
//       label: "Professional Certifications Number",
//       placeholder: "E.g Certificate ID: 1234-5678",
//     },
//   ];

//   return (
//     <div className="max-w-sm mx-auto min-h-screen bg-white shadow-sm rounded-md">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-base font-semibold">Employment info</h2>
//         <button
//           className="text-xs flex items-center gap-1 text-blue-600 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50"
//           onClick={() => handleView(Object.values(files).find((f) => f))}
//         >
//           <Eye className="w-4 h-4" />
//           View File
//         </button>
//       </div>

//       <form className="flex flex-wrap -mx-2">
//         {fields.map(({ key, label, placeholder }) => (
//           <div key={key} className="w-full md:w-1/3 px-2 mb-4">
//             <label className="block text-sm text-gray-700 mb-1">{label}</label>

//             {/* Input + Add Image */}
//             <div className="flex items-center gap-2">
//               <input
//                 className="flex-1 p-3 border border-gray-300 rounded-md text-sm text-gray-800 placeholder-gray-400"
//                 placeholder={placeholder}
//               />
//               <label className="cursor-pointer inline-flex items-center gap-1 text-sm text-purple-600">
//                 <ImagePlus className="w-5 h-5" />
//                 <span>Add</span>
//                 <input
//                   type="file"
//                   accept="image/*,.pdf,.doc,.docx"
//                   onChange={(e) => handleFileUpload(e, key)}
//                   className="hidden"
//                 />
//               </label>
//             </div>
//           </div>
//         ))}

//         {/* Footer Buttons */}
//         <div className="w-full px-2 flex justify-between pt-4">
//           <button
//             type="button"
//             className="w-[48%] py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
//             onClick={() => navigate("/profile")}
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="w-[48%] py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
//           >
//             Apply
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default EmployeeInfo;
