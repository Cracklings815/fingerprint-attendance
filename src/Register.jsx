import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Save, ArrowLeft, X } from 'lucide-react';

const Registration = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    nationality: '',
    maritalStatus: '',
    placeOfBirth: '',
    sex: '',
    gender: '',
    religion: '',
    address: '',
    phoneNumber: '',
    email: '',
    occupation: '',
    bloodType: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phoneNumber: ''
    }
  });

  const [popupMessage, setPopupMessage] = useState("");
  const [popupColor, setPopupColor] = useState("");
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('emergency')) {
      const field = name.replace('emergency', '').toLowerCase();
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create FormData object to handle file upload
    const formDataToSend = new FormData();
    
    // Append all form fields
    Object.keys(formData).forEach(key => {
      if (key !== 'emergencyContact') {
        formDataToSend.append(key, formData[key]);
      }
    });
    
    // Append emergency contact fields
    formDataToSend.append('emergencyName', formData.emergencyContact.name);
    formDataToSend.append('emergencyRelationship', formData.emergencyContact.relationship);
    formDataToSend.append('emergencyPhone', formData.emergencyContact.phoneNumber);
    
    // If there's a profile image, append it
    if (profileImage) {
      // Convert base64 to blob
      const response = await fetch(profileImage);
      const blob = await response.blob();
      formDataToSend.append('profileImage', blob, `${formData.firstName}_${formData.middleName}_${formData.lastName}.jpg`);
    }
    else
    {
      alert('Error, No Profile Picture!');
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setPopupMessage("Registered Successfully! Redirecting to Login Page...");
        setPopupColor("bg-blue-500");

        setTimeout(() => {
          navigate('/');  // Redirect to the login page ("/" route)
        }, 3000);
        
      } else {

        alert('Registration failed: ' + (result.message || 'Please try again.'));
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Camera Modal Component
const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please ensure you've granted camera permissions.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageDataURL = canvas.toDataURL('image/jpeg');
      onCapture(imageDataURL);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Take a Picture</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCapture}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            <Camera className="w-4 h-4" />
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
};

  const handleBack = () => {
    window.history.back();
  };

  // Common input class for smaller text fields
  const inputClass = "w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg relative">
        <button
          type="button"
          onClick={handleBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="p-4 border-b border-gray-200 flex justify-center">
          <h2 className="text-xl font-bold">Face Recognition Registration Form</h2>
        </div>

        {/* Biometric Section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-base font-semibold mb-4">Biometric Data</h3>
          <div className="flex flex-wrap justify-center gap-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Profile Picture</h4>
              <div className="w-32 h-32 rounded-full bg-gray-100 mb-3 overflow-hidden flex items-center justify-center">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs"
                >
                  <Camera className="w-3 h-3" />
                  Take a Picture
                </button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                  id="profile-upload"
                />
                <label
                  htmlFor="profile-upload"
                  className="flex items-center gap-1 cursor-pointer bg-gray-500 text-white px-2 py-1 rounded-md hover:bg-gray-600 text-xs"
                >
                  <Upload className="w-3 h-3" />
                  Upload File
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Personal Details Section */}
        <div className="p-4">
          <h3 className="text-base font-semibold mb-4">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="firstName" className={labelClass}>
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className={labelClass}>
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="middleName" className={labelClass}>
                Middle Name
              </label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="dateOfBirth" className={labelClass}>
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="placeOfBirth" className={labelClass}>
                Place of Birth
              </label>
              <input
                type="text"
                id="placeOfBirth"
                name="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="nationality" className={labelClass}>
                Nationality
              </label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="sex" className={labelClass}>
                Sex
              </label>
              <select
                id="sex"
                name="sex"
                value={formData.sex}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="">Select Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="gender" className={labelClass}>
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="">Select Gender</option>
                <option value="Straight">Straight</option>
                <option value="Transgender">Transgender</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="maritalStatus" className={labelClass}>
                Marital Status
              </label>
              <select
                id="maritalStatus"
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="">Select Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="religion" className={labelClass}>
                Religion
              </label>
              <input
                type="text"
                id="religion"
                name="religion"
                value={formData.religion}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="occupation" className={labelClass}>
                Occupation
              </label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="bloodType" className={labelClass}>
                Blood Type
              </label>
              <select
                id="bloodType"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="">Select Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="phoneNumber" className={labelClass}>
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="address" className={labelClass}>
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
              
            </div>
            <div className="space-y-1">
              <label htmlFor="emergencyName" className={labelClass}>Emergency Contact Name</label>
              <input
                type="text"
                id="emergencyName"
                name="emergencyName"
                value={formData.emergencyName}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="emergencyRelationship" className={labelClass}>Emergency Contact Relationship</label>
              <select
                type="text"
                id="emergencyRelationship"
                name="emergencyRelationship"
                value={formData.emergencyRelationship}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="">Select Relationship</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Siblings">Siblings</option>
                <option value="Guardian">Guardian</option>
                <option value="Others">Others</option>
                

                </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="emergencyPhone" className={labelClass}>Emergency Contact Phone</label>
              <input
                type="tel"
                id="emergencyPhone"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
          
          </div>
          
          
        </div>

        

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 text-sm"
          >
            <Save className="w-3 h-3" />
            Save Registration
          </button>
        </div>
      </div>

      {popupMessage && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className={`${popupColor} rounded-lg shadow-lg p-8 w-96 text-center text-white transition-all duration-300`}>
          <p className="text-2xl font-bold mb-2">{popupMessage}</p>
        </div>
      </div>
    )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(imageDataURL) => setProfileImage(imageDataURL)}
      />
    </form>

      
    
  );
};

export default Registration;