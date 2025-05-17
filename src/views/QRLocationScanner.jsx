import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import {
  UserCircle,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  CalendarCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

const QRLocationScanner = () => {
  const [scannedResult, setScannedResult] = useState(null);
  const [openScanner, setOpenScanner] = useState(false);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("environment");

  const scannerRef = useRef(null);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    employeeId: "",
  });

  const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  const areLocationsMatching = (userLoc, targetLoc) => {
    if (!userLoc || !targetLoc) return false;

    const userLat = parseFloat(userLoc.lat);
    const userLon = parseFloat(userLoc.lon);
    const targetLat = parseFloat(targetLoc.lat || targetLoc.Lat);
    const targetLon = parseFloat(targetLoc.lon || targetLoc.Lon);

    if (
      isNaN(userLat) ||
      isNaN(userLon) ||
      isNaN(targetLat) ||
      isNaN(targetLon)
    )
      return false;

    const toRadians = (degree) => (degree * Math.PI) / 180;

    const earthRadius = 6371;
    const dLat = toRadians(targetLat - userLat);
    const dLon = toRadians(targetLon - userLon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(userLat)) *
        Math.cos(toRadians(targetLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceInKm = earthRadius * c;
    const distanceInMeters = distanceInKm * 1000;

    const maxAllowedDistance = isAppleDevice() ? 800 : 500; // Increase tolerance on Apple devices

    return distanceInMeters <= maxAllowedDistance;
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { exact: "environment" } } })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          console.log("Camera permission granted");
        })
        .catch((err) => {
          console.error("Camera permission denied:", err);
          alert("Camera permission is required for QR scanning.");
        });

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

  useEffect(() => {
    if (openScanner && !scannedResult && location.lat && location.lon) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        // Add the facingMode here via constraints for the camera
        videoConstraints: {
          facingMode: cameraFacing,
        },
      };

      if (scannerRef.current) {
        scannerRef.current.clear().catch((error) => {
          console.error("Error clearing previous scanner:", error);
        });
        scannerRef.current = null;
      }

      const scanner = new Html5QrcodeScanner("qr-reader", config, false);

      scanner.render(
        (decodedText, decodedResult) => {
          try {
            let parsedData;
            try {
              parsedData = JSON.parse(decodedText);
            } catch (parseError) {
              console.error(
                "Failed to parse as JSON, trying as plain text:",
                parseError
              );
              parsedData = { locationName: decodedText, lat: null, lon: null };
            }

            const normalizedData = {
              locationName: parsedData.LocationName || "Unknown Location",
              lat: parsedData.lat || parsedData.Lat,
              lon: parsedData.lon || parsedData.Lon,
            };

            setScannedResult(normalizedData);

            if (
              normalizedData.lat &&
              normalizedData.lon &&
              location.lat &&
              location.lon
            ) {
              const locationMatches = areLocationsMatching(
                location,
                normalizedData
              );
              setIsPunchedIn(locationMatches);

              if (locationMatches && isAuthenticated) {
                sendPunchInData(normalizedData);
              }
            } else {
              console.log("QR code doesn't contain valid location coordinates");
              setIsPunchedIn(false);
            }
          } catch (error) {
            console.error("Error processing QR data:", error);
            alert("Error processing QR code data");
          }

          scanner.clear();
        },
        (errorMessage) => {
          console.log("QR scan error:", errorMessage);
        }
      );

      scannerRef.current = scanner;
    }

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

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (error) {
          console.error("Error clearing scanner:", error);
        }
        scannerRef.current = null;
      }
    };
  }, [openScanner, scannedResult, location, isAuthenticated, cameraFacing]);

  // Function to send punch-in data to backend API

  const sendPunchInData = async (qrData) => {
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

    const qrLat = parseFloat(qrData.lat || qrData.Lat);
    const qrLon = parseFloat(qrData.lon || qrData.Lon);
    if (isNaN(qrLat) || isNaN(qrLon)) {
      alert("Invalid QR location data. Please scan a valid QR code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userID: userProfile.employeeId,
        userName: userProfile.name,
        email: userProfile.email,
        timeStamp: new Date().toISOString(),
        location: {
          latitude: location.lat,
          longitude: location.lon,
        },
        qrLocation: {
          latitude: qrLat,
          longitude: qrLon,
        },
        locationName: qrData.locationName || "Unknown Location",
      };

      const response = await axios.post(
        "https://gpsbackend-5mu0.onrender.com/data",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Assuming response.data has a 'success' boolean and 'message' string
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
        // Optionally force logout here if you have a logout function
        // logoutUser();
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
        ? "https://gpsbackend-5mu0.onrender.com/user/login"
        : "https://gpsbackend-5mu0.onrender.com/user/signup";

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

        setScannedResult(null);
        setIsPunchedIn(false);
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

            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                QR Location Scanner
              </h3>

              {openScanner && !scannedResult && (
                <>
                  <div
                    id="qr-reader"
                    className="w-full h-[350px] sm:h-[400px] border rounded-md overflow-hidden"
                  />

                  {location.lat && location.lon && (
                    <div className="text-sm mt-4 text-gray-600 w-full text-center">
                      <p className="font-medium">Current Location:</p>
                      <p>📍 Lat: {location.lat.toFixed(5)}</p>
                      <p>📍 Lon: {location.lon.toFixed(5)}</p>
                    </div>
                  )}
                </>
              )}

              <div className="mb-4 flex justify-center gap-4">
                <button
                  onClick={() => setCameraFacing("user")}
                  className={`px-4 py-2 rounded-md border ${
                    cameraFacing === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white"
                  }`}
                >
                  Front Camera
                </button>
                <button
                  onClick={() => setCameraFacing("environment")}
                  className={`px-4 py-2 rounded-md border ${
                    cameraFacing === "environment"
                      ? "bg-blue-600 text-white"
                      : "bg-white"
                  }`}
                >
                  Back Camera
                </button>
              </div>

              {scannedResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md w-full">
                  <p className="text-green-700 font-semibold mb-2 text-center">
                    ✅ QR Code Detected
                  </p>

                  <div className="text-sm text-gray-700 break-all bg-white p-3 rounded border border-gray-200">
                    <p className="font-medium mb-1">Location Data:</p>
                    <p>Location: {scannedResult.locationName || "Unknown"}</p>
                    {/* Fix: Use consistent property names */}
                    <p>
                      Coordinates:{" "}
                      {scannedResult.lat || scannedResult.Lat || "N/A"},{" "}
                      {scannedResult.lon || scannedResult.Lon || "N/A"}
                    </p>
                  </div>

                  {location.lat && location.lon && (
                    <div className="mt-4 text-gray-700">
                      <p className="font-medium">Your Location:</p>
                      <p>📍 Lat: {location.lat.toFixed(5)}</p>
                      <p>📍 Lon: {location.lon.toFixed(5)}</p>

                      {isPunchedIn && (
                        <div className="mt-4">
                          <div className="bg-green-600 text-white py-3 px-4 rounded-lg font-bold text-lg text-center animate-pulse">
                            ✅ PUNCHED IN SUCCESSFULLY
                          </div>

                          {isSubmitting && (
                            <p className="text-center text-gray-600 mt-2">
                              Sending data to server...
                            </p>
                          )}

                          {apiResponse && (
                            <div
                              className={`mt-3 p-3 rounded-md text-sm ${
                                apiResponse.success
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              <p>
                                {apiResponse.message ||
                                  "Attendance recorded successfully"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!isPunchedIn && (
                        <div className="mt-4 bg-red-100 text-red-700 py-2 px-3 rounded-md text-center">
                          ❌ Location mismatch - Not punched in
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setOpenScanner((prev) => !prev);
                  if (scannedResult) {
                    setScannedResult(null);
                    setIsPunchedIn(false);
                    setApiResponse(null);
                  }
                  if (!openScanner) setLocation({ lat: null, lon: null });
                }}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : scannedResult
                  ? "Scan Again"
                  : openScanner
                  ? "Close Scanner"
                  : "Scan QR Code"}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <User size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              Please login or create an account to use the QR scanner
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
                className="px-6 py-2 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
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
              {/* ✅ Show username only for login */}
              {authMode === "login" && (
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
              )}

              {authMode === "signup" && (
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
                    required={authMode === "signup"}
                  />
                </div>
              )}

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

export default QRLocationScanner;
