import React, { useState, useEffect } from "react";
import { QRCode } from "react-qrcode-logo";
import { getDistance } from "geolib";


const Scanner = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState("Fetching location...");
  const [qrData, setQRData] = useState(null);
  const [result, setResult] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [activeTab, setActiveTab] = useState("generate"); // 'generate' or 'scan'
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getLocationName = async (latitude, longitude) => {
    try {
      console.log("Fetching location name for coordinates:", latitude, longitude);
      
      // Cache-busting with timestamp to avoid getting cached responses
      const timestamp = new Date().getTime();
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&_=${timestamp}`,
        {
          headers: {
            "User-Agent": "QR Attendance System",
          },
          cache: "no-cache" // Ensure no caching
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get location name: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received location data:", data);
      
      // Format the location data for display
      let locationString = "";
      
      if (data.address) {
        const addr = data.address;
        const components = [];
        
        // Add relevant components in order of importance
        if (addr.building) components.push(addr.building);
        if (addr.road) components.push(addr.road);
        if (addr.suburb) components.push(addr.suburb);
        if (addr.city || addr.town || addr.village) {
          components.push(addr.city || addr.town || addr.village);
        }
        if (addr.state) components.push(addr.state);
        if (addr.country) components.push(addr.country);
        
        locationString = components.join(", ");
      } else {
        locationString = data.display_name || "Unknown location";
      }
      
      console.log("Final location string:", locationString);
      return locationString;
    } catch (error) {
      console.error("Error getting location name:", error);
      return "Location name unavailable";
    }
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setIsLoading(false);
          resolve(coords);
        },
        (error) => {
          setIsLoading(false);
          setLocationName("Location access denied");
          reject(error);
        }
      );
    });
  };

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      const currentLocation = await getCurrentLocation();
      setUserLocation(currentLocation);
      
      // Directly fetch location name to ensure it's fresh
      const name = await getLocationName(currentLocation.lat, currentLocation.lng);
      setLocationName(name);
      console.log("Location for QR:", name);
      
      const qrLocationData = JSON.stringify({
        Lat: currentLocation.lat,
        Lon: currentLocation.lng,
        LocationName: name
      });
      
      setQRData(qrLocationData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("Error getting location:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "generate") {
      setLocationName("Fetching location...");
      generateQRCode();
    }
  }, [activeTab, refreshTrigger]);

  const handleScan = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      const parsedQR = JSON.parse(scanInput);

      const currentLocation = await getCurrentLocation();
      setUserLocation(currentLocation);

      // Get current location name
      const name = await getLocationName(currentLocation.lat, currentLocation.lng);
      setLocationName(name);
      console.log("Current scan location:", name);

      const distance = getDistance(
        { latitude: parsedQR.Lat, longitude: parsedQR.Lon },
        { latitude: currentLocation.lat, longitude: currentLocation.lng }
      );

      setTimeout(() => {
        setIsLoading(false);
        if (distance <= 50) {
          setResult({
            success: true,
            message: "Attendance marked successfully!",
            details: `You are within the required distance (${distance} meters)`,
            scannedLocation: parsedQR.LocationName || "Unknown location"
          });
        } else {
          setResult({
            success: false,
            message: "Attendance verification failed",
            details: `You are ${distance} meters away from the required location`,
            scannedLocation: parsedQR.LocationName || "Unknown location"
          });
        }
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setResult({
        success: false,
        message: "Error processing QR data",
        details: "Please ensure you've pasted valid location data",
      });
    }
  };

  const refreshLocation = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          QR Attendance System
        </h1>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 py-2 rounded-lg transition-all duration-200 ${
              activeTab === "generate"
                ? "bg-white text-blue-600 shadow-sm font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Xtention Crew Technologies
          </button>
        </div>

        {/* Generate QR Tab */}
        {activeTab === "generate" && (
          <div className="mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Digital QR Code:</p>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : qrData ? (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-center items-center">
                    <QRCode
                      value={qrData}
                      size={200}
                      bgColor="#FAFAFA"
                      fgColor="#000"
                      level="H"
                    />
                  </div>
                  {userLocation && (
                    <div className="mt-4 text-gray-700 text-sm bg-white p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">Latitude</p>
                          <p className="font-mono">
                            {userLocation.lat.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Longitude</p>
                          <p className="font-mono">
                            {userLocation.lng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm break-words">{locationName}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>Unable to get your location</p>
              )}

              <button
                onClick={refreshLocation}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center mx-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Location
              </button>
            </div>
          </div>
        )}

        {/* Scan QR Tab */}
        {activeTab === "scan" && (
          <div>
            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Paste QR Data
              </label>
              <textarea
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder='{ "Lat": 28.7041, "Lon": 77.1025, "LocationName": "New Delhi, India" }'
                className="w-full p-3 border border-gray-300 rounded-lg h-24 font-mono text-sm"
              />
            </div>

            <button
              onClick={handleScan}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Verify Attendance"
              )}
            </button>

            {result && (
              <div
                className={`mt-6 p-4 rounded-lg text-center ${
                  result.success
                    ? "bg-green-50 border border-green-100"
                    : "bg-red-50 border border-red-100"
                }`}
              >
                <div className="mb-2">
                  {result.success ? (
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  )}
                  <div
                    className={
                      result.success
                        ? "text-green-700 font-medium"
                        : "text-red-700 font-medium"
                    }
                  >
                    {result.message}
                  </div>
                </div>
                <div
                  className={
                    result.success
                      ? "text-green-600 text-sm"
                      : "text-red-600 text-sm"
                  }
                >
                  {result.details}
                </div>
                {result.scannedLocation && (
                  <div className="mt-2 text-gray-600 text-sm">
                    <p>Required check-in location:</p>
                    <div className="font-medium text-xs mt-1">
                      {result.scannedLocation}
                    </div>
                  </div>
                )}
                {userLocation && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-gray-600 text-sm">
                    <p>Your current location:</p>
                    <div className="font-mono text-xs mt-1">
                      {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </div>
                    <div className="text-xs mt-1">{locationName}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;