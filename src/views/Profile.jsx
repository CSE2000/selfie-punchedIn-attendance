import React, { useRef, useState, useEffect } from "react";
import { Pencil, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import profileImage from "../assets/Ellipse.svg";
import { handleLogout } from "../utils/logout";
import LogoutModal from "./LogoutModal";
import ConfirmLogoutModal from "./ConfirmLogoutModal";
import axios from "axios";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_ENDPOINT = "http://192.168.1.8:8000/user/me";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fullData = response.data;
        const userAuthData = fullData.data?.panelData?.userAuth?.[0];

        console.log("Profile Data:", userAuthData);
        setUserData(userAuthData || {});
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

  const user = {
    name: userData.userName || "User",
    designation: userData.role || "Employee",
    employeeId: userData.userId || "EMP0000",
    profileImage: selectedImage || profileImage,
  };

  const profileOptions = [
    { label: "Personal info", route: "/personal-info" },
    { label: "Bank details", route: "/bank-details" },
    { label: "Employment info", route: "/employee-info" },
    { label: "Document center", route: "/document-center" },
  ];

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);

      // Optional: Upload image to server
      try {
        const formData = new FormData();
        formData.append("photo", file);

        // You can uncomment and modify this if you want to upload the image immediately
        const response = await axios.put(API_ENDPOINT, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Image uploaded:", response.data);
      } catch (err) {
        console.error("Image upload error:", err);
      }
    }
  };

  const getCurrentFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const confirmLogout = () => {
    setShowConfirmModal(false);
    handleLogout(navigate);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto sm:hidden bg-white min-h-screen pt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto sm:hidden bg-white min-h-screen pt-4 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Profile
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
    <div className="max-w-md mx-auto sm:hidden bg-white min-h-screen pt-4">
      {/* Profile Info */}
      <div className="px-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border border-gray-300"
              />
              <button
                className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow"
                onClick={() => fileInputRef.current.click()}
              >
                <Pencil className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {user.name}
              </h2>
              <p className="text-sm text-gray-500">{user.employeeId}</p>
            </div>
          </div>
          <div className="pt-1">
            <p className="text-sm text-indigo-600 font-medium text-right">
              {user.designation}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Options */}
      <div className="space-y-3 px-4 pt-8">
        {profileOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => navigate(option.route)}
            className="w-full flex items-center justify-between px-4 py-4 bg-gray-100 rounded-lg text-gray-800 hover:bg-gray-200 transition"
          >
            {option.label}
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>
        ))}

        {/* Logout button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg text-red-600 hover:bg-gray-200 transition"
        >
          Logout
          <ArrowRight className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Step 1: Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          setTimeout(() => setShowConfirmModal(true), 200);
        }}
      />

      {/* Step 2: Confirm Logout Modal */}
      <ConfirmLogoutModal
        isOpen={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onNext={confirmLogout}
        punchOutTime={getCurrentFormattedTime()}
      />
    </div>
  );
};

export default Profile;