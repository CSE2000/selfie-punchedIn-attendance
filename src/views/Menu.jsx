import React from "react";
import { Home, Calendar, Wallet, User, Umbrella } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { name: "Home", icon: Home, path: "/home" },
  { name: "Leave", icon: User, path: "/leave" },
  { name: "Attendance", icon: Calendar, path: "/attendance-details" },
  { name: "Holiday", icon: Umbrella, path: "/holiday" },
  { name: "Salary", icon: Wallet, path: "/salary" },

];

const Menu = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white shadow-md sm:hidden">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center text-xs"
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive ? "text-indigo-500" : "text-gray-400"
                }`}
              />
              <span
                className={`${
                  isActive ? "text-indigo-500 font-medium" : "text-gray-400"
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <span className="w-6 h-1 mt-1 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Menu;
