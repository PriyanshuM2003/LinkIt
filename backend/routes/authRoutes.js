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
            name: data.name,
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
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
    
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <h1>Email Verification</h1>
            <p>Hello,</p>
            <p>Please click the button below to verify your email address.</p>
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <a href="${verificationLink}" target="_blank" style="background-color: #401d1d; color: #ffffff; display: inline-block; font-size: 16px; text-decoration: none; padding: 12px 24px; border-radius: 5px;">Verify Email</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p>If you didn't create an account with us, you can ignore this message.</p>
          </td>
        </tr>
      </table>
    
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

    if (!user || user.verificationToken !== token) {
      return res
        .status(404)
        .json({ message: "Invalid token or user not found" });
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

router.post("/login", (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        res.status(401).json(info);
        return;
      }

      if (!user.isVerified) {
        res.status(401).json({
          message:
            "Please verify yourself by the verification email sent to you.",
        });
        return;
      }

      // Token
      const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
      res.json({
        token: token,
        type: user.type,
      });
    }
  )(req, res, next);
});

module.exports = router;
