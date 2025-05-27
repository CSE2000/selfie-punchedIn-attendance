import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdArrowBack } from "react-icons/io";
import axios from "axios";

const PersonalInfoForm = () => {
  const [section, setSection] = useState("basic");
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const BASE_API_ENDPOINT = "http://192.168.1.8:8000/user/me";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_API_ENDPOINT}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fullData = response.data;
        const panelData = fullData.data?.panelData;

        console.log("Full User Data:", fullData);
        console.log("Panel Data:", panelData);

        if (panelData) {
          console.log("userData:", panelData.userData);
        }

        const userAuthData = fullData.data?.panelData?.userAuth?.[0];
        setUserData(userAuthData || {});

        // Store the actual _id from the response
        setUserId(fullData.data?._id || userAuthData?._id);

        setError(null);
      } catch (err) {
        console.error("API Error:", err);
        setError(err.response?.data?.message || "Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUserData();
    } else {
      setError("No token found. Please log in.");
      setLoading(false);
    }
  }, [token]);

  const tabs = [
    { id: "basic", label: "Basic Info" },
    { id: "contact", label: "Contact Info" },
    { id: "employment", label: "Upload Photo" },
  ];

  const sections = {
    basic: {
      fields: [
        {
          key: "userName",
          label: "Full Name",
          placeholder: "Eg: Roshi chandra",
        },
        {
          key: "motherName",
          label: "Mother Name",
          placeholder: "Eg: Roshi chandra",
        },
        {
          key: "fatherName",
          label: "Father Name",
          placeholder: "Eg: Roshi chandra",
        },
        {
          key: "email",
          label: "Email ID",
          placeholder: "Eg: roshni123@gmail.com",
          type: "email",
        },
        {
          key: "phoneNumber",
          label: "Phone Number",
          placeholder: "Eg: 345667890067654",
          type: "tel",
        },
        { key: "birthdate", label: "Date of birth", type: "date" },
        {
          key: "gender",
          label: "Gender",
          type: "select",
          options: [
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ],
        },
        {
          key: "maritalStatus",
          label: "Marital status",
          type: "select",
          options: [
            { value: "single", label: "Single" },
            { value: "married", label: "Married" },
            { value: "divorced", label: "Divorced" },
            { value: "widowed", label: "Widowed" },
          ],
        },
        {
          key: "bloodGroup",
          label: "Blood group",
          type: "select",
          options: [
            { value: "a+", label: "A+" },
            { value: "a-", label: "A-" },
            { value: "b+", label: "B+" },
            { value: "b-", label: "B-" },
            { value: "ab+", label: "AB+" },
            { value: "ab-", label: "AB-" },
            { value: "o+", label: "O+" },
            { value: "o-", label: "O-" },
          ],
        },
      ],
    },
    contact: {
      fields: [
        {
          key: "currentAddress",
          label: "Current Address",
          placeholder: "Eg: Talibandha",
        },
        {
          key: "permanentAddress",
          label: "Permanent Address",
          placeholder: "Eg: Raigarh, C.G",
        },
        {
          key: "emergencyNumber",
          label: "Emergency Contact",
          placeholder: "Eg: 345667890067654",
          type: "tel",
        },
      ],
    },
    employment: {
      fields: [{ key: "photo", label: "Upload your photo", type: "file" }],
    },
  };

  const handleInputChange = (key, value) => {
    setUserData((prev) => ({ ...prev, [key]: value }));

    // Handle image preview
    if (key === "photo" && value) {
      const file = value;
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      console.log("Submitting data:", userData);
      console.log("User ID for update:", userId);

      // Add userId explicitly to the payload if backend expects it
      const updatedData = {
        ...userData,
        userId: userId, // ✅ ensure this is userId, not empId
      };

      const updateEndpoint = `${BASE_API_ENDPOINT}/${userId}`;

      console.log("Update endpoint:", updateEndpoint);
      console.log("Data being sent:", updatedData);

      const response = await axios.put(updateEndpoint, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Update response:", response.data);
      alert("Personal information updated successfully!");
    } catch (err) {
      console.error("Update Error:", err);
      console.error("Full error response:", err.response);
      const errorMessage =
        err.response?.data?.message || "Failed to update user data";
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const currentTabIndex = tabs.findIndex((tab) => tab.id === section);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto flex flex-col px-4 pt-6 pb-16 sm:rounded-lg sm:mx-auto sm:my-8 sm:max-w-lg shadow-lg">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate("/profile")}
          className="text-gray-600 text-lg mr-2"
        >
          <IoMdArrowBack size={20} />
        </button>
        <h2 className="text-xl font-semibold">Personal Info</h2>
      </div>

      <nav className="bg-[#F1F3F8] p-2 rounded-md mb-4">
        <ul className="flex justify-between items-center">
          {tabs.map(({ id, label }) => (
            <li
              key={id}
              onClick={() => setSection(id)}
              className={`cursor-pointer px-3 py-1 rounded-md text-sm ${
                section === id
                  ? "bg-[#7A5AF8] text-white"
                  : "text-gray-700 hover:bg-blue-100"
              }`}
            >
              {label}
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap -mx-2">
        {sections[section].fields.map((field) => (
          <div
            key={field.key}
            className={`px-2 mb-4 ${
              field.type === "file" ? "w-full" : "w-1/2"
            }`}
          >
            <label className="block text-sm mb-1 text-gray-700">
              {field.label}
            </label>
            {field.type === "select" ? (
              <select
                className="w-full p-3 border border-gray-300 rounded-md"
                value={userData[field.key] || ""}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
              >
                <option value="">Select {field.label}</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "file" ? (
              <div className="w-full">
                <div className="w-full flex justify-center items-center border border-dashed border-gray-400 rounded-md p-6 mb-3">
                  <input
                    type="file"
                    className="hidden"
                    id="photo-upload"
                    accept="image/*"
                    onChange={(e) =>
                      handleInputChange(field.key, e.target.files[0])
                    }
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer text-center"
                  >
                    {imagePreview ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-full mb-2"
                        />
                        <span className="text-sm text-gray-600">
                          Click to change photo
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-gray-400 text-2xl mb-2">＋</span>
                        <span className="text-sm text-gray-600">
                          Upload Photo
                        </span>
                      </div>
                    )}
                  </label>
                </div>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setUserData((prev) => ({ ...prev, photo: null }));
                      document.getElementById("photo-upload").value = "";
                    }}
                    className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            ) : (
              <input
                type={field.type || "text"}
                placeholder={field.placeholder}
                className="w-full p-3 border border-gray-300 rounded-md"
                value={userData[field.key] || ""}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4 pb-4">
        <button
          onClick={() =>
            setSection(
              currentTabIndex > 0 ? tabs[currentTabIndex - 1].id : section
            )
          }
          className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        {currentTabIndex < tabs.length - 1 ? (
          <button
            onClick={() => setSection(tabs[currentTabIndex + 1].id)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 rounded ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {loading ? "Updating..." : "Done"}
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoForm;