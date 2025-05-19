import React, { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  CalendarCheck,
  CloudCog,
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

const SelfieLocationPunched = () => {
  const [targetLocations, setTargetLocations] = useState([null]);
  const [selfieImage, setSelfieImage] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [locationName, setLocationName] = useState("Office");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [userData, setUserData] = useState({
    userName: "",
    email: "",
    password: "",
  });
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    employeeId: "",
  });

  const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  const areLocationsMatching = (userLoc, targetLocs) => {
    if (!userLoc || !targetLocs?.length) return false;

    const userLat = parseFloat(userLoc.lat);
    const userLon = parseFloat(userLoc.lon);
    const maxAllowedDistance = isAppleDevice() ? 800 : 500; // meters

    const toRadians = (degree) => (degree * Math.PI) / 180;
    const earthRadius = 6371; // in km

    return targetLocs.some((target) => {
      const targetLat = parseFloat(target.lat);
      const targetLon = parseFloat(target.lon);

      const dLat = toRadians(targetLat - userLat);
      const dLon = toRadians(targetLon - userLon);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(userLat)) *
          Math.cos(toRadians(targetLat)) *
          Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceInMeters = earthRadius * c * 1000;

      return distanceInMeters <= maxAllowedDistance;
    });
  };

  // For example, this could be read from a configuration or prop
  useEffect(() => {
    const fetchTargetLocations = async () => {
      try {
        const response = await axios.get(
          "https://attendancebackends.onrender.com/location"
        );
        console.log("location Data:", response.data);

        // Always-available fallback or additional known locations
        const fallbackLocations = [
          { lat: 21.246699, lon: 81.662397 },
          { lat: 21.237747, lon: 81.67866 },
        ];

        let formatted = [];

        if (response.data?.locations?.length) {
          const fetched = response.data.locations.map((loc) => ({
            lat: parseFloat(loc.latitude),
            lon: parseFloat(loc.longitude),
          }));

          // Combine fetched + fallback locations
          formatted = [...fetched, ...fallbackLocations];
          console.log("Combined target locations (API + fallback):", formatted);
        } else {
          // If API returns no locations, use fallback
          formatted = fallbackLocations;
          console.warn("No API locations found. Using fallback locations.");
        }

        setTargetLocations(formatted);
      } catch (error) {
        console.error("Error fetching target locations:", error);

        // On fetch error, still fallback to default locations
        setTargetLocations([
          { lat: 21.246699, lon: 81.662397 },
          { lat: 21.237747, lon: 81.66866 },
        ]);
      }
    };

    fetchTargetLocations();
  }, []);

  // useEffect to ask for permissions on login
  useEffect(() => {
    if (isAuthenticated) {
      // Request front camera (for selfie)
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          console.log("Camera permission granted");
        })
        .catch((err) => {
          console.error("Camera permission denied:", err);
          alert("Camera permission is required for selfie capture.");
        });

      // Request geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Location permission granted");
            setLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Location permission denied:", error);
            alert(
              "Location permission is required to verify your punch-in location."
            );
          },
          { enableHighAccuracy: true }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    }
  }, [isAuthenticated]);

  // useEffect to activate front-facing camera stream when capturing selfie
  useEffect(() => {
    if (cameraActive && !selfieImage) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        })
        .catch((error) => {
          console.error("Error accessing camera:", error);
          alert("Failed to access the camera. Please check permissions.");
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, selfieImage]);

  // Fallback location check
  useEffect(() => {
    if (!location.lat && !location.lon) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Error getting location:", error);
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    }
  }, [location]);

  // Function to capture selfie from video stream
  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg");
      setSelfieImage(imageData);
      //   console.log();
      console.log("Selfie captured");

      // Stop camera after capturing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Function to reset selfie
  const resetSelfie = () => {
    setSelfieImage(null);
    setCameraActive(true);
  };

  // Function to send punch-in data to backend
  // Helper: convert base64 string to Blob
  function base64ToBlob(base64, mimeType) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  const sendPunchInData = async () => {
    if (!isAuthenticated) {
      alert("Please log in to record your attendance");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token not found. Please log in again.");
      return;
    }

    if (!location || !location.lat || !location.lon) {
      alert("Your location could not be determined. Please enable GPS.");
      return;
    }

    if (!selfieImage) {
      alert("Please capture a selfie first.");
      return;
    }

    if (!areLocationsMatching(location, targetLocations)) {
      alert("You are not at the correct location.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract base64 data and MIME type from data URL
      // Example: data:image/png;base64,iVBORw0KGgoAAAANS...
      const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
      if (!matches) {
        alert("Selfie image must be in JPG/JPEG format");
        setIsSubmitting(false);
        return;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      const selfieBlob = base64ToBlob(base64Data, mimeType);

      // Create FormData and append fields & file blob
      const formData = new FormData();
      formData.append("userID", userProfile.employeeId);
      formData.append("userName", userProfile.name);
      formData.append("email", userProfile.email);
      formData.append("timeStamp", new Date().toISOString());
      formData.append("latitude", location.lat);
      formData.append("longitude", location.lon);
      formData.append("selfieImage", selfieBlob, "selfie.png");
      formData.append("locationName", locationName);

      const response = await axios.post(
        "https://attendancebackends.onrender.com/data",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // important for FormData
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200 && response.data.success) {
        setApiResponse({
          success: true,
          message: response.data.message || "✅ PUNCHED IN SUCCESSFULLY",
        });
        console.log("Attendance recorded:", response.data);
      } else {
        setApiResponse({
          success: false,
          message:
            response.data.message || "Failed to punch in. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      if (error.response && error.response.status === 401) {
        setApiResponse({
          success: false,
          message: "Unauthorized: Invalid token. Please log in again.",
        });
      } else {
        setApiResponse({
          success: false,
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to record attendance. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Check if user is already authenticated on page load
    const savedAuthState = localStorage.getItem("authState");

    if (savedAuthState) {
      const parsedAuthState = JSON.parse(savedAuthState);
      setIsAuthenticated(parsedAuthState.isAuthenticated);
      setUserProfile(parsedAuthState.userProfile);
    }
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const endpoint =
      authMode === "login"
        ? "https://attendancebackends.onrender.com/user/login"
        : "https://attendancebackends.onrender.com/user/signup";

    try {
      const response = await axios.post(endpoint, userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (authMode === "signup") {
        // ✅ Signup success — don't store token yet, ask user to log in
        alert("Account created successfully! Please log in.");
        setAuthMode("login");
      } else {
        // ✅ Login success — store token and auth state
        localStorage.setItem("token", response.data.token);

        const authState = {
          isAuthenticated: true,
          userProfile: {
            name: response.data.user.userName || "John Doe",
            email: response.data.user.email,
            employeeId:
              response.data.user.employeeId ||
              "EMP" + Math.floor(10000 + Math.random() * 90000),
          },
        };

        localStorage.setItem("authState", JSON.stringify(authState));

        setSelfieImage(null);
        setApiResponse(null);

        setIsAuthenticated(true);
        setShowAuthModal(false);
        setUserProfile(authState.userProfile);
      }
    } catch (error) {
      console.error("Authentication error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unknown error occurred";

      alert("Authentication failed: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserProfile({
      name: "",
      email: "",
      employeeId: "",
    });

    // Remove authentication state from localStorage
    localStorage.removeItem("authState");
    localStorage.removeItem("token"); // Remove token as well

    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Attendance System</h1>
            </div>

            {/* Desktop Menu: Include Attendance Details Link */}
            <div className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <>
                  <span className="flex items-center">
                    <UserCircle className="mr-2" size={20} />
                    {userProfile.name}
                  </span>
                  <Link
                    to="/attendance-details"
                    className="flex items-center px-3 py-2 rounded hover:bg-blue-600"
                  >
                    <CalendarCheck className="mr-2" size={18} />
                    Attendance Details
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 rounded hover:bg-blue-700"
                  >
                    <LogOut className="mr-1" size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-2 rounded bg-white text-blue-600 hover:bg-gray-100 ml-2"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md hover:bg-blue-700 focus:outline-none"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-700 px-4 py-3">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center py-2 border-b border-blue-600">
                  <UserCircle className="mr-2" size={20} />
                  <span>{userProfile.name}</span>
                </div>
                <div className="flex items-center py-2 text-sm">
                  <span className="opacity-80">
                    ID: {userProfile.employeeId}
                  </span>
                </div>
                <Link
                  to="/attendance-details"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center w-full px-3 py-2 rounded hover:bg-blue-600"
                >
                  <CalendarCheck className="mr-2" size={18} />
                  Attendance Details
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-3 py-2 rounded hover:bg-blue-600"
                >
                  <LogOut className="mr-1" size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2 text-center rounded hover:bg-blue-600"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2 text-center rounded bg-white text-blue-600 hover:bg-gray-100"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        {isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            {/* Welcome Header */}
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-blue-800">
                    Welcome, {userProfile.name}
                  </h2>
                  <p className="text-sm text-blue-600">
                    Employee ID: {userProfile.employeeId}
                  </p>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <User size={28} className="text-blue-600" />
                </div>
              </div>
            </div>

            {/* Selfie Attendance Section */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-center mb-2">
                Selfie Attendance
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Capture a selfie to mark your attendance
              </p>

              {/* Location Display */}
              <div className="mb-4 bg-gray-100 p-3 rounded-md text-sm text-gray-600">
                <p className="font-medium mb-1">Your current location:</p>
                {location.lat && location.lon ? (
                  <div className="font-mono text-xs">
                    Lat: {location.lat.toFixed(6)}, Lon:{" "}
                    {location.lon.toFixed(6)}
                  </div>
                ) : (
                  <div className="text-red-500 text-xs mt-1">
                    Getting location... Please enable location services.
                  </div>
                )}
              </div>

              {/* Selfie UI */}
              <div className="mb-4">
                {selfieImage ? (
                  <div className="relative">
                    <img
                      src={selfieImage}
                      alt="Captured Selfie"
                      className="w-full rounded-lg border shadow-sm"
                    />
                    <button
                      onClick={resetSelfie}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border rounded-lg bg-gray-800 relative overflow-hidden">
                    {!cameraActive ? (
                      <div className="flex items-center justify-center h-64 bg-gray-900">
                        <button
                          onClick={() => setCameraActive(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                        >
                          Open Camera
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover"
                        />
                        <button
                          onClick={captureSelfie}
                          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-full shadow-md"
                        >
                          <div className="w-12 h-12 rounded-full border-4 border-blue-500"></div>
                        </button>
                      </>
                    )}
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>

              {/* Submit Button */}
              <button
                onClick={sendPunchInData}
                disabled={
                  isSubmitting || !selfieImage || !location.lat || !location.lon
                }
                className={`w-full py-3 rounded-md text-white font-medium ${
                  isSubmitting || !selfieImage || !location.lat || !location.lon
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isSubmitting ? "Processing..." : "Punch In"}
              </button>

              {/* Response */}
              {apiResponse && (
                <div
                  className={`mt-4 p-3 rounded-md text-center ${
                    apiResponse.success
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {apiResponse.message}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Not Authenticated UI
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <User size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              Please login or create an account to use the attendance system
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuthModal(true);
                }}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 bg-blue-600 text-white">
              <h3 className="text-lg font-bold">
                {authMode === "login" ? "Login" : "Create Account"}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              {/* Username field for both login and signup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={userData.userName}
                  onChange={(e) =>
                    setUserData({ ...userData, userName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={userData.password}
                  onChange={(e) =>
                    setUserData({ ...userData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : authMode === "login"
                  ? "Login"
                  : "Create Account"}
              </button>

              <div className="text-center text-sm text-gray-600">
                {authMode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className="text-blue-600 hover:underline"
                    >
                      Sign Up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className="text-blue-600 hover:underline"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfieLocationPunched;
