import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import apiList from "../lib/apiList";

const Verify = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [verificationStatus, setVerificationStatus] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(3);

  useEffect(() => {
    if (!token) {
      setVerificationStatus("Invalid verification link");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await axios.get(`${apiList.verifyEmail}/${token}`);

        if (response.status === 200) {
          setVerificationStatus("Email verified successfully");

          const timer = setInterval(() => {
            setRedirectTimer((prevTimer) => prevTimer - 1);
          }, 1000);

          setTimeout(() => {
            clearInterval(timer);
            navigate("/login");
          }, 3000);
        } else {
          setVerificationStatus("Email verification failed");
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          if (error.response.data && error.response.data.message) {
            setVerificationStatus(error.response.data.message);
          } else {
            setVerificationStatus("Email verification failed");
          }
        } else {
          console.error("Verification error:", error);
        }
      }
    };

    verifyToken();
  }, [token, navigate]);

  return (
    <>
      <div>
        <h1>{verificationStatus}</h1>
        {verificationStatus === "Email verified successfully" && (
          <p>Redirecting to login page in {redirectTimer} seconds...</p>
        )}
      </div>
    </>
  );
};

export default Verify;
