import React, { useEffect, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../assets/Ellipse.svg";
import axios from "axios";

function TopBar({ unreadCount = 0, pageTitle = "" }) {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "User",
    role: "Employee",
    image: null,
  });
  const [loading, setLoading] = useState(true);

  const API_ENDPOINT = "https://attendancebackends.onrender.com/user/me";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(API_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userAuthData = response.data.data.panelData.userAuth?.[0] || {};
        setUser({
          name: userAuthData.userName || "User",
          role: userAuthData.role || "Employee",
          image: userAuthData.image || null,
        });
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUser();
    }
  }, [token]);

  return (
    <div className="flex items-center justify-between bg-white px-6 py-4 shadow-md">
      {/* Left section */}
      {pageTitle === "home" ? (
        <div className="flex items-center space-x-4">
          <img
            src={user.image || defaultAvatar}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {loading ? "Loading..." : user.name}
            </div>
            <div className="text-sm text-gray-500">
              {loading ? "..." : user.role}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-lg font-semibold text-gray-800 capitalize">
          {pageTitle.replace("-", " ")}
        </div>
      )}

      {/* Notification bell */}
      {pageTitle === "home" && (
        <button
          onClick={() => navigate("/notification")}
          className="relative text-gray-600 hover:text-blue-600 focus:outline-none"
          aria-label="View Notifications"
        >
          <FaBell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default TopBar;
