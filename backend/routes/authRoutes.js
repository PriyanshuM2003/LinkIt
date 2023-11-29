const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authKeys = require("../lib/authKeys");
const User = require("../db/User");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");
const { sendEmail } = require("../lib/mailer");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const data = req.body;

  // Check password length
  if (data.password.length < 8) {
    return res.status(400).json({
      message: "Password must be more than 8 characters.",
    });
  }

  try {
    const existingUser = await User.findOne({ email: data.email });

    if (existingUser) {
      return res.status(400).json({
        message:
          "The email address you have entered is already associated with another account.",
      });
    }

    const verificationToken = jwt.sign(
      { email: data.email },
      authKeys.jwtSecretKey,
      { expiresIn: "1d" }
    );

    let user = new User({
      email: data.email,
      password: data.password,
      type: data.type,
      verificationToken: verificationToken,
    });

    await user.save();

    const userDetails =
      user.type === "recruiter"
        ? new Recruiter({
            userId: user._id,
            companyName: data.companyName,
            contactNumber: data.contactNumber,
            bio: data.bio,
          })
        : new JobApplicant({
            userId: user._id,
            name: data.name,
            education: data.education,
            skills: data.skills,
            rating: data.rating,
            resume: data.resume,
            profile: data.profile,
          });

    await userDetails.save();

    const verificationLink = `${process.env.HOST}/verify/${verificationToken}`;
    const emailContent = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <title>Welcome to LinkIt</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                line-height: 1.6;
                color: #333;
            }
    
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
    
            h1 {
                color: #401d1d;
            }
    
            .welcome-text {
                margin-bottom: 20px;
            }
    
            .cta-button {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                text-decoration: none !important;
                color: #fff !important;
                background-color: #401d1d;
                border-radius: 5px;
            }
    
            .cta-button:hover {
                background-color: #5e2b2b;
            }
    
            .note {
                margin-top: 30px;
                font-size: 14px;
                color: #777;
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <h1>Welcome to LinkIt!</h1>
            ${
              data.type === "recruiter"
                ? `<p class="welcome-text">Dear ${data.companyName},</p>`
                : `<p class="welcome-text">Dear ${data.name},</p>`
            }
            <p>Thank you for signing up with us. We're thrilled to have you on board.</p>
            <p>We are dedicated to providing you with a great experience.</p>
            <p>Please click the button below to get started:</p>
            <a href="${verificationLink}" class="cta-button">Get Started</a>
            <p class="note">If you didn't create an account with us, you can ignore this message.</p>
        </div>
    </body>
    
    </html>
    `;

    await sendEmail({
      to: data.email,
      subject: "Email Verification",
      html: emailContent,
    });

    res
      .status(200)
      .json({ message: "User registered. Verification email sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/verify/:token", async (req, res) => {
  const token = req.params.token;

  try {
    const decoded = jwt.verify(token, authKeys.jwtSecretKey);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationToken !== token) {
      return res.status(404).json({ message: "Token mismatch" });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    async function (err, user, info) {
      try {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json(info);
        }

        if (!user.isVerified) {
          return res.status(401).json({
            message:
              "Please verify yourself by the verification email sent to you.",
          });
        }

        // Token
        const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
        res.json({
          token: token,
          type: user.type,
        });
      } catch (error) {
        next(error);
      }
    }
  )(req, res, next);
});

module.exports = router;
