import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { UserCircle, LogIn, LogOut, User, Menu, X } from "lucide-react";

const QRLocationScanner = () => {
  const [scannedResult, setScannedResult] = useState(null);
  const [openScanner, setOpenScanner] = useState(false);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
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
    employeeId: ""
  });

  // Function to check if locations match
  const areLocationsMatching = (userLoc, targetLoc) => {
    if (!userLoc || !targetLoc) return false;

    const targetLat = parseFloat(targetLoc.Lat);
    const targetLon = parseFloat(targetLoc.Lon);

    if (isNaN(targetLat) || isNaN(targetLon)) return false;

    const threshold = 0.001; // ~100 meters accuracy
    return (
      Math.abs(userLoc.lat - targetLat) < threshold &&
      Math.abs(userLoc.lon - targetLon) < threshold
    );
  };

  useEffect(() => {
    if (openScanner && !scannedResult && location.lat && location.lon) {
      // Start QR scanner only when location is available
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      const scanner = new Html5QrcodeScanner("qr-reader", config, false);

      scanner.render(
        (decodedText, decodedResult) => {
          console.log("QR Code detected:", decodedText);
          try {
            const parsedData = JSON.parse(decodedText);
            setScannedResult(parsedData);

            if (parsedData && location.lat && location.lon) {
              const locationMatches = areLocationsMatching(location, parsedData);
              setIsPunchedIn(locationMatches);
              
              // If location matches and user is authenticated, send data to API
              if (locationMatches && isAuthenticated) {
                sendPunchInData(parsedData);
              }
            }
          } catch (error) {
            console.error("Error parsing QR data:", error);
            alert("Invalid QR code format");
          }

          scanner.clear(); // Stop scanning after detection
        },
        (errorMessage) => {
          console.log("QR scan error:", errorMessage);
        }
      );

      scannerRef.current = scanner;
    }

    // Get current location if not available
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

    // Cleanup the scanner when component unmounts or scanning stops
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (error) {
          console.error("Error clearing scanner:", error);
        }
      }
    };
  }, [openScanner, scannedResult, location, isAuthenticated]);

  // Function to send punch-in data to backend API
  const sendPunchInData = async (qrData) => {
    if (!isAuthenticated) {
      alert("Please log in to record your attendance");
      return;
    }

    setIsSubmitting(true);
    try {
      // API call to record attendance
      const response = await fetch('https://your-api-endpoint.com/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.employeeId,
          userName: userProfile.name,
          email: userProfile.email,
          timestamp: new Date().toISOString(),
          location: {
            latitude: location.lat,
            longitude: location.lon
          },
          qrLocation: {
            latitude: parseFloat(qrData.Lat),
            longitude: parseFloat(qrData.Lon)
          },
          locationName: qrData.locationName || "Unknown Location"
        })
      });

      const data = await response.json();
      setApiResponse(data);
      console.log("Attendance recorded:", data);
    } catch (error) {
      console.error("Error recording attendance:", error);
      setApiResponse({ 
        success: false, 
        message: "Failed to record attendance. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle login/signup form submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // API endpoint based on auth mode
      const endpoint = authMode === "login" 
        ? "https://your-api-endpoint.com/login"
        : "https://your-api-endpoint.com/signup";

      // For demo purposes - mock API response
      // In a real app, you would make an actual API call:
      /*
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      */

      // Mock successful authentication for demo
      setTimeout(() => {
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        // Mock user profile data (in real app, this would come from API)
        setUserProfile({
          name: userData.name || "John Doe",
          email: userData.email,
          employeeId: "EMP" + Math.floor(10000 + Math.random() * 90000)
        });
        
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error("Authentication error:", error);
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserProfile({
      name: "",
      email: "",
      employeeId: ""
    });
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
            
            <div className="hidden md:block">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <UserCircle className="mr-2" size={20} />
                    {userProfile.name}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 rounded hover:bg-blue-700"
                  >
                    <LogOut className="mr-1" size={16} />
                    Logout
                  </button>
                </div>
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
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-700 px-4 py-3">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center py-2 border-b border-blue-600">
                  <UserCircle className="mr-2" size={20} />
                  <span>{userProfile.name}</span>
                </div>
                <div className="flex items-center py-2 text-sm">
                  <span className="opacity-80">ID: {userProfile.employeeId}</span>
                </div>
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
                  <h2 className="text-xl font-bold text-blue-800">Welcome, {userProfile.name}</h2>
                  <p className="text-sm text-blue-600">Employee ID: {userProfile.employeeId}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <User size={28} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">QR Location Scanner</h3>

              {openScanner && !scannedResult && (
                <>
                  <div id="qr-reader" className="w-full max-h-64 border rounded-md overflow-hidden" />
                  {location.lat && location.lon && (
                    <div className="text-sm mt-4 text-gray-600 w-full text-center">
                      <p className="font-medium">Current Location:</p>
                      <p>📍 Lat: {location.lat.toFixed(5)}</p>
                      <p>📍 Lon: {location.lon.toFixed(5)}</p>
                    </div>
                  )}
                </>
              )}

              {scannedResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md w-full">
                  <p className="text-green-700 font-semibold mb-2 text-center">
                    ✅ QR Code Detected
                  </p>
                  
                  <div className="text-sm text-gray-700 break-all bg-white p-3 rounded border border-gray-200">
                    <p className="font-medium mb-1">Location Data:</p>
                    <p>Location: {scannedResult.locationName || "Unknown"}</p>
                    <p>Coordinates: {scannedResult.Lat}, {scannedResult.Lon}</p>
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
                            <p className="text-center text-gray-600 mt-2">Sending data to server...</p>
                          )}
                          
                          {apiResponse && (
                            <div className={`mt-3 p-3 rounded-md text-sm ${apiResponse.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <p>{apiResponse.message || "Attendance recorded successfully"}</p>
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
                      : "Scan QR Code"
                }
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <User size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please login or create an account to use the QR scanner</p>
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
              {authMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={(e) => setUserData({...userData, name: e.target.value})}
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
                  onChange={(e) => setUserData({...userData, email: e.target.value})}
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
                  onChange={(e) => setUserData({...userData, password: e.target.value})}
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
                    : "Create Account"
                }
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