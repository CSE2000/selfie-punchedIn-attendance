import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import loginImage from "../assets/loginImage.svg";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/home");
    }
  }, [navigate]);

  const handlePinChange = (index, value) => {
    if (value.length > 1) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newPin = [...pin];
        newPin[index - 1] = "";
        setPin(newPin);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const passcode = pin.join("");
    if (!userId || passcode.length < 4) {
      setError("Please enter User ID and 4-digit PIN.");
      return;
    }

    try {
      const response = await fetch(
        "https://attendancebackends.onrender.com/user/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            pin: passcode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }
      // setIsLoading(false);
      const data = await response.json();
      console.log("Login response:", data);

      // Save token or user data in localStorage for auth persistence
      localStorage.setItem("token", data.token || "dummy-token");

      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials and try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-0 relative px-4">
      {/* Header Section */}
      <div className="w-full bg-[#6E62FF] flex flex-col items-center justify-center py-14 relative">
        <div className="absolute top-4 right-4 text-xs text-white opacity-70">
          🌐 Change Language
        </div>
        <img src={loginImage} alt="Illustration" className="w-32 h-32 mb-2" />
        <h1 className="text-3xl font-bold text-white tracking-wide">PUNCHIN</h1>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="-mt-10 bg-white w-full max-w-md rounded-t-3xl px-6 py-8 shadow-lg z-10"
      >
        <h2 className="text-xl font-semibold text-center mb-6">
          Account Login
        </h2>

        {/* User ID Input */}
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          User Login ID
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value.toUpperCase())}
          placeholder="Enter your registered User ID"
          className="w-full px-4 py-3 border border-gray-300 rounded-md mb-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 uppercase"
        />

        {/* Passcode Boxes */}
        <div className="flex justify-between items-center mb-2">
          {pin.map((digit, idx) => (
            <input
              key={idx}
              id={`pin-${idx}`}
              type="password"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-12 h-12 text-center border border-gray-300 rounded-md text-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          ))}
        </div>

        {/* Forgot link */}
        <div className="text-right text-xs text-purple-600 hover:underline mb-4">
          Forgot your User ID or PIN?
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-md text-sm font-semibold shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
        {/* <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-md text-sm font-semibold shadow-md transition"
        >
          Sign In
        </button> */}
      </form>
    </div>
  );
}

// import React, { useState } from "react";
// import loginImage from "../assets/loginImage.svg";

// export default function LoginPage() {
//   const [userId, setUserId] = useState("");
//   const [pin, setPin] = useState(["", "", "", ""]);

//   const handlePinChange = (index, value) => {
//     if (value.length > 1) return;
//     const newPin = [...pin];
//     newPin[index] = value;
//     setPin(newPin);
//     if (value && index < 3) {
//       document.getElementById(`pin-${index + 1}`).focus();
//     }
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     const passcode = pin.join("");
//     console.log("User ID:", userId);
//     console.log("Passcode:", passcode);
//   };
