import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";

const BankDetailsForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [responseId, setResponseId] = useState(null);

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
  const [existingImageUrl, setExistingImageUrl] = useState(null);

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

  // Fetch existing bank details when component mounts if ID is present
  useEffect(() => {
    const fetchBankDetails = async () => {
      setFetchingData(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("User is not authenticated.");
        setFetchingData(false);
        return;
      }

      try {
        const response = await axios.get(
          "http://192.168.1.8:8000/paymentdetails",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = response.data;
        if (!data) {
          setError("No bank details found.");
          return;
        }

        setFormData({
          bankName: data.paymentDetails[0].BankName || "",
          accountHolder: data.paymentDetails[0].AccountHolder || "",
          accountNumber: data.paymentDetails[0].AccountNumber || "",
          ifsc: data.paymentDetails[0].IFSC || "",
          branch: data.paymentDetails[0].Branch || "",
          accountType: data.paymentDetails[0].AccountType || "",
          confirmed: true,
        });
        // console.log("FormData :--", formData);

        if (data.paymentDetails[0].DetailsImage) {
          setExistingImageUrl(data.paymentDetails[0].DetailsImage);
          setPreview(data.paymentDetails[0].DetailsImage);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to fetch bank details"
        );
      } finally {
        setFetchingData(false);
      }
    };

    fetchBankDetails();
  }, []);

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
      setExistingImageUrl(null);
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

    // For new entries, require file upload. For updates, it's optional
    if (!isEditMode && !uploadedFile) {
      setError("Please upload a passbook/cheque image");
      return;
    }

    // For updates, check if we have either existing image or new uploaded file
    if (isEditMode && !uploadedFile && !existingImageUrl) {
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

      // Convert image to binary and append
      if (uploadedFile) {
        // Convert file to binary format
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create a blob with the binary data
        const binaryBlob = new Blob([uint8Array], { type: uploadedFile.type });
        submitData.append("DetailsImage", binaryBlob, uploadedFile.name);

        // Also add file info
        submitData.append("imageType", uploadedFile.type);
        submitData.append("imageName", uploadedFile.name);
        submitData.append("imageSize", uploadedFile.size.toString());
      }

      let response;
      const bankId = id || location.state?.bankId || responseId;
      if (bankId) {
        response = await axios.put(
          `http://192.168.1.8:8000/paymentdetails/${bankId}`,
          submitData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseData = response.data;
        setSuccess("Bank details updated successfully!");

        if (responseData.Form) {
          setFormData({
            bankName: responseData.Form.BankName || "",
            accountHolder: responseData.Form.AccountHolder || "",
            accountNumber: responseData.Form.AccountNumber || "",
            ifsc: responseData.Form.IFSC || "",
            branch: responseData.Form.Branch || "",
            accountType: responseData.Form.AccountType || "",
            confirmed: true,
          });
          if (responseData.Form.DetailsImage) {
            setExistingImageUrl(responseData.Form.DetailsImage);
            setPreview(responseData.Form.DetailsImage);
          }
          setUploadedFile(null);
        }
      } else {
        response = await axios.post(
          "http://192.168.1.8:8000/paymentdetails",
          submitData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const responseData = response.data;
        setSuccess("Bank details submitted successfully!");

        // Store the ID for future updates and populate form with returned data
        if (responseData.Form) {
          setResponseId(responseData.Form._id);
          setIsEditMode(true);

          // Update form with the response data (this will populate placeholders)
          setFormData({
            bankName: responseData.Form.BankName || "",
            accountHolder: responseData.Form.AccountHolder || "",
            accountNumber: responseData.Form.AccountNumber || "",
            ifsc: responseData.Form.IFSC || "",
            branch: responseData.Form.Branch || "",
            accountType: responseData.Form.AccountType || "",
            confirmed: true,
          });

          // Set the returned image
          if (responseData.Form.DetailsImage) {
            setExistingImageUrl(responseData.Form.DetailsImage);
            setPreview(responseData.Form.DetailsImage);
          }

          setUploadedFile(null);
        }
      }
      setTimeout(() => {
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          `Failed to ${bankId ? "update" : "submit"} bank details`
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while fetching data
  if (fetchingData) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white py-4 sm:hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading bank details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white py-4 sm:hidden">
      {/* Header showing mode */}
      <div className="mb-4 px-2">
        <h2 className="text-lg font-semibold">
          {isEditMode ? "Update Bank Details" : "Add Bank Details"}
        </h2>
        {responseId && (
          <p className="text-xs text-gray-500">ID: {responseId}</p>
        )}
      </div>

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
              defaultValue={formData[key]}
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
            {isEditMode
              ? "Update passbook/Cheque image (optional)"
              : "Upload passbook/Cheque image"}
            <p className="text-xs text-gray-500">
              File should be in .pdf, .png, .jpg less than 5MB
            </p>
          </label>

          {preview && (
            <div className="mt-3">
              {existingImageUrl && !uploadedFile && (
                <p className="text-xs text-gray-600 mb-1">Current image:</p>
              )}
              <img
                src={preview}
                alt="Preview"
                className="max-w-xs w-full h-auto rounded-md border mx-auto"
              />
              {uploadedFile && (
                <p className="text-xs text-green-600 mt-1">
                  New image selected
                </p>
              )}
            </div>
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
            {loading
              ? id || location.state?.bankId || responseId
                ? "Updating..."
                : "Submitting..."
              : id || location.state?.bankId || responseId
              ? "Update"
              : "Done"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankDetailsForm;