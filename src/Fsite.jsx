import React, { useState, useRef, useEffect } from 'react';
import { Camera } from "lucide-react";
import * as faceapi from '@vladmandic/face-api'; //face api for face detection and recognition
import { Link, useNavigate } from 'react-router-dom';
// study
const FaceRecognition = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null); //references video element for camera feed
  const canvasRef = useRef(null); //for drawing face detection overlays
  const modelsLoaded = useRef(false); //track if ang models kay loaded
  const detectionIntervalRef = useRef(null); //for detection timer
  
  //state managements
  const [status, setStatus] = useState("Initializing face detection...");
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupColor, setPopupColor] = useState("bg-gray-200");
  const [cameraError, setCameraError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(5); //track failed attempts


  //load essential face recog models
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoaded.current) {
        await startVideo();
        return;
      }
      try {
        setStatus("Loading models");
        
        const modelPath = `${window.location.origin}/models`;
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);

        setStatus("Models loaded successfully");
        modelsLoaded.current = true;
        await startVideo();
      } catch (err) {
        console.error("Error loading models:", err);
        setStatus(`Error loading models: ${err.message}`);
        setDebugInfo(`Fatal error: ${err.message}`);
      }
    };

    //camera setups
    const startVideo = async () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 640 },
            frameRate: { ideal: 30 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            startFaceDetection();
          };
        }
        setCameraError(false);
        setStatus("Face detection active - Please look directly at the camera");
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError(true);
        setStatus("Camera access denied. Please enable camera permissions.");
      }
    };


    //checks quality of the face 
    const checkFaceQuality = (detection) => {
      if (!videoRef.current) return false;

      // quality checks
      if (detection.detection.score < 0.6) {
        setStatus("Please ensure your face is well-lit and clear");
        return false;
      }

      const faceBox = detection.detection.box;
      const videoCenter = videoRef.current.videoWidth / 2;
      const faceCenter = faceBox.x + (faceBox.width / 2);
      const maxOffset = videoRef.current.videoWidth * 0.2;
      
      if (Math.abs(faceCenter - videoCenter) > maxOffset) {
        setStatus("Please center your face in the frame");
        return false;
      }

      const minSize = videoRef.current.videoWidth * 0.25;
      const maxSize = videoRef.current.videoWidth * 0.75;
      if (faceBox.width < minSize) {
        setStatus("Please move closer to the camera");
        return false;
      }
      if (faceBox.width > maxSize) {
        setStatus("Please move back from the camera");
        return false;
      }

      return true;
    };

    //to detect face 
    const startFaceDetection = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const displaySize = { 
        width: videoRef.current.videoWidth, 
        height: videoRef.current.videoHeight 
      };
      faceapi.matchDimensions(canvas, displaySize);

      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      detectionIntervalRef.current = setInterval(async () => {
        if (isProcessing || !videoRef.current || !canvasRef.current) return;

        try {
          setIsProcessing(true);
          
          const detectorOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
          });

          // takes 5 samples for accuracy
          const sampleCount = 5; 
          let successfulSamples = 0;
          let accumulatedDescriptor = new Float32Array(128).fill(0);

          for (let i = 0; i < sampleCount; i++) {
            const detections = await faceapi
              .detectAllFaces(videoRef.current, detectorOptions)
              .withFaceLandmarks()
              .withFaceDescriptors();

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detections.length === 1) {
              const detection = detections[0];
              const resizedDetections = faceapi.resizeResults(detections, displaySize);
              
              faceapi.draw.drawDetections(canvas, resizedDetections);
              faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

              if (checkFaceQuality(detection)) {
                successfulSamples++;
                accumulatedDescriptor = accumulatedDescriptor.map((val, idx) => 
                  val + detection.descriptor[idx]
                );
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          if (successfulSamples >= 2) {
            const averageDescriptor = accumulatedDescriptor.map(val => val / successfulSamples);

            console.log('Average Descriptor:', averageDescriptor);
            console.log('Sending descriptor:', Array.from(averageDescriptor));
            console.log('Descriptor type:', typeof Array.from(averageDescriptor));
            console.log('Is array:', Array.isArray(Array.from(averageDescriptor)));
            console.log('Descriptor length:', Array.from(averageDescriptor).length);
            console.log('First few values:', Array.from(averageDescriptor).slice(0, 5));

            // send to backend /api/recognize for recognition
            try {
              const response = await fetch('/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  faceDescriptor: Array.from(averageDescriptor), //process face data and checks if the user exist in the db
                  detectionScore: successfulSamples / sampleCount,
                })
              });

              if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
              }

              const result = await response.json();
              console.log('Recognition Result:', result);
              if (result.recognized) {
                setPopupMessage("Face recognized! Redirecting...");
                setPopupColor("bg-green-500");
                setPopupVisible(true);

                //redirects to the main page if successfull recognition
                setTimeout(() => {
                  navigate('/success', { state: 
                    { userData: result.userData
                      
                     } });
                }, 1500); //run every 1.5 sec
              } else {
                setFailedAttempts(prev => {
                  const newCount = prev + 1;
                  setStatus(`Face not recognized. Please try again. Attempts: ${newCount}`);
                  return newCount;
                });
              }
            } catch (error) {
              console.error("API Error:", error);
              setStatus("Connection error. Please try again.");
            }
          } else {
            setStatus("Please maintain a clear, steady pose");
          }
        } catch (error) {
          console.error("Error in face detection:", error);
          setDebugInfo(`Detection error: ${error.message}`);
        } finally {
          setIsProcessing(false);
        }
      }, 1500);
    };

    loadModels();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [failedAttempts, navigate]);


  //Ui components
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Face Recognition</h1>
        
        <div className="aspect-square w-full relative rounded-lg overflow-hidden border-4 border-gray-300">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-center text-gray-600">{status}</p>
          {debugInfo && <p className="text-sm text-gray-500 text-center">{debugInfo}</p>}
          {failedAttempts >= 3 && (
            <p className="text-center text-red-500">
              Face not recognized. <Link to="/register" className="underline">Register here</Link>
            </p>
          )}
        </div>
      </div>

      {isPopupVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className={`${popupColor} rounded-lg shadow-lg p-8 text-center text-white`}>
            <p className="text-2xl font-bold">{popupMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;