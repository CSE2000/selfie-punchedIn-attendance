import React from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../assets/Ellipse.svg";

function TopBar({
  user = {
    name: "Shubham Pandey",
    role: "Frontend Developer",
    image: null,
  },
  unreadCount = 0,
  pageTitle = "",
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between bg-white px-6 py-4 shadow-md">
      {/* Left section */}
      {pageTitle === "home" ? (
        <div className="flex items-center space-x-4">
          <img
            src={user.image || defaultAvatar}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover"
            onClick={() => navigate("/profile")}
          />
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {user.name || "Unknown"}
            </div>
            <div className="text-sm text-gray-500">{user.role || "N/A"}</div>
          </div>
        </div>
      ) : (
        <div className="text-lg font-semibold text-gray-800 capitalize">
          {pageTitle.replace("-", " ")}
        </div>
      )}

      {/* Right: Notification bell - show only on home */}
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
