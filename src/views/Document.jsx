import React, { useState } from "react";
import { FaDownload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const DocumentCenter = () => {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([
    {
      label: "Appraisal Letter",
      image: "/docs/appraisal.jpg",
      url: "/docs/appraisal.pdf",
    },
    {
      label: "Appointment Letter",
      image: "/docs/appointment.jpg",
      url: "/docs/appointment.pdf",
    },
    {
      label: "Salary Slip",
      image: "/docs/salary.jpg",
      url: "/docs/salary.pdf",
    },
    {
      label: "Bond Agreement",
      image: "/docs/bond.jpg",
      url: "/docs/bond.pdf",
    },
  ]);

  return (
    <div className="md:hidden w-full p-2 max-w-md mx-auto bg-white rounded-lg shadow">
      <div className="grid grid-cols-2 gap-4">
        {documents.map((doc, index) => (
          <div key={index} className="rounded-lg overflow-hidden bg-gray-50">
            <div className="px-2 py-1 bg-white text-sm font-medium text-gray-700 flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-gray-200 rounded-full" />
              {doc.label}
            </div>
            <div className="relative">
              <img
                src={doc.image}
                alt={doc.label}
                className="w-full h-28 object-cover rounded-b"
              />
              <a
                href={doc.url}
                download
                className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition"
              >
                <FaDownload className="text-white text-2xl" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-full py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DocumentCenter;

// import React, { useState } from "react";
// import { FaFileAlt, FaDownload } from "react-icons/fa";
// import { useNavigate } from "react-router-dom";

// const DocumentCenter = () => {
//   const navigate = useNavigate();
//   const [documents, setDocuments] = useState([
//     { name: "Resume.pdf", url: "/docs/resume.pdf" },
//     { name: "Portfolio.docx", url: "/docs/portfolio.docx" },
//   ]);

//   const addDocument = () => {
//     // For demo purpose, adding a mock document
//     const newDoc = {
//       name: `Document_${documents.length + 1}.pdf`,
//       url: `/docs/document_${documents.length + 1}.pdf`,
//     };
//     setDocuments([...documents, newDoc]);
//   };

//   return (
//     <div className="md:hidden p-4 w-full max-w-md mx-auto bg-white rounded-lg shadow">
//       <h2 className="text-xl font-semibold mb-4 text-center">
//         Document Center
//       </h2>

//       <div className="space-y-3">
//         {documents.map((doc, index) => (
//           <div
//             key={index}
//             className="flex items-center justify-between p-3 bg-gray-100 rounded-md"
//           >
//             <div className="flex items-center gap-2">
//               <FaFileAlt className="text-indigo-600 text-xl" />
//               <span className="text-sm text-gray-800">{doc.name}</span>
//             </div>
//             <a
//               href={doc.url}
//               download
//               className="text-indigo-600 hover:text-indigo-800"
//               title="Download"
//             >
//               <FaDownload />
//             </a>
//           </div>
//         ))}
//       </div>

//       <div className="mt-6 flex justify-between">
//         <button
//           onClick={() => navigate("/profile")}
//           className="px-4 py-2 bg-gray-300 text-black rounded"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={addDocument}
//           className="px-4 py-2 bg-indigo-600 text-white rounded"
//         >
//           Add Document
//         </button>
//       </div>
//     </div>
//   );
// };

// export default DocumentCenter;
