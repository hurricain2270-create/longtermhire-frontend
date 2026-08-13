const MailService = require("../../../baas/services/MailService");
const bcrypt = require("bcryptjs");

module.exports = function (app) {
  // Get configuration and initialize mail service
  const config = app.get("configuration");
  const mailService = new MailService(config);

  // Step 1: Send OTP to client email for password reset
  app.post("/v1/api/longtermhire/client/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      console.log("🔍 Client forgot password request for:", email);

      // Check if user exists and has member/client role
      const user = await sdk.findOne("user", {
        email: email,
      });

      if (!user) {
        // Return error for non-existent email
        return res.status(404).json({
          error: true,
          message: "No account found with this email address.",
        });
      }

      // Check if user has member role (clients use member role)
      if (user.role_id !== "member") {
        return res.status(403).json({
          error: true,
          message: "This email is not associated with a client account.",
        });
      }

      console.log("✅ Valid client user found:", user.id);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      console.log("🔐 Generated OTP:", otp, "expires at:", otpExpiry);

      // Store OTP in database (you might want to create a separate OTP table)
      // For now, we'll store it in the user table temporarily
      await sdk.update("user", user.id, {
        reset_otp: otp,
        reset_otp_expiry: otpExpiry,
        updated_at: new Date(),
      });

      // Create HTML email template for OTP
      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
          <div style="background-color: #1F1F20; padding: 30px; border-radius: 8px; border: 2px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333333;">
              <img src="https://longtermhire.com/login-logo.png" 
                   alt="Longterm Hire Logo" 
                   style="width: 240px; height: 135px; margin-bottom: 15px;">
              <h1 style="color: #E5E5E5; margin: 0; font-size: 28px; font-weight: 400;">🔐 Password Reset Request</h1>
              <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">Longterm Hire Platform</p>
            </div>
            
            <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444; border-left: 4px solid #FDCE06;">
              <h3 style="color: #E5E5E5; margin-top: 0; font-size: 20px; font-weight: 400;">Hello!</h3>
              <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                We received a request to reset your password for your <strong>Longterm Hire</strong> account.
                Use the verification code below to proceed with resetting your password.
              </p>
            </div>

            <div style="background: #292A2B; padding: 30px; border-radius: 6px; margin: 25px 0; text-align: center; border: 1px solid #444444;">
              <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">🔢 Your Verification Code</h3>
              <div style="background: #1C1C1C; padding: 20px; border-radius: 6px; margin: 15px 0; border: 1px solid #444444;">
                <span style="font-size: 32px; font-weight: bold; color: #FDCE06; letter-spacing: 8px; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #ADAEBC; font-size: 14px; margin: 10px 0 0 0;">
                This code will expire in <strong style="color: #FDCE06;">10 minutes</strong>
              </p>
            </div>

            <div style="background: #1C1C1C; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444; border-left: 4px solid #FDCE06;">
              <h4 style="color: #FDCE06; margin-top: 0; font-size: 16px; font-weight: 400;">🔒 Security Notice</h4>
              <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">
                If you didn't request this password reset, please ignore this email. 
                Your password will remain unchanged. For security, this code will expire in 10 minutes.
              </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #333333; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #ADAEBC; font-size: 14px; margin: 0;">
                Need help? Contact our support team.<br>
                <small style="color: #666666;">This email was sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small>
              </p>
            </div>
          </div>
        </div>
      `;

      // Send OTP email
      const emailResult = await mailService.send(
        config.mail?.from_mail || "noreply@equipmenthire.com",
        email,
        "🔐 Password Reset Code - Equipment Hire Platform",
        htmlContent
      );

      console.log("✅ OTP email sent successfully:", emailResult);

      return res.status(200).json({
        error: false,
        message: "Password reset instructions have been sent to your email.",
        data: {
          email: email,
          otp_sent: !emailResult.error,
          expires_in: "10 minutes",
        },
      });
    } catch (error) {
      console.error("❌ Client forgot password error:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
        details: error.message,
      });
    }
  });

  // Step 2: Verify OTP code
  app.post("/v1/api/longtermhire/client/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          error: true,
          message: "Email and OTP are required",
        });
      }

      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      console.log("🔍 Verifying OTP for client:", email, "OTP:", otp);

      // Find user with email
      const user = await sdk.findOne("user", {
        email: email,
      });

      if (!user) {
        return res.status(400).json({
          error: true,
          message: "Invalid request",
        });
      }

      // Check if user has member role (clients use member role)
      if (user.role_id !== "member") {
        return res.status(400).json({
          error: true,
          message: "Invalid request",
        });
      }

      // Check if OTP matches and hasn't expired
      if (!user.reset_otp || user.reset_otp !== otp) {
        console.log("❌ OTP mismatch. Expected:", user.reset_otp, "Got:", otp);
        return res.status(400).json({
          error: true,
          message: "Invalid verification code",
        });
      }

      // Check if OTP has expired
      const now = new Date();
      const otpExpiry = new Date(user.reset_otp_expiry);
      if (now > otpExpiry) {
        console.log("❌ OTP expired. Current time:", now, "Expiry:", otpExpiry);
        return res.status(400).json({
          error: true,
          message: "Verification code has expired. Please request a new one.",
        });
      }

      console.log("✅ OTP verified successfully for:", email);

      // Generate a temporary reset token (valid for 15 minutes)
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update user with reset token and clear OTP
      await sdk.update("user", user.id, {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        reset_otp: null,
        reset_otp_expiry: null,
        updated_at: new Date(),
      });

      return res.status(200).json({
        error: false,
        message:
          "Verification code confirmed. You can now reset your password.",
        data: {
          email: email,
          reset_token: resetToken,
          expires_in: "15 minutes",
        },
      });
    } catch (error) {
      console.error("❌ Client verify OTP error:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
        details: error.message,
      });
    }
  });

  // Step 3: Reset password with new password
  app.post("/v1/api/longtermhire/client/reset-password", async (req, res) => {
    try {
      const { email, reset_token, new_password } = req.body;

      if (!email || !reset_token || !new_password) {
        return res.status(400).json({
          error: true,
          message: "Email, reset token, and new password are required",
        });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({
          error: true,
          message: "Password must be at least 8 characters long",
        });
      }

      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      console.log("🔍 Resetting password for client:", email);

      // Find user with email
      const user = await sdk.findOne("user", {
        email: email,
      });

      if (!user) {
        return res.status(400).json({
          error: true,
          message: "Invalid request",
        });
      }

      // Check if user has member role (clients use member role)
      if (user.role_id !== "member") {
        console.log("❌ User is not a client (role_id:", user.role_id, ")");
        return res.status(400).json({
          error: true,
          message: "This email is not associated with a client account",
        });
      }

      // Check if reset token matches and hasn't expired
      if (!user.reset_token || user.reset_token !== reset_token) {
        console.log("❌ Reset token mismatch");
        return res.status(400).json({
          error: true,
          message: "Invalid or expired reset token",
        });
      }

      // Check if reset token has expired
      const now = new Date();
      const tokenExpiry = new Date(user.reset_token_expiry);
      if (now > tokenExpiry) {
        console.log("❌ Reset token expired");
        return res.status(400).json({
          error: true,
          message: "Reset token has expired. Please start the process again.",
        });
      }

      console.log(
        "✅ Reset token verified, updating password for client user ID:",
        user.id
      );

      // Hash the new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update user password and clear reset token using raw SQL to ensure proper update
      const currentTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const updatePasswordSQL = `
        UPDATE longtermhire_user
        SET password = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = ?
        WHERE id = ? AND role_id = 'member'
      `;

      await sdk.rawQuery(updatePasswordSQL, [
        hashedPassword,
        currentTime,
        user.id,
      ]);

      console.log("✅ Password reset successfully for client:", email);

      return res.status(200).json({
        error: false,
        message:
          "Password reset successfully. You can now log in with your new password.",
        data: {
          email: email,
          reset_completed: true,
        },
      });
    } catch (error) {
      console.error("❌ Client reset password error:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
        details: error.message,
      });
    }
  });

  // Resend OTP endpoint
  app.post("/v1/api/longtermhire/client/resend-otp", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      // Reuse the forgot password logic to send new OTP
      req.body = { email };
      return app._router.handle(
        {
          ...req,
          method: "POST",
          url: "/v1/api/longtermhire/client/forgot-password",
        },
        res,
        () => {}
      );
    } catch (error) {
      console.error("❌ Client resend OTP error:", error);
      return res.status(500).json({
        error: true,
        message: "Internal server error",
        details: error.message,
      });
    }
  });
};
