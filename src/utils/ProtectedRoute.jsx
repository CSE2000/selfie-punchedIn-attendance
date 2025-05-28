// import React from "react";
// import { Navigate } from "react-router-dom";

// const ProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem("token");
//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }
//   return children;
// };

// export default ProtectedRoute;


import React from "react";
import { Navigate } from "react-router-dom";

const isTokenValid = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])); 
    const currentTime = Date.now() / 1000;
    return payload.exp && payload.exp > currentTime;
  } catch (e) {
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token || !isTokenValid(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
