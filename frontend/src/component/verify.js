import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import axios from "axios";
import apiList from "../lib/apiList";

const Verify = () => {
  const history = useHistory();
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
            history.push("/login");
          }, 3000);
        } else {
          setVerificationStatus("Email verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationStatus("Email verification failed");
      }
    };

    verifyToken();
  }, [token, history]);

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
