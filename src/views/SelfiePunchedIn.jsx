import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import axios from "axios";
import { IoMdArrowBack } from "react-icons/io";

const SelfiePunchedIn = () => {
  const navigate = useNavigate();
  const [selfieImage, setSelfieImage] = useState(null);
  const [imageTimestamp, setImageTimestamp] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [locationName, setLocationName] = useState("Unknown Location");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasPunchedIn, setHasPunchedIn] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    employeeId: "",
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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

    // Check if user has already punched in
    const punchInId = localStorage.getItem("punchInId");
    if (punchInId) {
      setHasPunchedIn(true);
    }
  }, [navigate]);

  // Request permissions on component mount
  useEffect(() => {
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

  // Function to handle punch in
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

    console.log("📍 Current location:", location);

    setIsSubmitting(true);

    try {
      // Get fresh location name before submitting
      const currentLocationName = await getLocationName(
        location.lat,
        location.lon
      );

      // Create punch in timestamp when button is clicked
      const punchInTime = new Date().toISOString();

      // Extract base64 data and MIME type from data URL (JPEG format)
      const matches = selfieImage.match(/^data:(image\/jpeg);base64,(.+)$/);
      if (!matches) {
        alert("Selfie image must be in JPEG format");
        setIsSubmitting(false);
        return;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to binary blob
      const selfieBlob = base64ToBlob(base64Data, mimeType);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("userID", userProfile.employeeId || "EMP1234");
      formData.append("userName", userProfile.name || "Employee");
      formData.append("email", userProfile.email || "employee@company.com");
      formData.append("locationName", currentLocationName);
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lon.toString());
      formData.append("punchIn", punchInTime);
      formData.append("selfieImage", selfieBlob, "selfie.jpeg");

      console.log("Submitting punch-in data:", {
        userID: userProfile.employeeId || "EMP1234",
        userName: userProfile.name || "Employee",
        email: userProfile.email || "employee@company.com",
        locationName: currentLocationName,
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        punchIn: punchInTime,
        imageSize: selfieBlob.size,
        imageType: mimeType,
      });

      const response = await axios.post(
        "https://attendancebackends.onrender.com/data",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Punch in API response:", response.data);

      if (response.status === 200 && response.data.message) {
        const punchInTimeFormatted = new Date(punchInTime).toLocaleString();

        // Save punch in ID to localStorage
        localStorage.setItem("punchInId", response.data.punchedInData._id);

        // Update state
        setHasPunchedIn(true);

        setApiResponse({
          success: true,
          message: `✅ PUNCHED IN SUCCESSFULLY at ${currentLocationName} on ${punchInTimeFormatted}`,
          data: response.data.punchedInData,
        });

        // Reset selfie after successful punch in
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

  const handlePunchOut = async () => {
    const token = localStorage.getItem("token");
    const punchInId = localStorage.getItem("punchInId");

    if (!punchInId) {
      alert("Punch in ID not found. You need to punch in first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const punchOutTime = new Date().toISOString();

      console.log("Submitting punch-out data:", {
        punchInId,
        punchOut: punchOutTime,
      });

      // Send only punch out time as JSON
      const response = await axios.put(
        `https://attendancebackends.onrender.com/data/${punchInId}`,
        { punchOut: punchOutTime },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Punch out API response:", response.data);

      if (response.status === 200) {
        const punchOutTimeFormatted = new Date(punchOutTime).toLocaleString();

        setApiResponse({
          success: true,
          message: `✅ PUNCHED OUT SUCCESSFULLY on ${punchOutTimeFormatted}`,
          data: response.data.updatedData || response.data,
        });

        // Clear localStorage and update state
        localStorage.removeItem("punchInId");
        setHasPunchedIn(false);

        // Reset selfie after successful punch out
        setSelfieImage(null);
        setImageTimestamp(null);

        console.log("Punch out recorded successfully:", response.data);
      } else {
        setApiResponse({
          success: false,
          message: response.data.message || "❌ Punch Out Failed. Try again.",
        });
      }
    } catch (error) {
      console.error("Error during punch out:", error);
      if (error.response) {
        if (error.response.status === 404) {
          setApiResponse({
            success: false,
            message: "Punch in record not found. Please punch in first.",
          });
        } else if (error.response.status === 405) {
          setApiResponse({
            success: false,
            message: "Method not allowed. Please contact support.",
          });
        } else {
          setApiResponse({
            success: false,
            message:
              error?.response?.data?.message ||
              "Error punching out. Please try again.",
          });
        }
      } else {
        setApiResponse({
          success: false,
          message: "Network error. Please check your connection and try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    // <>
    //   <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md rounded-md">
    //     <button
    //       onClick={() => navigate("/home")}
    //       className="flex items-center space-x-2 text-gray-600 font-medium"
    //     >
    //       <IoMdArrowBack size={20} />
    //       <span>Home</span>
    //     </button>
    //   </div>

    //   <div className="min-h-screen">
    //     <div className="container">
    //       <div className="max-w-md overflow-hidden">
    //         <div className="p-4 mt-4">
    //           {/* Selfie UI */}
    //           <div className="flex flex-col items-center justify-center space-y-6">
    //             {selfieImage ? (
    //               <div className="relative">
    //                 <div className="relative flex items-center justify-center">
    //                   <img
    //                     src={selfieImage}
    //                     alt="Captured Selfie"
    //                     className="w-60 h-60 rounded-full object-cover"
    //                   />
    //                 </div>
    //                 {/* Reset Button */}
    //                 <button
    //                   onClick={resetSelfie}
    //                   className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
    //                 >
    //                   <X size={16} />
    //                 </button>
    //               </div>
    //             ) : (
    //               <div className="flex items-center justify-center relative min-h-screen">
    //                 {!cameraActive ? (
    //                   <button
    //                     onClick={() => setCameraActive(true)}
    //                     className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
    //                   >
    //                     Open Camera
    //                   </button>
    //                 ) : (
    //                   <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
    //                     <video
    //                       ref={videoRef}
    //                       autoPlay
    //                       playsInline
    //                       className="w-full h-full object-cover"
    //                     />
    //                     <button
    //                       onClick={captureSelfie}
    //                       className="absolute bottom-10 bg-white p-4 rounded-full shadow-md"
    //                     >
    //                       <div className="w-16 h-16 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
    //                     </button>
    //                   </div>
    //                 )}
    //               </div>
    //             )}

    //             <canvas ref={canvasRef} style={{ display: "none" }} />

    //             {/* Action Button - Show when selfie is captured */}
    //             {selfieImage && (
    //               <button
    //                 onClick={hasPunchedIn ? handlePunchOut : handlePunchIn}
    //                 disabled={
    //                   isSubmitting ||
    //                   !location.lat ||
    //                   !location.lon ||
    //                   isGettingLocation
    //                 }
    //                 className={`${
    //                   hasPunchedIn
    //                     ? "bg-red-600 hover:bg-red-700"
    //                     : "bg-green-600 hover:bg-green-700"
    //                 } text-white px-6 py-2 mt-4 rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed`}
    //               >
    //                 {isSubmitting
    //                   ? "Processing..."
    //                   : hasPunchedIn
    //                   ? "Punch Out"
    //                   : "Punch In"}
    //               </button>
    //             )}

    //             {/* API Response */}
    //             {apiResponse && (
    //               <div
    //                 className={`mt-4 p-3 rounded-md text-center ${
    //                   apiResponse.success
    //                     ? "bg-green-100 text-green-700"
    //                     : "bg-red-100 text-red-700"
    //                 }`}
    //               >
    //                 <p className="text-sm font-medium">{apiResponse.message}</p>
    //                 {apiResponse.data && (
    //                   <div className="mt-2 text-xs space-y-1">
    //                     <p>Employee ID: {apiResponse.data.userID}</p>
    //                     <p>Name: {apiResponse.data.userName}</p>
    //                     <p>Status: {apiResponse.data.status}</p>
    //                     <p>Date: {apiResponse.data.date}</p>
    //                     {apiResponse.data.punchIn && (
    //                       <p>
    //                         Punch In:{" "}
    //                         {new Date(
    //                           apiResponse.data.punchIn
    //                         ).toLocaleString()}
    //                       </p>
    //                     )}
    //                     {apiResponse.data.punchOut && (
    //                       <p>
    //                         Punch Out:{" "}
    //                         {new Date(
    //                           apiResponse.data.punchOut
    //                         ).toLocaleString()}
    //                       </p>
    //                     )}
    //                   </div>
    //                 )}
    //               </div>
    //             )}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </>

    // <>
    //   <div className="flex items-center h-12 w-full bg-white px-6 py-4 shadow-md rounded-md">
    //     <button
    //       onClick={() => navigate("/home")}
    //       className="flex items-center space-x-2 text-gray-600 font-medium"
    //     >
    //       <IoMdArrowBack size={20} />
    //       <span>Home</span>
    //     </button>
    //   </div>

    //   <div className="h-screen overflow-hidden">
    //     <div className="container h-full">
    //       <div className="max-w-md h-full overflow-hidden">
    //         <div className="p-4 h-full">
    //           {/* Selfie UI */}
    //           <div className="flex flex-col items-center justify-center h-full space-y-6">
    //             {selfieImage ? (
    //               <div className="relative">
    //                 <div className="relative flex items-center justify-center">
    //                   <img
    //                     src={selfieImage}
    //                     alt="Captured Selfie"
    //                     className="w-60 h-60 rounded-full object-cover"
    //                   />
    //                 </div>
    //                 {/* Reset Button */}
    //                 <button
    //                   onClick={resetSelfie}
    //                   className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
    //                 >
    //                   <X size={16} />
    //                 </button>
    //               </div>
    //             ) : (
    //               <div className="flex items-center justify-center">
    //                 {!cameraActive ? (
    //                   <button
    //                     onClick={() => setCameraActive(true)}
    //                     className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
    //                   >
    //                     Open Camera
    //                   </button>
    //                 ) : (
    //                   <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
    //                     <video
    //                       ref={videoRef}
    //                       autoPlay
    //                       playsInline
    //                       className="w-full h-full object-cover"
    //                     />
    //                     <button
    //                       onClick={captureSelfie}
    //                       className="absolute bottom-10 bg-white p-4 rounded-full shadow-md"
    //                     >
    //                       <div className="w-16 h-16 rounded-full bg-purple-400 shadow-inner border-4 border-purple-200"></div>
    //                     </button>
    //                   </div>
    //                 )}
    //               </div>
    //             )}

    //             <canvas ref={canvasRef} style={{ display: "none" }} />

    //             {/* Action Button - Show when selfie is captured */}
    //             {selfieImage && (
    //               <button
    //                 onClick={hasPunchedIn ? handlePunchOut : handlePunchIn}
    //                 disabled={
    //                   isSubmitting ||
    //                   !location.lat ||
    //                   !location.lon ||
    //                   isGettingLocation
    //                 }
    //                 className={`${
    //                   hasPunchedIn
    //                     ? "bg-red-600 hover:bg-red-700"
    //                     : "bg-green-600 hover:bg-green-700"
    //                 } text-white px-6 py-2 mt-4 rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed`}
    //               >
    //                 {isSubmitting
    //                   ? "Processing..."
    //                   : hasPunchedIn
    //                   ? "Punch Out"
    //                   : "Punch In"}
    //               </button>
    //             )}

    //             {/* API Response */}
    //             {apiResponse && (
    //               <div
    //                 className={`mt-4 p-3 rounded-md text-center ${
    //                   apiResponse.success
    //                     ? "bg-green-100 text-green-700"
    //                     : "bg-red-100 text-red-700"
    //                 }`}
    //               >
    //                 <p className="text-sm font-medium">{apiResponse.message}</p>
    //                 {apiResponse.data && (
    //                   <div className="mt-2 text-xs space-y-1">
    //                     <p>Employee ID: {apiResponse.data.userID}</p>
    //                     <p>Name: {apiResponse.data.userName}</p>
    //                     <p>Status: {apiResponse.data.status}</p>
    //                     <p>Date: {apiResponse.data.date}</p>
    //                     {apiResponse.data.punchIn && (
    //                       <p>
    //                         Punch In:{" "}
    //                         {new Date(
    //                           apiResponse.data.punchIn
    //                         ).toLocaleString()}
    //                       </p>
    //                     )}
    //                     {apiResponse.data.punchOut && (
    //                       <p>
    //                         Punch Out:{" "}
    //                         {new Date(
    //                           apiResponse.data.punchOut
    //                         ).toLocaleString()}
    //                       </p>
    //                     )}
    //                   </div>
    //                 )}
    //               </div>
    //             )}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </>
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed positioning for mobile */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 w-full bg-white px-4 py-3 shadow-md">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center space-x-2 text-gray-600 font-medium touch-manipulation"
        >
          <IoMdArrowBack size={20} />
          <span className="text-sm sm:text-base">Home</span>
        </button>
      </div>

      {/* Main Content - Account for fixed header */}
      <div className="pt-14 min-h-screen">
        <div className="w-full max-w-sm mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] space-y-6">
            {/* Selfie Display/Capture Section */}
            {selfieImage ? (
              <div className="relative mt-8">
                <div className="relative flex items-center justify-center">
                  <img
                    src={selfieImage}
                    alt="Captured Selfie"
                    className="w-48 h-48 sm:w-60 sm:h-60 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
                {/* Reset Button */}
                <button
                  onClick={resetSelfie}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md touch-manipulation"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center mt-12">
                {!cameraActive ? (
                  <button
                    onClick={() => setCameraActive(true)}
                    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-full font-medium shadow-md touch-manipulation transition-colors"
                  >
                    Open Camera
                  </button>
                ) : (
                  // Camera Overlay - Full screen on mobile
                  <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="flex-1 w-full object-cover"
                    />

                    {/* Camera Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={captureSelfie}
                          className="bg-white p-3 rounded-full shadow-lg touch-manipulation active:scale-95 transition-transform"
                        >
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500 shadow-inner border-4 border-blue-200"></div>
                        </button>
                      </div>

                      {/* Close Camera Button */}
                      <button
                        onClick={() => setCameraActive(false)}
                        className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full touch-manipulation"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Action Buttons */}
            {selfieImage && (
              <div className="w-full max-w-xs space-y-4">
                <button
                  onClick={hasPunchedIn ? handlePunchOut : handlePunchIn}
                  disabled={
                    isSubmitting ||
                    !location.lat ||
                    !location.lon ||
                    isGettingLocation
                  }
                  className={`w-full py-3 px-6 rounded-full font-medium text-white transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasPunchedIn
                      ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                      : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                  }`}
                >
                  {isSubmitting
                    ? "Processing..."
                    : hasPunchedIn
                    ? "Punch Out"
                    : "Punch In"}
                </button>

                {/* Location Status */}
                {isGettingLocation && (
                  <div className="text-center text-sm text-gray-600">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Getting location...
                  </div>
                )}

                {!location.lat && !isGettingLocation && (
                  <div className="text-center text-sm text-red-600">
                    Location required for attendance
                  </div>
                )}
              </div>
            )}

            {/* API Response */}
            {apiResponse && (
              <div
                className={`w-full max-w-xs mt-4 p-4 rounded-lg text-center transition-all ${
                  apiResponse.success
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <p className="text-sm font-medium mb-2">
                  {apiResponse.message}
                </p>
                {apiResponse.data && (
                  <div className="text-xs space-y-1 bg-white/50 p-3 rounded border">
                    <div className="grid grid-cols-1 gap-1 text-left">
                      <p>
                        <span className="font-medium">ID:</span>{" "}
                        {apiResponse.data.userID}
                      </p>
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {apiResponse.data.userName}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {apiResponse.data.status}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{" "}
                        {apiResponse.data.date}
                      </p>
                      {apiResponse.data.punchIn && (
                        <p>
                          <span className="font-medium">Punch In:</span>{" "}
                          {new Date(apiResponse.data.punchIn).toLocaleString()}
                        </p>
                      )}
                      {apiResponse.data.punchOut && (
                        <p>
                          <span className="font-medium">Punch Out:</span>{" "}
                          {new Date(apiResponse.data.punchOut).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfiePunchedIn;
