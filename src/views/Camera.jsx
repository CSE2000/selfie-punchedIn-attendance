import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import axios from "axios";
import { IoMdArrowBack } from "react-icons/io";

const CameraPunchedIn = () => {
  const navigate = useNavigate();
  const [targetLocations, setTargetLocations] = useState([null]);
  const [selfieImage, setSelfieImage] = useState(null);
  const [imageTimestamp, setImageTimestamp] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [locationName, setLocationName] = useState("Unknown Location");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState(null);
  const [punchInTimestamp, setPunchInTimestamp] = useState(null);
  const [punchInLocationName, setPunchInLocationName] = useState(""); // Store punch-in location
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    employeeId: "",
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  // Function to get location name from coordinates using reverse geocoding
  const getLocationName = async (lat, lon) => {
    try {
      setIsGettingLocation(true);

      // Using OpenStreetMap Nominatim API for reverse geocoding (free)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            "User-Agent": "AttendanceApp/1.0",
          },
        }
      );

      if (response.data && response.data.address) {
        const address = response.data.address;
        // Try to get city, town, or village name
        const cityName =
          address.city ||
          address.town ||
          address.village ||
          address.county ||
          address.state_district ||
          address.state ||
          "Unknown Location";

        setLocationName(cityName);
        return cityName;
      } else {
        setLocationName("Unknown Location");
        return "Unknown Location";
      }
    } catch (error) {
      console.error("Error getting location name:", error);
      setLocationName("Unknown Location");
      return "Unknown Location";
    } finally {
      setIsGettingLocation(false);
    }
  };

  const areLocationsMatching = (userLoc, targetLocs) => {
    if (!userLoc || !targetLocs?.length) return false;

    const userLat = parseFloat(userLoc.lat);
    const userLon = parseFloat(userLoc.lon);
    const maxAllowedDistance = isAppleDevice() ? 10000 : 15000; // meters

    const toRadians = (degree) => (degree * Math.PI) / 180;
    const earthRadius = 6371; // in km

    return targetLocs.some((target) => {
      if (!target || target.lat === null || target.lon === null) return false;

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

  // Check authentication and redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    // Load user profile if available in localStorage
    const savedAuthState = localStorage.getItem("authState");
    if (savedAuthState) {
      const parsedAuthState = JSON.parse(savedAuthState);
      setUserProfile(parsedAuthState.userProfile);
    }

    // Check if user is already punched in
    const savedPunchInState = localStorage.getItem("punchInState");
    if (savedPunchInState) {
      const punchState = JSON.parse(savedPunchInState);
      setIsPunchedIn(punchState.isPunchedIn);
      setPunchInTime(punchState.punchInTime);
      setPunchInTimestamp(punchState.punchInTimestamp);
      setPunchInLocationName(punchState.punchInLocationName || ""); // Restore location name
    }
  }, [navigate]);

  // Fetch target locations
  useEffect(() => {
    const fetchTargetLocations = async () => {
      try {
        const response = await axios.get("http://192.168.1.26:8000/location");
        console.log("location Data:", response.data);

        // Always-available fallback or additional known locations
        const fallbackLocations = [
          { lat: 21.246699, lon: 81.662397 },
          { lat: 21.237747, lon: 81.66866 },
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
          { lat: 21.237743, lon: 81.67866 },
        ]);
      }
    };

    fetchTargetLocations();
  }, []);

  // Request permissions on component mount
  useEffect(() => {
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
        async (position) => {
          console.log("Location permission granted");
          const currentLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setLocation(currentLocation);

          // Get location name automatically
          await getLocationName(currentLocation.lat, currentLocation.lon);
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
  }, []);

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
          async (position) => {
            const currentLocation = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            };
            setLocation(currentLocation);

            // Get location name automatically
            await getLocationName(currentLocation.lat, currentLocation.lon);
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

      // Convert to JPEG format with quality (0.8 = 80% quality)
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Capture the exact timestamp when image is taken
      const captureTime = new Date().toISOString();

      setSelfieImage(imageData);
      setImageTimestamp(captureTime);
      console.log("Selfie captured at:", captureTime);
      console.log("Selfie data URL length:", imageData.length);

      // Stop camera after capturing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    }
  };

  // Function to reset selfie
  const resetSelfie = () => {
    setSelfieImage(null);
    setImageTimestamp(null);
    setCameraActive(true);
    // Clear any previous API response when resetting
    setApiResponse(null);
  };

  // Helper: convert data URL to Blob - IMPROVED VERSION
  function dataURLToBlob(dataURL) {
    try {
      // Split the data URL
      const parts = dataURL.split(",");
      if (parts.length !== 2) {
        throw new Error("Invalid data URL format");
      }

      const header = parts[0];
      const data = parts[1];

      // Extract mime type
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      // Convert base64 to binary
      const byteString = atob(data);
      const byteArray = new Uint8Array(byteString.length);

      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }

      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error("Error converting data URL to blob:", error);
      throw error;
    }
  }

  // Function to handle punch in (requires selfie + location verification)
  const handlePunchIn = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token not found. Please log in again.");
      navigate("/");
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

    // Check location for punch in only
    if (!areLocationsMatching(location, targetLocations)) {
      alert("You are not at the correct location for punch in.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get fresh location name before submitting
      const currentLocationName = await getLocationName(
        location.lat,
        location.lon
      );

      // Convert selfie image to blob
      const selfieBlob = dataURLToBlob(selfieImage);

      if (selfieBlob.size === 0) {
        throw new Error("Selfie image is empty");
      }

      // Create current timestamp for punch in
      const currentTime = new Date().toISOString();

      // Create FormData for punch in
      const formData = new FormData();
      formData.append("userID", userProfile.employeeId || "EMP0001");
      formData.append("userName", userProfile.name || "Employee");
      formData.append("email", userProfile.email || "employee@company.com");
      formData.append("punchIn", currentTime);
      formData.append("imageTimestamp", imageTimestamp || currentTime);
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lon.toString());
      formData.append("selfieImage", selfieBlob, "punchin_selfie.jpg");
      formData.append("locationName", currentLocationName);

      console.log("Submitting punch-in data:", {
        userID: userProfile.employeeId || "EMP0001",
        userName: userProfile.name || "Employee",
        email: userProfile.email || "employee@company.com",
        locationName: currentLocationName,
        punchIn: currentTime,
        coordinates: { lat: location.lat, lon: location.lon },
      });

      const response = await axios.post(
        "http://192.168.1.26:8000/data",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Punch in API response:", response.data);

      if (response.status === 200 && response.data.success) {
        const punchInTimeFormatted = new Date(currentTime).toLocaleString();

        // Update state to show punched in
        setIsPunchedIn(true);
        setPunchInTime(punchInTimeFormatted);
        setPunchInTimestamp(currentTime); // Store original timestamp for punch out
        setPunchInLocationName(currentLocationName); // Store punch-in location

        // Save punch in state to localStorage
        localStorage.setItem(
          "punchInState",
          JSON.stringify({
            isPunchedIn: true,
            punchInTime: punchInTimeFormatted,
            punchInTimestamp: currentTime, // Store original timestamp
            punchInLocationName: currentLocationName, // Store location name
          })
        );

        setApiResponse({
          success: true,
          message: `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName} on ${punchInTimeFormatted}`,
        });

        // Reset selfie for next action
        setSelfieImage(null);
        setImageTimestamp(null);

        console.log("Punch in recorded successfully:", response.data);
      } else {
        setApiResponse({
          success: false,
          message:
            response.data.message || "Failed to punch in. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error recording punch in:", error);
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
            "Failed to record punch in. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle punch out (FIXED - includes punchIn timestamp and all required data)
  const handlePunchOut = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Token not found. Please log in again.");
      navigate("/");
      return;
    }

    if (!location || !location.lat || !location.lon) {
      alert("Your location could not be determined. Please enable GPS.");
      return;
    }

    // Ensure we have the original punch in timestamp
    if (!punchInTimestamp) {
      alert("Punch in timestamp not found. Please punch in first.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get fresh location name before submitting
      const currentLocationName = await getLocationName(
        location.lat,
        location.lon
      );

      // Create current timestamp for punch out
      const currentTime = new Date().toISOString();

      // Create FormData for punch out - INCLUDES ALL REQUIRED DATA
      const formData = new FormData();
      formData.append("userID", userProfile.employeeId || "EMP0001");
      formData.append("userName", userProfile.name || "Employee");
      formData.append("email", userProfile.email || "employee@company.com");
      formData.append("punchIn", punchInTimestamp); // ORIGINAL PUNCH IN TIME - REQUIRED TO UPDATE CORRECT RECORD
      formData.append("punchOut", currentTime); // NEW PUNCH OUT TIME
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lon.toString());
      formData.append("locationName", punchInLocationName || currentLocationName); // Use punch-in location or current location

      console.log("Submitting punch-out data (INCLUDES PUNCH IN TIME):", {
        userID: userProfile.employeeId || "EMP0001",
        userName: userProfile.name || "Employee",
        email: userProfile.email || "employee@company.com",
        locationName: punchInLocationName || currentLocationName,
        punchIn: punchInTimestamp, // ORIGINAL PUNCH IN TIME - CRITICAL FOR BACKEND
        punchOut: currentTime, // NEW PUNCH OUT TIME
        coordinates: { lat: location.lat, lon: location.lon },
      });

      const response = await axios.post(
        "http://192.168.1.26:8000/data",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Punch out API response:", response.data);

      if (response.status === 200 && response.data.success) {
        const punchOutTimeFormatted = new Date(currentTime).toLocaleString();

        // Update state to show not punched in
        setIsPunchedIn(false);
        setPunchInTime(null);
        setPunchInTimestamp(null);
        setPunchInLocationName("");

        // Clear punch in state from localStorage
        localStorage.removeItem("punchInState");

        setApiResponse({
          success: true,
          message: `✅ PUNCHED OUT SUCCESSFULLY at ${currentLocationName} on ${punchOutTimeFormatted}`,
        });

        console.log("Punch out recorded successfully:", response.data);
      } else {
        setApiResponse({
          success: false,
          message:
            response.data.message || "Failed to punch out. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error recording punch out:", error);
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
            "Failed to record punch out. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center space-x-2 text-gray-600 font-medium"
        >
          <IoMdArrowBack size={20} />
          <span>Home</span>
        </button>
      </div>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 mt-4">
              {/* Status Display */}
              {isPunchedIn && punchInTime && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✅ Punched In:</strong> {punchInTime}
                  </p>
                  {punchInLocationName && (
                    <p className="text-xs text-green-600 mt-1">
                      <strong>Location:</strong> {punchInLocationName}
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    Ready to punch out when your work is done.
                  </p>
                </div>
              )}

              {/* Location Info Display */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Current Location:</strong>{" "}
                  {isGettingLocation ? "Detecting..." : locationName}
                </p>
                {location.lat && location.lon && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {location.lat.toFixed(6)},{" "}
                    {location.lon.toFixed(6)}
                  </p>
                )}
                {imageTimestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Image captured at:</strong>{" "}
                    {new Date(imageTimestamp).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Conditional UI based on punch status */}
              {!isPunchedIn ? (
                // PUNCH IN UI - Requires selfie + location verification
                <div className="flex flex-col items-center justify-center space-y-6">
                  {selfieImage ? (
                    <div className="relative">
                      {/* Circular Dotted Border */}
                      <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
                        <img
                          src={selfieImage}
                          alt="Captured Selfie"
                          className="w-60 h-60 rounded-full object-cover"
                        />
                      </div>
                      {/* Reset Button */}
                      <button
                        onClick={resetSelfie}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
                      {!cameraActive ? (
                        <button
                          onClick={() => setCameraActive(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
                        >
                          Open Camera
                        </button>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-44 h-44 rounded-full object-cover"
                          />
                          <button
                            onClick={captureSelfie}
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
                          >
                            <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {/* Title and Description */}
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Verify to Punch In
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm max-w-xs">
                      Capture your selfie at the correct location to record your
                      attendance.
                    </p>
                  </div>

                  {/* Punch In Button - Only show when selfie is captured */}
                  {selfieImage && (
                    <button
                      onClick={handlePunchIn}
                      disabled={
                        isSubmitting ||
                        !location.lat ||
                        !location.lon ||
                        isGettingLocation
                      }
                      className={`w-full py-3 rounded-md text-white font-medium ${
                        isSubmitting ||
                        !location.lat ||
                        !location.lon ||
                        isGettingLocation
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {isSubmitting
                        ? "Processing..."
                        : isGettingLocation
                        ? "Getting Location..."
                        : "Punch In"}
                    </button>
                  )}
                </div>
              ) : (
                // PUNCH OUT UI - Only requires location (NO SELFIE)
                <div className="flex flex-col items-center justify-center space-y-6">
                  {/* Clock Icon for Punch Out */}
                  <div className="w-48 h-48 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-200">
                    <div className="text-center">
                      <div className="text-6xl mb-2">🕐</div>
                      <p className="text-red-600 font-medium">Ready to</p>
                      <p className="text-red-600 font-medium">Punch Out</p>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Ready to Punch Out
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm max-w-xs">
                      Click the button below to record your punch out time.
                    </p>
                  </div>

                  {/* Punch Out Button - Always visible when punched in */}
                  <button
                    onClick={handlePunchOut}
                    disabled={
                      isSubmitting ||
                      !location.lat ||
                      !location.lon ||
                      isGettingLocation
                    }
                    className={`w-full py-3 rounded-md text-white font-medium ${
                      isSubmitting ||
                      !location.lat ||
                      !location.lon ||
                      isGettingLocation
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : isGettingLocation
                      ? "Getting Location..."
                      : "Punch Out"}
                  </button>
                </div>
              )}

              {/* API Response */}
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
        </div>
      </div>
    </>
  );
};

export default CameraPunchedIn;

// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const SelfiePunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [imageTimestamp, setImageTimestamp] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Unknown Location");
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   // Function to get location name from coordinates using reverse geocoding
//   const getLocationName = async (lat, lon) => {
//     try {
//       setIsGettingLocation(true);

//       // Using OpenStreetMap Nominatim API for reverse geocoding (free)
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
//         {
//           headers: {
//             "User-Agent": "AttendanceApp/1.0",
//           },
//         }
//       );

//       if (response.data && response.data.address) {
//         const address = response.data.address;
//         const cityName =
//           address.city ||
//           address.town ||
//           address.village ||
//           address.county ||
//           address.state_district ||
//           address.state ||
//           "Unknown Location";

//         setLocationName(cityName);
//         return cityName;
//       } else {
//         setLocationName("Unknown Location");
//         return "Unknown Location";
//       }
//     } catch (error) {
//       console.error("Error getting location name:", error);
//       setLocationName("Unknown Location");
//       return "Unknown Location";
//     } finally {
//       setIsGettingLocation(false);
//     }
//   };

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 1000 : 1500; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           console.log("Location permission granted");
//           const currentLocation = {
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           };
//           setLocation(currentLocation);

//           // Get location name automatically
//           await getLocationName(currentLocation.lat, currentLocation.lon);
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const currentLocation = {
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             };
//             setLocation(currentLocation);

//             // Get location name automatically
//             await getLocationName(currentLocation.lat, currentLocation.lon);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//       const imageData = canvas.toDataURL("image/jpeg");

//       // Capture the exact timestamp when image is taken
//       const captureTime = new Date().toISOString();

//       setSelfieImage(imageData);
//       setImageTimestamp(captureTime);
//       console.log("Selfie captured at:", captureTime);

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setImageTimestamp(null);
//     setCameraActive(true);
//   };

//   // Helper: convert base64 string to Blob
//   function base64ToBlob(base64, mimeType) {
//     const byteChars = atob(base64);
//     const byteNumbers = new Array(byteChars.length);
//     for (let i = 0; i < byteChars.length; i++) {
//       byteNumbers[i] = byteChars.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
//   }

//   // Function to send punch-in data to backend
//   const sendPunchInData = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPG/JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Create FormData and append fields & file blob
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("timeStamp", new Date().toISOString()); // Current submission time
//       formData.append(
//         "imageTimestamp",
//         imageTimestamp || new Date().toISOString()
//       ); // When image was captured
//       formData.append("latitude", location.lat);
//       formData.append("longitude", location.lon);
//       formData.append("selfieImage", selfieBlob, "selfie.png");
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-in data:", {
//         locationName: currentLocationName,
//         imageTimestamp: imageTimestamp,
//         submissionTime: new Date().toISOString(),
//         coordinates: { lat: location.lat, lon: location.lon },
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.status === 200 && response.data.success) {
//         setApiResponse({
//           success: true,
//           message:
//             response.data.message ||
//             `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName}`,
//         });
//         console.log("Attendance recorded:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording attendance:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record attendance. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Location Info Display */}
//               <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600">
//                   <strong>Current Location:</strong>{" "}
//                   {isGettingLocation ? "Detecting..." : locationName}
//                 </p>
//                 {location.lat && location.lon && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Coordinates: {location.lat.toFixed(6)},{" "}
//                     {location.lon.toFixed(6)}
//                   </p>
//                 )}
//                 {imageTimestamp && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     <strong>Image captured at:</strong>{" "}
//                     {new Date(imageTimestamp).toLocaleString()}
//                   </p>
//                 )}
//               </div>

//               {/* Selfie UI */}
//               <div className="flex flex-col items-center justify-center space-y-6">
//                 {selfieImage ? (
//                   <div className="relative">
//                     {/* Circular Dotted Border */}
//                     <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                       <img
//                         src={selfieImage}
//                         alt="Captured Selfie"
//                         className="w-60 h-60 rounded-full object-cover"
//                       />
//                     </div>
//                     {/* Reset Button */}
//                     <button
//                       onClick={resetSelfie}
//                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                     {!cameraActive ? (
//                       <button
//                         onClick={() => setCameraActive(true)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                       >
//                         Open Camera
//                       </button>
//                     ) : (
//                       <>
//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           className="w-44 h-44 rounded-full object-cover"
//                         />
//                         <button
//                           onClick={captureSelfie}
//                           className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                         >
//                           <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}

//                 <canvas ref={canvasRef} style={{ display: "none" }} />

//                 {/* Title and Description */}
//                 <div className="text-center">
//                   <h2 className="text-lg font-semibold text-gray-800">
//                     Verify to punch in
//                   </h2>
//                   <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                     Capture your selfie at the current location to record your
//                     attendance.
//                   </p>
//                 </div>

//                 {/* Submit Button */}
//                 <button
//                   onClick={sendPunchInData}
//                   disabled={
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon ||
//                     isGettingLocation
//                   }
//                   className={`mt-4 w-20 h-20 rounded-full font-medium flex items-center justify-center ${
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon ||
//                     isGettingLocation
//                       ? "bg-gray-300 text-white cursor-not-allowed"
//                       : "bg-purple-500 hover:bg-purple-600 text-white"
//                   }`}
//                 >
//                   {isSubmitting ? "..." : "✔"}
//                 </button>

//                 {/* API Response */}
//                 {apiResponse && (
//                   <div
//                     className={`mt-4 p-3 rounded-md text-center ${
//                       apiResponse.success
//                         ? "bg-green-100 text-green-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {apiResponse.message}
//                   </div>
//                 )}
//               </div>

//               <button
//                 onClick={sendPunchInData}
//                 disabled={
//                   isSubmitting ||
//                   !selfieImage ||
//                   !location.lat ||
//                   !location.lon ||
//                   isGettingLocation
//                 }
//                 className={`w-full py-3 rounded-md text-white font-medium ${
//                   isSubmitting ||
//                   !selfieImage ||
//                   !location.lat ||
//                   !location.lon ||
//                   isGettingLocation
//                     ? "bg-gray-400 cursor-not-allowed"
//                     : "bg-green-400 hover:bg-green-700"
//                 }`}
//               >
//                 {isSubmitting
//                   ? "Processing..."
//                   : isGettingLocation
//                   ? "Getting Location..."
//                   : "Punch In"}
//               </button>

//               {apiResponse && (
//                 <div
//                   className={`mt-4 p-3 rounded-md text-center ${
//                     apiResponse.success
//                       ? "bg-green-100 text-green-700"
//                       : "bg-red-100 text-red-700"
//                   }`}
//                 >
//                   {apiResponse.message}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default SelfiePunchedIn;



// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const CameraPunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [imageTimestamp, setImageTimestamp] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Unknown Location");
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [isPunchedIn, setIsPunchedIn] = useState(false);
//   const [punchInTime, setPunchInTime] = useState(null);
//   const [punchInTimestamp, setPunchInTimestamp] = useState(null); 
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   // Function to get location name from coordinates using reverse geocoding
//   const getLocationName = async (lat, lon) => {
//     try {
//       setIsGettingLocation(true);

//       // Using OpenStreetMap Nominatim API for reverse geocoding (free)
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
//         {
//           headers: {
//             "User-Agent": "AttendanceApp/1.0",
//           },
//         }
//       );

//       if (response.data && response.data.address) {
//         const address = response.data.address;
//         // Try to get city, town, or village name
//         const cityName =
//           address.city ||
//           address.town ||
//           address.village ||
//           address.county ||
//           address.state_district ||
//           address.state ||
//           "Unknown Location";

//         setLocationName(cityName);
//         return cityName;
//       } else {
//         setLocationName("Unknown Location");
//         return "Unknown Location";
//       }
//     } catch (error) {
//       console.error("Error getting location name:", error);
//       setLocationName("Unknown Location");
//       return "Unknown Location";
//     } finally {
//       setIsGettingLocation(false);
//     }
//   };

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 10000 : 15000; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       if (!target || target.lat === null || target.lon === null) return false;

//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }

//     // Check if user is already punched in
//     const savedPunchInState = localStorage.getItem("punchInState");
//     if (savedPunchInState) {
//       const punchState = JSON.parse(savedPunchInState);
//       setIsPunchedIn(punchState.isPunchedIn);
//       setPunchInTime(punchState.punchInTime);
//       setPunchInTimestamp(punchState.punchInTimestamp); // Restore original timestamp
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           console.log("Location permission granted");
//           const currentLocation = {
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           };
//           setLocation(currentLocation);

//           // Get location name automatically
//           await getLocationName(currentLocation.lat, currentLocation.lon);
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const currentLocation = {
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             };
//             setLocation(currentLocation);

//             // Get location name automatically
//             await getLocationName(currentLocation.lat, currentLocation.lon);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

//       // Convert to JPEG format with quality (0.8 = 80% quality)
//       const imageData = canvas.toDataURL("image/jpeg", 0.8);

//       // Capture the exact timestamp when image is taken
//       const captureTime = new Date().toISOString();

//       setSelfieImage(imageData);
//       setImageTimestamp(captureTime);
//       console.log("Selfie captured at:", captureTime);
//       console.log("Selfie data URL length:", imageData.length);

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//       setCameraActive(false);
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setImageTimestamp(null);
//     setCameraActive(true);
//     // Clear any previous API response when resetting
//     setApiResponse(null);
//   };

//   // Helper: convert data URL to Blob - IMPROVED VERSION
//   function dataURLToBlob(dataURL) {
//     try {
//       // Split the data URL
//       const parts = dataURL.split(",");
//       if (parts.length !== 2) {
//         throw new Error("Invalid data URL format");
//       }

//       const header = parts[0];
//       const data = parts[1];

//       // Extract mime type
//       const mimeMatch = header.match(/data:([^;]+)/);
//       const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

//       // Convert base64 to binary
//       const byteString = atob(data);
//       const byteArray = new Uint8Array(byteString.length);

//       for (let i = 0; i < byteString.length; i++) {
//         byteArray[i] = byteString.charCodeAt(i);
//       }

//       return new Blob([byteArray], { type: mimeType });
//     } catch (error) {
//       console.error("Error converting data URL to blob:", error);
//       throw error;
//     }
//   }

//   // Function to handle punch in (requires selfie + location verification)
//   const handlePunchIn = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     // Check location for punch in only
//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location for punch in.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Convert selfie image to blob
//       const selfieBlob = dataURLToBlob(selfieImage);

//       if (selfieBlob.size === 0) {
//         throw new Error("Selfie image is empty");
//       }

//       // Create current timestamp for punch in
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch in
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchIn", currentTime);
//       formData.append("imageTimestamp", imageTimestamp || currentTime);
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("selfieImage", selfieBlob, "punchin_selfie.jpg");
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-in data:", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchIn: currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch in API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchInTimeFormatted = new Date(currentTime).toLocaleString();

//         // Update state to show punched in
//         setIsPunchedIn(true);
//         setPunchInTime(punchInTimeFormatted);
//         setPunchInTimestamp(currentTime); // Store original timestamp for punch out

//         // Save punch in state to localStorage
//         localStorage.setItem(
//           "punchInState",
//           JSON.stringify({
//             isPunchedIn: true,
//             punchInTime: punchInTimeFormatted,
//             punchInTimestamp: currentTime, // Store original timestamp
//           })
//         );

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName} on ${punchInTimeFormatted}`,
//         });

//         // Reset selfie for next action
//         setSelfieImage(null);
//         setImageTimestamp(null);

//         console.log("Punch in recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch in:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch in. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Function to handle punch out (TIME ONLY - NO IMAGE REQUIRED)
//   const handlePunchOut = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Create current timestamp for punch out
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch out - TIME ONLY (NO IMAGE)
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchOut", currentTime); // Only punch out time
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-out data (TIME ONLY):", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchOut: currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch out API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchOutTimeFormatted = new Date(currentTime).toLocaleString();

//         // Update state to show not punched in
//         setIsPunchedIn(false);
//         setPunchInTime(null);

//         // Clear punch in state from localStorage
//         localStorage.removeItem("punchInState");

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED OUT SUCCESSFULLY at ${currentLocationName} on ${punchOutTimeFormatted}`,
//         });

//         console.log("Punch out recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch out. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch out:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch out. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Status Display */}
//               {isPunchedIn && punchInTime && (
//                 <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
//                   <p className="text-sm text-green-800">
//                     <strong>✅ Punched In:</strong> {punchInTime}
//                   </p>
//                   <p className="text-xs text-green-600 mt-1">
//                     Ready to punch out when your work is done.
//                   </p>
//                 </div>
//               )}

//               {/* Location Info Display */}
//               <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600">
//                   <strong>Current Location:</strong>{" "}
//                   {isGettingLocation ? "Detecting..." : locationName}
//                 </p>
//                 {location.lat && location.lon && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Coordinates: {location.lat.toFixed(6)},{" "}
//                     {location.lon.toFixed(6)}
//                   </p>
//                 )}
//                 {imageTimestamp && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     <strong>Image captured at:</strong>{" "}
//                     {new Date(imageTimestamp).toLocaleString()}
//                   </p>
//                 )}
//               </div>

//               {/* Conditional UI based on punch status */}
//               {!isPunchedIn ? (
//                 // PUNCH IN UI - Requires selfie + location verification
//                 <div className="flex flex-col items-center justify-center space-y-6">
//                   {selfieImage ? (
//                     <div className="relative">
//                       {/* Circular Dotted Border */}
//                       <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                         <img
//                           src={selfieImage}
//                           alt="Captured Selfie"
//                           className="w-60 h-60 rounded-full object-cover"
//                         />
//                       </div>
//                       {/* Reset Button */}
//                       <button
//                         onClick={resetSelfie}
//                         className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                       >
//                         <X size={16} />
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                       {!cameraActive ? (
//                         <button
//                           onClick={() => setCameraActive(true)}
//                           className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                         >
//                           Open Camera
//                         </button>
//                       ) : (
//                         <>
//                           <video
//                             ref={videoRef}
//                             autoPlay
//                             playsInline
//                             className="w-44 h-44 rounded-full object-cover"
//                           />
//                           <button
//                             onClick={captureSelfie}
//                             className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                           >
//                             <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                           </button>
//                         </>
//                       )}
//                     </div>
//                   )}

//                   <canvas ref={canvasRef} style={{ display: "none" }} />

//                   {/* Title and Description */}
//                   <div className="text-center">
//                     <h2 className="text-lg font-semibold text-gray-800">
//                       Verify to Punch In
//                     </h2>
//                     <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                       Capture your selfie at the correct location to record your
//                       attendance.
//                     </p>
//                   </div>

//                   {/* Punch In Button - Only show when selfie is captured */}
//                   {selfieImage && (
//                     <button
//                       onClick={handlePunchIn}
//                       disabled={
//                         isSubmitting ||
//                         !location.lat ||
//                         !location.lon ||
//                         isGettingLocation
//                       }
//                       className={`w-full py-3 rounded-md text-white font-medium ${
//                         isSubmitting ||
//                         !location.lat ||
//                         !location.lon ||
//                         isGettingLocation
//                           ? "bg-gray-400 cursor-not-allowed"
//                           : "bg-green-500 hover:bg-green-600"
//                       }`}
//                     >
//                       {isSubmitting
//                         ? "Processing..."
//                         : isGettingLocation
//                         ? "Getting Location..."
//                         : "Punch In"}
//                     </button>
//                   )}
//                 </div>
//               ) : (
//                 // PUNCH OUT UI - Only requires location (NO SELFIE)
//                 <div className="flex flex-col items-center justify-center space-y-6">
//                   {/* Clock Icon for Punch Out */}
//                   <div className="w-48 h-48 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-200">
//                     <div className="text-center">
//                       <div className="text-6xl mb-2">🕐</div>
//                       <p className="text-red-600 font-medium">Ready to</p>
//                       <p className="text-red-600 font-medium">Punch Out</p>
//                     </div>
//                   </div>

//                   {/* Title and Description */}
//                   <div className="text-center">
//                     <h2 className="text-lg font-semibold text-gray-800">
//                       Ready to Punch Out
//                     </h2>
//                     <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                       Click the button below to record your punch out time.
//                     </p>
//                   </div>

//                   {/* Punch Out Button - Always visible when punched in */}
//                   <button
//                     onClick={handlePunchOut}
//                     disabled={
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                     }
//                     className={`w-full py-3 rounded-md text-white font-medium ${
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                         ? "bg-gray-400 cursor-not-allowed"
//                         : "bg-red-500 hover:bg-red-600"
//                     }`}
//                   >
//                     {isSubmitting
//                       ? "Processing..."
//                       : isGettingLocation
//                       ? "Getting Location..."
//                       : "Punch Out"}
//                   </button>
//                 </div>
//               )}

//               {/* API Response */}
//               {apiResponse && (
//                 <div
//                   className={`mt-4 p-3 rounded-md text-center ${
//                     apiResponse.success
//                       ? "bg-green-100 text-green-700"
//                       : "bg-red-100 text-red-700"
//                   }`}
//                 >
//                   {apiResponse.message}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CameraPunchedIn;

// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const CameraPunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [imageTimestamp, setImageTimestamp] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Unknown Location");
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [isPunchedIn, setIsPunchedIn] = useState(false);
//   const [punchInTime, setPunchInTime] = useState(null);
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   // Function to get location name from coordinates using reverse geocoding
//   const getLocationName = async (lat, lon) => {
//     try {
//       setIsGettingLocation(true);

//       // Using OpenStreetMap Nominatim API for reverse geocoding (free)
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
//         {
//           headers: {
//             "User-Agent": "AttendanceApp/1.0",
//           },
//         }
//       );

//       if (response.data && response.data.address) {
//         const address = response.data.address;
//         // Try to get city, town, or village name
//         const cityName =
//           address.city ||
//           address.town ||
//           address.village ||
//           address.county ||
//           address.state_district ||
//           address.state ||
//           "Unknown Location";

//         setLocationName(cityName);
//         return cityName;
//       } else {
//         setLocationName("Unknown Location");
//         return "Unknown Location";
//       }
//     } catch (error) {
//       console.error("Error getting location name:", error);
//       setLocationName("Unknown Location");
//       return "Unknown Location";
//     } finally {
//       setIsGettingLocation(false);
//     }
//   };

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 10000 : 15000; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }

//     // Check if user is already punched in
//     const savedPunchInState = localStorage.getItem("punchInState");
//     if (savedPunchInState) {
//       const punchState = JSON.parse(savedPunchInState);
//       setIsPunchedIn(punchState.isPunchedIn);
//       setPunchInTime(punchState.punchInTime);
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           console.log("Location permission granted");
//           const currentLocation = {
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           };
//           setLocation(currentLocation);

//           // Get location name automatically
//           await getLocationName(currentLocation.lat, currentLocation.lon);
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const currentLocation = {
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             };
//             setLocation(currentLocation);

//             // Get location name automatically
//             await getLocationName(currentLocation.lat, currentLocation.lon);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

//       // Convert to JPEG format with quality (0.8 = 80% quality)
//       const imageData = canvas.toDataURL("image/jpeg", 0.8);

//       // Capture the exact timestamp when image is taken
//       const captureTime = new Date().toISOString();

//       setSelfieImage(imageData);
//       setImageTimestamp(captureTime);
//       console.log("Selfie captured at:", captureTime);

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//       setCameraActive(false);
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setImageTimestamp(null);
//     setCameraActive(true);
//     // Clear any previous API response when resetting
//     setApiResponse(null);
//   };

//   // Helper: convert base64 string to Blob
//   function base64ToBlob(base64, mimeType) {
//     const byteChars = atob(base64);
//     const byteNumbers = new Array(byteChars.length);
//     for (let i = 0; i < byteChars.length; i++) {
//       byteNumbers[i] = byteChars.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
//   }

//   // Function to handle punch in
//   const handlePunchIn = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL (JPEG format)
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Verify blob creation
//       console.log("Selfie blob created:", {
//         size: selfieBlob.size,
//         type: selfieBlob.type,
//         isValidBlob: selfieBlob instanceof Blob,
//       });

//       // Create current timestamp for punch in
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch in
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchIn", currentTime); // Current punch in time
//       formData.append("imageTimestamp", imageTimestamp || currentTime);
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("selfieImage", selfieBlob, "punchin_selfie.jpeg");
//       formData.append("locationName", currentLocationName);

//       // Log FormData contents for debugging
//       console.log("FormData contents:");
//       for (let [key, value] of formData.entries()) {
//         if (key === "selfieImage") {
//           console.log(`${key}:`, {
//             name: value.name,
//             size: value.size,
//             type: value.type,
//             lastModified: value.lastModified,
//           });
//         } else {
//           console.log(`${key}: ${value}`);
//         }
//       }

//       console.log("Submitting punch-in data:", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchIn: currentTime,
//         imageTimestamp: imageTimestamp || currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//         imageSize: selfieBlob.size,
//         imageType: selfieBlob.type,
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch in API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchInTimeFormatted = new Date(currentTime).toLocaleString();

//         // Update state to show punched in
//         setIsPunchedIn(true);
//         setPunchInTime(punchInTimeFormatted);

//         // Save punch in state to localStorage
//         localStorage.setItem(
//           "punchInState",
//           JSON.stringify({
//             isPunchedIn: true,
//             punchInTime: punchInTimeFormatted,
//             punchInTimestamp: currentTime,
//           })
//         );

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName} on ${punchInTimeFormatted}`,
//         });

//         // Reset selfie for next action (punch out)
//         setSelfieImage(null);
//         setImageTimestamp(null);

//         console.log("Punch in recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch in:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch in. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Function to handle punch out
//   const handlePunchOut = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL (JPEG format)
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Verify blob creation
//       console.log("Selfie blob created:", {
//         size: selfieBlob.size,
//         type: selfieBlob.type,
//         isValidBlob: selfieBlob instanceof Blob,
//       });

//       // Create current timestamp for punch out
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch out
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchOut", currentTime); // Current punch out time
//       formData.append("imageTimestamp", imageTimestamp || currentTime);
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("selfieImage", selfieBlob, "punchout_selfie.jpeg");
//       formData.append("locationName", currentLocationName);

//       // Log FormData contents for debugging
//       console.log("FormData contents:");
//       for (let [key, value] of formData.entries()) {
//         if (key === "selfieImage") {
//           console.log(`${key}:`, {
//             name: value.name,
//             size: value.size,
//             type: value.type,
//             lastModified: value.lastModified,
//           });
//         } else {
//           console.log(`${key}: ${value}`);
//         }
//       }

//       console.log("Submitting punch-out data:", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchOut: currentTime,
//         imageTimestamp: imageTimestamp || currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//         imageSize: selfieBlob.size,
//         imageType: selfieBlob.type,
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch out API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchOutTimeFormatted = new Date(currentTime).toLocaleString();

//         // Update state to show not punched in
//         setIsPunchedIn(false);
//         setPunchInTime(null);

//         // Clear punch in state from localStorage
//         localStorage.removeItem("punchInState");

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED OUT SUCCESSFULLY at ${currentLocationName} on ${punchOutTimeFormatted}`,
//         });

//         // Reset selfie for next action (next punch in)
//         setSelfieImage(null);
//         setImageTimestamp(null);

//         console.log("Punch out recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch out. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch out:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch out. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Status Display */}
//               {isPunchedIn && punchInTime && (
//                 <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
//                   <p className="text-sm text-green-800">
//                     <strong>✅ Punched In:</strong> {punchInTime}
//                   </p>
//                   <p className="text-xs text-green-600 mt-1">
//                     Ready to punch out when your work is done.
//                   </p>
//                 </div>
//               )}

//               {/* Location Info Display */}
//               <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600">
//                   <strong>Current Location:</strong>{" "}
//                   {isGettingLocation ? "Detecting..." : locationName}
//                 </p>
//                 {location.lat && location.lon && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Coordinates: {location.lat.toFixed(6)},{" "}
//                     {location.lon.toFixed(6)}
//                   </p>
//                 )}
//                 {imageTimestamp && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     <strong>Image captured at:</strong>{" "}
//                     {new Date(imageTimestamp).toLocaleString()}
//                   </p>
//                 )}
//               </div>

//               {/* Selfie UI */}
//               <div className="flex flex-col items-center justify-center space-y-6">
//                 {selfieImage ? (
//                   <div className="relative">
//                     {/* Circular Dotted Border */}
//                     <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                       <img
//                         src={selfieImage}
//                         alt="Captured Selfie"
//                         className="w-60 h-60 rounded-full object-cover"
//                       />
//                     </div>
//                     {/* Reset Button */}
//                     <button
//                       onClick={resetSelfie}
//                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                     {!cameraActive ? (
//                       <button
//                         onClick={() => setCameraActive(true)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                       >
//                         Open Camera
//                       </button>
//                     ) : (
//                       <>
//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           className="w-44 h-44 rounded-full object-cover"
//                         />
//                         <button
//                           onClick={captureSelfie}
//                           className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                         >
//                           <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}

//                 <canvas ref={canvasRef} style={{ display: "none" }} />

//                 {/* Title and Description */}
//                 <div className="text-center">
//                   <h2 className="text-lg font-semibold text-gray-800">
//                     {isPunchedIn ? "Ready to Punch Out" : "Verify to Punch In"}
//                   </h2>
//                   <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                     {isPunchedIn
//                       ? "Capture your selfie to record your punch out time."
//                       : "Capture your selfie at the current location to record your attendance."}
//                   </p>
//                 </div>

//                 {/* Action Buttons - Only show when selfie is captured */}
//                 {selfieImage && (
//                   <button
//                     onClick={isPunchedIn ? handlePunchOut : handlePunchIn}
//                     disabled={
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                     }
//                     className={`w-full py-3 rounded-md text-white font-medium ${
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                         ? "bg-gray-400 cursor-not-allowed"
//                         : isPunchedIn
//                         ? "bg-red-500 hover:bg-red-600"
//                         : "bg-green-500 hover:bg-green-600"
//                     }`}
//                   >
//                     {isSubmitting
//                       ? "Processing..."
//                       : isGettingLocation
//                       ? "Getting Location..."
//                       : isPunchedIn
//                       ? "Punch Out"
//                       : "Punch In"}
//                   </button>
//                 )}

//                 {/* API Response */}
//                 {apiResponse && (
//                   <div
//                     className={`mt-4 p-3 rounded-md text-center ${
//                       apiResponse.success
//                         ? "bg-green-100 text-green-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {apiResponse.message}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CameraPunchedIn;

// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const CameraPunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [imageTimestamp, setImageTimestamp] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Unknown Location");
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [isPunchedIn, setIsPunchedIn] = useState(false);
//   const [punchInTime, setPunchInTime] = useState(null);
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   // Function to get location name from coordinates using reverse geocoding
//   const getLocationName = async (lat, lon) => {
//     try {
//       setIsGettingLocation(true);

//       // Using OpenStreetMap Nominatim API for reverse geocoding (free)
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
//         {
//           headers: {
//             "User-Agent": "AttendanceApp/1.0",
//           },
//         }
//       );

//       if (response.data && response.data.address) {
//         const address = response.data.address;
//         // Try to get city, town, or village name
//         const cityName =
//           address.city ||
//           address.town ||
//           address.village ||
//           address.county ||
//           address.state_district ||
//           address.state ||
//           "Unknown Location";

//         setLocationName(cityName);
//         return cityName;
//       } else {
//         setLocationName("Unknown Location");
//         return "Unknown Location";
//       }
//     } catch (error) {
//       console.error("Error getting location name:", error);
//       setLocationName("Unknown Location");
//       return "Unknown Location";
//     } finally {
//       setIsGettingLocation(false);
//     }
//   };

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 10000 : 15000; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }

//     // Check if user is already punched in
//     const savedPunchInState = localStorage.getItem("punchInState");
//     if (savedPunchInState) {
//       const punchState = JSON.parse(savedPunchInState);
//       setIsPunchedIn(punchState.isPunchedIn);
//       setPunchInTime(punchState.punchInTime);
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           console.log("Location permission granted");
//           const currentLocation = {
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           };
//           setLocation(currentLocation);

//           // Get location name automatically
//           await getLocationName(currentLocation.lat, currentLocation.lon);
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const currentLocation = {
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             };
//             setLocation(currentLocation);

//             // Get location name automatically
//             await getLocationName(currentLocation.lat, currentLocation.lon);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

//       // Convert to JPEG format with quality (0.8 = 80% quality)
//       const imageData = canvas.toDataURL("image/jpeg", 0.8);

//       // Capture the exact timestamp when image is taken
//       const captureTime = new Date().toISOString();

//       setSelfieImage(imageData);
//       setImageTimestamp(captureTime);
//       console.log("Selfie captured at:", captureTime);

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//       setCameraActive(false);
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setImageTimestamp(null);
//     setCameraActive(true);
//     // Clear any previous API response when resetting
//     setApiResponse(null);
//   };

//   // Helper: convert base64 string to Blob
//   function base64ToBlob(base64, mimeType) {
//     const byteChars = atob(base64);
//     const byteNumbers = new Array(byteChars.length);
//     for (let i = 0; i < byteChars.length; i++) {
//       byteNumbers[i] = byteChars.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
//   }

//   // Function to handle punch in
//   const handlePunchIn = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL (JPEG format)
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Create current timestamp for punch in
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch in
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchIn", currentTime); // Current punch in time
//       formData.append("imageTimestamp", imageTimestamp || currentTime);
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("selfieImage", selfieBlob, "selfie.jpeg");
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-in data:", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchIn: currentTime,
//         imageTimestamp: imageTimestamp || currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//         imageSize: selfieBlob.size,
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch in API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchInTimeFormatted = new Date(currentTime).toLocaleString();
//         setIsPunchedIn(true);
//         setPunchInTime(punchInTimeFormatted);

//         // Save punch in state to localStorage
//         localStorage.setItem(
//           "punchInState",
//           JSON.stringify({
//             isPunchedIn: true,
//             punchInTime: punchInTimeFormatted,
//             punchInTimestamp: currentTime,
//           })
//         );

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName} on ${punchInTimeFormatted}`,
//         });

//         // Reset selfie for next action (punch out)
//         setSelfieImage(null);
//         setImageTimestamp(null);

//         console.log("Punch in recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch in:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch in. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Function to handle punch out
//   const handlePunchOut = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL (JPEG format)
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Create current timestamp for punch out
//       const currentTime = new Date().toISOString();

//       // Create FormData for punch out - ONLY SEND PUNCH OUT DATA
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("punchOut", currentTime); // Current punch out time ONLY
//       formData.append("imageTimestamp", imageTimestamp || currentTime);
//       formData.append("latitude", location.lat.toString());
//       formData.append("longitude", location.lon.toString());
//       formData.append("selfieImage", selfieBlob, "selfie.jpeg");
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-out data:", {
//         userID: userProfile.employeeId || "EMP0001",
//         userName: userProfile.name || "Employee",
//         email: userProfile.email || "employee@company.com",
//         locationName: currentLocationName,
//         punchOut: currentTime, // Only punch out time
//         imageTimestamp: imageTimestamp || currentTime,
//         coordinates: { lat: location.lat, lon: location.lon },
//         imageSize: selfieBlob.size,
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       console.log("Punch out API response:", response.data);

//       if (response.status === 200 && response.data.success) {
//         const punchOutTimeFormatted = new Date(currentTime).toLocaleString();
//         setIsPunchedIn(false);
//         setPunchInTime(null);

//         // Clear punch in state from localStorage
//         localStorage.removeItem("punchInState");

//         setApiResponse({
//           success: true,
//           message: `✅ PUNCHED OUT SUCCESSFULLY at ${currentLocationName} on ${punchOutTimeFormatted}`,
//         });

//         // Reset selfie for next action
//         setSelfieImage(null);
//         setImageTimestamp(null);

//         console.log("Punch out recorded successfully:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch out. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording punch out:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record punch out. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Status Display */}
//               {isPunchedIn && punchInTime && (
//                 <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
//                   <p className="text-sm text-green-800">
//                     <strong>✅ Punched In:</strong> {punchInTime}
//                   </p>
//                   <p className="text-xs text-green-600 mt-1">
//                     Ready to punch out when your work is done.
//                   </p>
//                 </div>
//               )}

//               {/* Location Info Display */}
//               <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600">
//                   <strong>Current Location:</strong>{" "}
//                   {isGettingLocation ? "Detecting..." : locationName}
//                 </p>
//                 {location.lat && location.lon && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Coordinates: {location.lat.toFixed(6)},{" "}
//                     {location.lon.toFixed(6)}
//                   </p>
//                 )}
//                 {imageTimestamp && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     <strong>Image captured at:</strong>{" "}
//                     {new Date(imageTimestamp).toLocaleString()}
//                   </p>
//                 )}
//               </div>

//               {/* Selfie UI */}
//               <div className="flex flex-col items-center justify-center space-y-6">
//                 {selfieImage ? (
//                   <div className="relative">
//                     {/* Circular Dotted Border */}
//                     <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                       <img
//                         src={selfieImage}
//                         alt="Captured Selfie"
//                         className="w-60 h-60 rounded-full object-cover"
//                       />
//                     </div>
//                     {/* Reset Button */}
//                     <button
//                       onClick={resetSelfie}
//                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                     {!cameraActive ? (
//                       <button
//                         onClick={() => setCameraActive(true)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                       >
//                         Open Camera
//                       </button>
//                     ) : (
//                       <>
//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           className="w-44 h-44 rounded-full object-cover"
//                         />
//                         <button
//                           onClick={captureSelfie}
//                           className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                         >
//                           <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}

//                 <canvas ref={canvasRef} style={{ display: "none" }} />

//                 {/* Title and Description */}
//                 <div className="text-center">
//                   <h2 className="text-lg font-semibold text-gray-800">
//                     {isPunchedIn ? "Ready to Punch Out" : "Verify to Punch In"}
//                   </h2>
//                   <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                     {isPunchedIn
//                       ? "Capture your selfie to record your punch out time."
//                       : "Capture your selfie at the current location to record your attendance."}
//                   </p>
//                 </div>

//                 {/* Action Buttons - Only show when selfie is captured */}
//                 {selfieImage && (
//                   <button
//                     onClick={isPunchedIn ? handlePunchOut : handlePunchIn}
//                     disabled={
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                     }
//                     className={`w-full py-3 rounded-md text-white font-medium ${
//                       isSubmitting ||
//                       !location.lat ||
//                       !location.lon ||
//                       isGettingLocation
//                         ? "bg-gray-400 cursor-not-allowed"
//                         : isPunchedIn
//                         ? "bg-red-500 hover:bg-red-600"
//                         : "bg-green-500 hover:bg-green-600"
//                     }`}
//                   >
//                     {isSubmitting
//                       ? "Processing..."
//                       : isGettingLocation
//                       ? "Getting Location..."
//                       : isPunchedIn
//                       ? "Punch Out"
//                       : "Punch In"}
//                   </button>
//                 )}

//                 {/* API Response */}
//                 {apiResponse && (
//                   <div
//                     className={`mt-4 p-3 rounded-md text-center ${
//                       apiResponse.success
//                         ? "bg-green-100 text-green-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {apiResponse.message}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CameraPunchedIn;

// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const CameraPunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [imageTimestamp, setImageTimestamp] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Unknown Location");
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   // Function to get location name from coordinates using reverse geocoding
//   const getLocationName = async (lat, lon) => {
//     try {
//       setIsGettingLocation(true);

//       // Using OpenStreetMap Nominatim API for reverse geocoding (free)
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
//         {
//           headers: {
//             "User-Agent": "AttendanceApp/1.0",
//           },
//         }
//       );

//       if (response.data && response.data.address) {
//         const address = response.data.address;
//         const cityName =
//           address.city ||
//           address.town ||
//           address.village ||
//           address.county ||
//           address.state_district ||
//           address.state ||
//           "Unknown Location";

//         setLocationName(cityName);
//         return cityName;
//       } else {
//         setLocationName("Unknown Location");
//         return "Unknown Location";
//       }
//     } catch (error) {
//       console.error("Error getting location name:", error);
//       setLocationName("Unknown Location");
//       return "Unknown Location";
//     } finally {
//       setIsGettingLocation(false);
//     }
//   };

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 1000 : 1500; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           console.log("Location permission granted");
//           const currentLocation = {
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           };
//           setLocation(currentLocation);

//           // Get location name automatically
//           await getLocationName(currentLocation.lat, currentLocation.lon);
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (position) => {
//             const currentLocation = {
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             };
//             setLocation(currentLocation);

//             // Get location name automatically
//             await getLocationName(currentLocation.lat, currentLocation.lon);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//       const imageData = canvas.toDataURL("image/jpeg");

//       // Capture the exact timestamp when image is taken
//       const captureTime = new Date().toISOString();

//       setSelfieImage(imageData);
//       setImageTimestamp(captureTime);
//       console.log("Selfie captured at:", captureTime);

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setImageTimestamp(null);
//     setCameraActive(true);
//   };

//   // Helper: convert base64 string to Blob
//   function base64ToBlob(base64, mimeType) {
//     const byteChars = atob(base64);
//     const byteNumbers = new Array(byteChars.length);
//     for (let i = 0; i < byteChars.length; i++) {
//       byteNumbers[i] = byteChars.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
//   }

//   // Function to send punch-in data to backend
//   const sendPunchInData = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Get fresh location name before submitting
//       const currentLocationName = await getLocationName(
//         location.lat,
//         location.lon
//       );

//       // Extract base64 data and MIME type from data URL
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPG/JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Create FormData and append fields & file blob
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("timeStamp", new Date().toISOString()); // Current submission time
//       formData.append(
//         "imageTimestamp",
//         imageTimestamp || new Date().toISOString()
//       ); // When image was captured
//       formData.append("latitude", location.lat);
//       formData.append("longitude", location.lon);
//       formData.append("selfieImage", selfieBlob, "selfie.png");
//       formData.append("locationName", currentLocationName);

//       console.log("Submitting punch-in data:", {
//         locationName: currentLocationName,
//         imageTimestamp: imageTimestamp,
//         submissionTime: new Date().toISOString(),
//         coordinates: { lat: location.lat, lon: location.lon },
//       });

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.status === 200 && response.data.success) {
//         setApiResponse({
//           success: true,
//           message:
//             response.data.message ||
//             `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName}`,
//         });
//         console.log("Attendance recorded:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording attendance:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record attendance. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Location Info Display */}
//               <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//                 <p className="text-sm text-gray-600">
//                   <strong>Current Location:</strong>{" "}
//                   {isGettingLocation ? "Detecting..." : locationName}
//                 </p>
//                 {location.lat && location.lon && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Coordinates: {location.lat.toFixed(6)},{" "}
//                     {location.lon.toFixed(6)}
//                   </p>
//                 )}
//                 {imageTimestamp && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     <strong>Image captured at:</strong>{" "}
//                     {new Date(imageTimestamp).toLocaleString()}
//                   </p>
//                 )}
//               </div>

//               {/* Selfie UI */}
//               <div className="flex flex-col items-center justify-center space-y-6">
//                 {selfieImage ? (
//                   <div className="relative">
//                     {/* Circular Dotted Border */}
//                     <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                       <img
//                         src={selfieImage}
//                         alt="Captured Selfie"
//                         className="w-60 h-60 rounded-full object-cover"
//                       />
//                     </div>
//                     {/* Reset Button */}
//                     <button
//                       onClick={resetSelfie}
//                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                     {!cameraActive ? (
//                       <button
//                         onClick={() => setCameraActive(true)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                       >
//                         Open Camera
//                       </button>
//                     ) : (
//                       <>
//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           className="w-44 h-44 rounded-full object-cover"
//                         />
//                         <button
//                           onClick={captureSelfie}
//                           className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                         >
//                           <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}

//                 <canvas ref={canvasRef} style={{ display: "none" }} />

//                 {/* Title and Description */}
//                 <div className="text-center">
//                   <h2 className="text-lg font-semibold text-gray-800">
//                     Verify to punch in
//                   </h2>
//                   <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                     Capture your selfie at the current location to record your
//                     attendance.
//                   </p>
//                 </div>

//                 {/* Submit Button */}
//                 <button
//                   onClick={sendPunchInData}
//                   disabled={
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon ||
//                     isGettingLocation
//                   }
//                   className={`mt-4 w-20 h-20 rounded-full font-medium flex items-center justify-center ${
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon ||
//                     isGettingLocation
//                       ? "bg-gray-300 text-white cursor-not-allowed"
//                       : "bg-purple-500 hover:bg-purple-600 text-white"
//                   }`}
//                 >
//                   {isSubmitting ? "..." : "✔"}
//                 </button>

//                 {/* API Response */}
//                 {apiResponse && (
//                   <div
//                     className={`mt-4 p-3 rounded-md text-center ${
//                       apiResponse.success
//                         ? "bg-green-100 text-green-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {apiResponse.message}
//                   </div>
//                 )}
//               </div>

//               <button
//                 onClick={sendPunchInData}
//                 disabled={
//                   isSubmitting ||
//                   !selfieImage ||
//                   !location.lat ||
//                   !location.lon ||
//                   isGettingLocation
//                 }
//                 className={`w-full py-3 rounded-md text-white font-medium ${
//                   isSubmitting ||
//                   !selfieImage ||
//                   !location.lat ||
//                   !location.lon ||
//                   isGettingLocation
//                     ? "bg-gray-400 cursor-not-allowed"
//                     : "bg-green-400 hover:bg-green-700"
//                 }`}
//               >
//                 {isSubmitting
//                   ? "Processing..."
//                   : isGettingLocation
//                   ? "Getting Location..."
//                   : "Punch In"}
//               </button>

//               {apiResponse && (
//                 <div
//                   className={`mt-4 p-3 rounded-md text-center ${
//                     apiResponse.success
//                       ? "bg-green-100 text-green-700"
//                       : "bg-red-100 text-red-700"
//                   }`}
//                 >
//                   {apiResponse.message}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CameraPunchedIn;

// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { X } from "lucide-react";
// import axios from "axios";
// import { IoMdArrowBack } from "react-icons/io";

// const CameraPunchedIn = () => {
//   const navigate = useNavigate();
//   const [targetLocations, setTargetLocations] = useState([null]);
//   const [selfieImage, setSelfieImage] = useState(null);
//   const [location, setLocation] = useState({ lat: null, lon: null });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [apiResponse, setApiResponse] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [locationName, setLocationName] = useState("Office");
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     email: "",
//     employeeId: "",
//   });

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);

//   const isAppleDevice = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

//   const areLocationsMatching = (userLoc, targetLocs) => {
//     if (!userLoc || !targetLocs?.length) return false;

//     const userLat = parseFloat(userLoc.lat);
//     const userLon = parseFloat(userLoc.lon);
//     const maxAllowedDistance = isAppleDevice() ? 1000 : 1500; // meters

//     const toRadians = (degree) => (degree * Math.PI) / 180;
//     const earthRadius = 6371; // in km

//     return targetLocs.some((target) => {
//       const targetLat = parseFloat(target.lat);
//       const targetLon = parseFloat(target.lon);

//       const dLat = toRadians(targetLat - userLat);
//       const dLon = toRadians(targetLon - userLon);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRadians(userLat)) *
//           Math.cos(toRadians(targetLat)) *
//           Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distanceInMeters = earthRadius * c * 1000;

//       return distanceInMeters <= maxAllowedDistance;
//     });
//   };

//   // Check authentication and redirect if not logged in
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     // Load user profile if available in localStorage
//     const savedAuthState = localStorage.getItem("authState");
//     if (savedAuthState) {
//       const parsedAuthState = JSON.parse(savedAuthState);
//       setUserProfile(parsedAuthState.userProfile);
//     }
//   }, [navigate]);

//   // Fetch target locations
//   useEffect(() => {
//     const fetchTargetLocations = async () => {
//       try {
//         const response = await axios.get("http://192.168.1.26:8000/location");
//         console.log("location Data:", response.data);

//         // Always-available fallback or additional known locations
//         const fallbackLocations = [
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237747, lon: 81.67866 },
//         ];

//         let formatted = [];

//         if (response.data?.locations?.length) {
//           const fetched = response.data.locations.map((loc) => ({
//             lat: parseFloat(loc.latitude),
//             lon: parseFloat(loc.longitude),
//           }));

//           // Combine fetched + fallback locations
//           formatted = [...fetched, ...fallbackLocations];
//           console.log("Combined target locations (API + fallback):", formatted);
//         } else {
//           // If API returns no locations, use fallback
//           formatted = fallbackLocations;
//           console.warn("No API locations found. Using fallback locations.");
//         }

//         setTargetLocations(formatted);
//       } catch (error) {
//         console.error("Error fetching target locations:", error);

//         // On fetch error, still fallback to default locations
//         setTargetLocations([
//           { lat: 21.246699, lon: 81.662397 },
//           { lat: 21.237747, lon: 81.66866 },
//           { lat: 21.237743, lon: 81.67866 },
//         ]);
//       }
//     };

//     fetchTargetLocations();
//   }, []);

//   // Request permissions on component mount
//   useEffect(() => {
//     // Request front camera (for selfie)
//     navigator.mediaDevices
//       .getUserMedia({ video: { facingMode: "user" } })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("Camera permission granted");
//       })
//       .catch((err) => {
//         console.error("Camera permission denied:", err);
//         alert("Camera permission is required for selfie capture.");
//       });

//     // Request geolocation
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           console.log("Location permission granted");
//           setLocation({
//             lat: position.coords.latitude,
//             lon: position.coords.longitude,
//           });
//         },
//         (error) => {
//           console.error("Location permission denied:", error);
//           alert(
//             "Location permission is required to verify your punch-in location."
//           );
//         },
//         { enableHighAccuracy: true }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//   }, []);

//   // useEffect to activate front-facing camera stream when capturing selfie
//   useEffect(() => {
//     if (cameraActive && !selfieImage) {
//       navigator.mediaDevices
//         .getUserMedia({ video: { facingMode: "user" } })
//         .then((stream) => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//             streamRef.current = stream;
//           }
//         })
//         .catch((error) => {
//           console.error("Error accessing camera:", error);
//           alert("Failed to access the camera. Please check permissions.");
//         });
//     }

//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [cameraActive, selfieImage]);

//   // Fallback location check
//   useEffect(() => {
//     if (!location.lat && !location.lon) {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             setLocation({
//               lat: position.coords.latitude,
//               lon: position.coords.longitude,
//             });
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           }
//         );
//       } else {
//         alert("Geolocation is not supported by this browser.");
//       }
//     }
//   }, [location]);

//   // Function to capture selfie from video stream
//   const captureSelfie = () => {
//     if (videoRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const context = canvas.getContext("2d");

//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;

//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//       const imageData = canvas.toDataURL("image/jpeg");
//       setSelfieImage(imageData);
//       console.log("Selfie captured");

//       // Stop camera after capturing
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     }
//   };

//   // Function to reset selfie
//   const resetSelfie = () => {
//     setSelfieImage(null);
//     setCameraActive(true);
//   };

//   // Helper: convert base64 string to Blob
//   function base64ToBlob(base64, mimeType) {
//     const byteChars = atob(base64);
//     const byteNumbers = new Array(byteChars.length);
//     for (let i = 0; i < byteChars.length; i++) {
//       byteNumbers[i] = byteChars.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     return new Blob([byteArray], { type: mimeType });
//   }

//   // Function to send punch-in data to backend
//   const sendPunchInData = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Token not found. Please log in again.");
//       navigate("/");
//       return;
//     }

//     if (!location || !location.lat || !location.lon) {
//       alert("Your location could not be determined. Please enable GPS.");
//       return;
//     }

//     if (!selfieImage) {
//       alert("Please capture a selfie first.");
//       return;
//     }

//     if (!areLocationsMatching(location, targetLocations)) {
//       alert("You are not at the correct location.");
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Extract base64 data and MIME type from data URL
//       const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
//       if (!matches) {
//         alert("Selfie image must be in JPG/JPEG format");
//         setIsSubmitting(false);
//         return;
//       }

//       const mimeType = matches[1];
//       const base64Data = matches[2];

//       const selfieBlob = base64ToBlob(base64Data, mimeType);

//       // Create FormData and append fields & file blob
//       const formData = new FormData();
//       formData.append("userID", userProfile.employeeId || "EMP0001");
//       formData.append("userName", userProfile.name || "Employee");
//       formData.append("email", userProfile.email || "employee@company.com");
//       formData.append("timeStamp", new Date().toISOString());
//       formData.append("latitude", location.lat);
//       formData.append("longitude", location.lon);
//       formData.append("selfieImage", selfieBlob, "selfie.png");
//       formData.append("locationName", locationName);

//       const response = await axios.post(
//         "http://192.168.1.26:8000/data",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (response.status === 200 && response.data.success) {
//         setApiResponse({
//           success: true,
//           message: response.data.message || "✅ PUNCHED IN SUCCESSFULLY",
//         });
//         console.log("Attendance recorded:", response.data);
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             response.data.message || "Failed to punch in. Please try again.",
//         });
//       }
//     } catch (error) {
//       console.error("Error recording attendance:", error);
//       if (error.response && error.response.status === 401) {
//         setApiResponse({
//           success: false,
//           message: "Unauthorized: Invalid token. Please log in again.",
//         });
//       } else {
//         setApiResponse({
//           success: false,
//           message:
//             error?.response?.data?.message ||
//             error?.message ||
//             "Failed to record attendance. Please try again.",
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md">
//         <button
//           onClick={() => navigate("/home")}
//           className="flex items-center space-x-2 text-gray-600 font-medium"
//         >
//           <IoMdArrowBack size={20} />
//           <span>Home</span>
//         </button>
//       </div>

//       <div className="min-h-screen bg-gray-50">
//         <div className="container mx-auto">
//           <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="p-4 mt-4">
//               {/* Selfie UI */}
//               <div className="flex flex-col items-center justify-center space-y-6">
//                 {selfieImage ? (
//                   <div className="relative">
//                     {/* Circular Dotted Border */}
//                     <div className="relative w-48 h-48 rounded-full border-dotted border-purple-300 flex items-center justify-center">
//                       <img
//                         src={selfieImage}
//                         alt="Captured Selfie"
//                         className="w-60 h-60 rounded-full object-cover"
//                       />
//                     </div>
//                     {/* Reset Button */}
//                     <button
//                       onClick={resetSelfie}
//                       className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center relative">
//                     {!cameraActive ? (
//                       <button
//                         onClick={() => setCameraActive(true)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
//                       >
//                         Open Camera
//                       </button>
//                     ) : (
//                       <>
//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           className="w-44 h-44 rounded-full object-cover"
//                         />
//                         <button
//                           onClick={captureSelfie}
//                           className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white p-3 rounded-full shadow-md"
//                         >
//                           <div className="w-12 h-12 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 )}

//                 <canvas ref={canvasRef} style={{ display: "none" }} />

//                 {/* Title and Description */}
//                 <div className="text-center">
//                   <h2 className="text-lg font-semibold text-gray-800">
//                     Verify to punch in
//                   </h2>
//                   <p className="text-gray-500 mt-1 text-sm max-w-xs">
//                     These additions will make each card much more informative
//                     without cluttering the design.
//                   </p>
//                 </div>

//                 {/* Submit Button */}
//                 <button
//                   onClick={sendPunchInData}
//                   disabled={
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon
//                   }
//                   className={`mt-4 w-20 h-20 rounded-full font-medium flex items-center justify-center ${
//                     isSubmitting ||
//                     !selfieImage ||
//                     !location.lat ||
//                     !location.lon
//                       ? "bg-gray-300 text-white cursor-not-allowed"
//                       : "bg-purple-500 hover:bg-purple-600 text-white"
//                   }`}
//                 >
//                   {isSubmitting ? "..." : "✔"}
//                 </button>

//                 {/* API Response */}
//                 {apiResponse && (
//                   <div
//                     className={`mt-4 p-3 rounded-md text-center ${
//                       apiResponse.success
//                         ? "bg-green-100 text-green-700"
//                         : "bg-red-100 text-red-700"
//                     }`}
//                   >
//                     {apiResponse.message}
//                   </div>
//                 )}
//               </div>

//               <button
//                 onClick={sendPunchInData}
//                 disabled={
//                   isSubmitting || !selfieImage || !location.lat || !location.lon
//                 }
//                 className={`w-full py-3 rounded-md text-white font-medium ${
//                   isSubmitting || !selfieImage || !location.lat || !location.lon
//                     ? "bg-gray-400 cursor-not-allowed"
//                     : "bg-green-400 hover:bg-green-700"
//                 }`}
//               >
//                 {isSubmitting ? "Processing..." : "Punch In"}
//               </button>

//               {apiResponse && (
//                 <div
//                   className={`mt-4 p-3 rounded-md text-center ${
//                     apiResponse.success
//                       ? "bg-green-100 text-green-700"
//                       : "bg-red-100 text-red-700"
//                   }`}
//                 >
//                   {apiResponse.message}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default CameraPunchedIn;
