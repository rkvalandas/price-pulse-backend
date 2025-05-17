// backend/controllers/userController.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "1h",
  });
};

// Register User
const signUpUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create the user first (without OTP and otpExpiry - these will be added by sendOTP)
    const user = await User.create({ name, email, password });

    if (user) {
      // Send verification OTP
      const otpSent = await sendOTP(user, "verification");

      if (otpSent) {
        res.status(201).json({
          message: "User registered successfully. Please verify your email.",
        });
      } else {
        res.status(500).json({
          message:
            "Account created but couldn't send verification email. Please contact support.",
        });
      }
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password, rememberMe } = req.body;
  try {
    const user = await User.findOne({ email });

    // Check if user exists first
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Then check if the user is verified
    if (!user.isVerified) {
      // Automatically send a new verification OTP if the user tries to log in with an unverified account
      await sendOTP(user, "verification");
      return res.status(401).json({
        message:
          "Account not verified. We've sent a new verification code to your email.",
        isVerified: false,
        email: user.email,
      });
    }

    // Finally check the password
    if (await user.matchPassword(password)) {
      const token = generateToken(user._id);

      // Set cookie expiry based on rememberMe option
      const cookieOptions = {
        httpOnly: true, // Cookie cannot be accessed via client-side JavaScript
        secure: process.env.NODE_ENV === "production", // Use secure in production
        sameSite: "strict",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
      };

      // Set the JWT as an HTTP-only cookie
      res.cookie("auth_token", token, cookieOptions);

      // Return user data but not the token (token is in cookie)
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout User

const logoutUser = (req, res) => {
  // Clear the auth_token cookie
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logged out successfully" });
};

// Verify Email
const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or user does not exist" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined; // Clear OTP after verification
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "User verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Send OTP to user's email
const sendOTP = async (user, purpose = "verification") => {
  try {
    // Generate OTP and expiry time
    const otp = generateOTP();
    const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 10);
    const otpExpiry = new Date(Date.now() + otpExpiryMinutes * 60 * 1000); // Default 10 minutes from now

    // Update user's OTP information
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Prepare email content based on purpose
    let subject, content;

    if (purpose === "reset") {
      subject = "Price Pulse - Password Reset Code";
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #14b8a6;">Reset Your Password</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">Hello ${user.name},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">We received a request to reset your Price Pulse account password. Use the following verification code to complete the process:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f0f0f0; border-radius: 8px; display: inline-block;">${otp}</div>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">This code is valid for 10 minutes. If you didn't request a password reset, please ignore this email or contact support.</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">Thanks,<br>The Price Pulse Team</p>
        </div>
      `;
    } else {
      // Default is verification
      subject = "Price Pulse - Verify Your Email";
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #14b8a6;">Verify Your Email</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">Hello ${user.name},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">Welcome to Price Pulse! To complete your registration, please enter the verification code below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 5px; padding: 15px; background-color: #f0f0f0; border-radius: 8px; display: inline-block;">${otp}</div>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">This code is valid for 10 minutes. Once verified, you'll have full access to track prices and set alerts for your favorite products.</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333;">Thanks for joining us!<br>The Price Pulse Team</p>
        </div>
      `;
    }

    // Send the email
    await sendEmail(user.email, subject, content);
    return true;
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
};

// Forgot Password: Send OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use the sendOTP utility function with purpose "reset"
    const otpSent = await sendOTP(user, "reset");

    if (otpSent) {
      res.status(200).json({ message: "OTP sent to email" });
    } else {
      res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again later." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password: Verify OTP and Update Password
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Check if OTP is correct and not expired
    if (user.otp !== otp || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Update password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend verification OTP
const resendVerificationOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Use sendOTP utility to generate and send a new verification OTP
    const otpSent = await sendOTP(user, "verification");

    if (otpSent) {
      res
        .status(200)
        .json({ message: "New verification OTP sent to your email" });
    } else {
      res.status(500).json({
        message: "Failed to send verification OTP. Please try again later.",
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  signUpUser,
  loginUser,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerificationOTP,
};
