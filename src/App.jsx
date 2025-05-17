import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Scanner from "./views/Scanner";
import QRCodeScanner from "./views/QRLocationScanner";
import AttendanceDetails from "./views/AttendanceDetail";
import SelfieLocationPunchIn from "./views/SelfieLocationPunchedIn";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SelfieLocationPunchIn />} />
        <Route path="/attendance-details" element={<AttendanceDetails />} />
      </Routes>
    </Router>
    // <QRCodeScanner/>
    // <Scanner />
  );
};

export default App;
