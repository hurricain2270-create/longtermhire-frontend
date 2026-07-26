const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const JwtService = require("../../../baas/services/JwtService");
const bcrypt = require("bcryptjs");
const MailService = require("../../../baas/services/MailService");

module.exports = function (app) {
  // Client Login
  app.post("/v1/api/longtermhire/client/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: true,
          message: "Email and password are required",
        });
      }

      const config = app.get("configuration");
      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      // Find user by email
      console.log("🔍 Client login attempt for email:", email);
      const user = await sdk.findOne("user", {
        email: email,
      });

      if (!user) {
        console.log("❌ Client user not found with email:", email);
        return res.status(401).json({
          error: true,
          message: "Invalid credentials",
        });
      }

      console.log("✅ Client user found:", {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        status: user.status,
        verify: user.verify,
      });

      // Verify password using bcrypt
      console.log("🔐 Comparing client password");
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("🔐 Client password comparison result:", isValidPassword);

      if (!isValidPassword) {
        console.log("❌ Client password verification failed");
        return res.status(401).json({
          error: true,
          message: "Invalid credentials",
        });
      }

      console.log("✅ Client password verification successful");

      // Check if user is active
      console.log("🔍 Checking client user status:", user.status);
      if (user.status !== 1) {
        console.log("❌ Client account is not active");
        return res.status(401).json({
          error: true,
          message: "Account is not active",
        });
      }

      // Check if email is verified
      console.log("🔍 Checking client email verification:", user.verify);
      if (!user.verify) {
        console.log("❌ Client email is not verified");
        return res.status(401).json({
          error: true,
          message: "Email is not verified",
        });
      }

      // Check if user has member role (clients use member role)
      console.log("🔍 Checking client user role:", user.role_id);
      if (user.role_id !== "member") {
        console.log("❌ User does not have member role");
        return res.status(403).json({
          error: true,
          message: "Access denied. Client privileges required",
        });
      }

      console.log("✅ All client checks passed, generating token...");

      // Check if this is the user's first login
      const isFirstLogin = user.first_login === true || user.first_login === 1;

      // Generate JWT token
      const tokenPayload = {
        user_id: user.id,
        role: user.role_id,
      };

      const accessToken = JwtService.createAccessToken(
        tokenPayload,
        60 * 60 * 12,
        config.jwt_key
      );

      // Send email to admin if this is the first login
      if (isFirstLogin) {
        try {
          console.log(
            "📧 First login detected, sending notification to admin..."
          );

          // Get specific admin user (ID 2)
          const adminUser = await sdk.findOne("user", {
            id: 2,
          });

          if (adminUser) {
            const mailService = new MailService(config);

            // Get client profile for email content
            let clientProfile = null;
            try {
              clientProfile = await sdk.findOne("client", {
                user_id: user.id,
              });
            } catch (error) {
              console.log(
                "⚠️ No client profile found for first login notification"
              );
            }

            // Prepare email content
            const clientName = clientProfile?.client_name || user.email;
            const companyName = clientProfile?.company_name || "N/A";
            const loginTime = new Date().toLocaleString("en-AU", {
              timeZone: "Australia/Melbourne",
            });
            const clientIp =
              req.ip ||
              req.connection.remoteAddress ||
              req.headers["x-forwarded-for"] ||
              "unknown";

            const emailSubject = `New Client First Login - ${clientName}`;
            const emailHtml = `
              <div style="font-family: 'Inter', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
                <div style="background-color: #1F1F20; padding: 24px; border-radius: 8px; border: 2px solid #E5E7EB;">
                  <h2 style="color: #E5E5E5; margin: 0; font-weight: 500;">🎉 New Client First Login</h2>
                  <p style="color: #ADAEBC; margin: 12px 0 0 0;">A client has successfully logged in for the first time using their provided credentials.</p>
                  
                  <div style="background: #292A2B; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #444444;">
                    <h3 style="color: #FDCE06; margin: 0 0 12px 0; font-size: 16px;">Client Details</h3>
                    <p style="color: #E5E5E5; margin: 0;">
                      <strong style="color:#FDCE06;">Client Name:</strong> ${clientName}<br/>
                      <strong style="color:#FDCE06;">Company:</strong> ${companyName}<br/>
                      <strong style="color:#FDCE06;">Email:</strong> ${user.email
              }<br/>
                      <strong style="color:#FDCE06;">Login Time:</strong> ${loginTime}<br/>
                     
                    </p>
                  </div>

                  <div style="background: #1a4d1a; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #28a745;">
                    <p style="margin: 0; color: #90EE90;">
                      <strong>✅ This client has successfully logged in for the first time using their provided credentials.</strong>
                    </p>
                  </div>

                  <p style="color:#ADAEBC; margin: 0;">Please monitor this client's activity in the admin dashboard.</p>
                  <p style="color:#666; font-size:12px; margin-top:16px;">Sent on ${new Date().toLocaleString(
                "en-AU",
                { timeZone: "Australia/Melbourne" }
              )}</p>
                </div>
              </div>
            `;

            // Send email to admin user ID 2
            try {
              await mailService.send(
                config.mail.from_mail,
                adminUser.email,
                emailSubject,
                emailHtml
              );
              console.log(
                `📧 First login notification sent to admin (ID: 2): ${adminUser.email}`
              );
            } catch (emailError) {
              console.error(
                `❌ Failed to send first login notification to admin (ID: 2):`,
                emailError
              );
            }
          } else {
            console.log("⚠️ Admin user (ID: 2) not found or not active");
          }

          // Update first_login flag to FALSE after sending notification
          try {
            const updateFirstLoginSQL = `
              UPDATE longtermhire_user 
              SET first_login = FALSE, updated_at = NOW() 
              WHERE id = ?
            `;
            await sdk.rawQuery(updateFirstLoginSQL, [user.id]);
            console.log(
              "✅ First login flag updated to FALSE for user:",
              user.id
            );
          } catch (updateError) {
            console.error("❌ Failed to update first login flag:", updateError);
          }
        } catch (firstLoginError) {
          console.error(
            "❌ Error handling first login notification:",
            firstLoginError
          );
          // Don't fail the login if email notification fails
        }
      }

      // Get client profile information
      let clientProfile = null;
      try {
        clientProfile = await sdk.findOne("client", {
          user_id: user.id,
        });
      } catch (error) {
        console.log("⚠️ No client profile found for user:", user.id);
      }

      console.log("🎉 Client login successful for:", email);

      // Log client login activity
      try {
        const loginLogSQL = `
          INSERT INTO longtermhire_client_login_logs
          (client_id, login_time, ip_address, user_agent)
          VALUES (?, NOW(), ?, ?)
        `;

        const clientIp =
          req.ip ||
          req.connection.remoteAddress ||
          req.headers["x-forwarded-for"] ||
          "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";

        await sdk.rawQuery(loginLogSQL, [user.id, clientIp, userAgent]);

        console.log("📝 Client login logged for user:", user.id);
      } catch (logError) {
        console.error("⚠️ Failed to log client login:", logError);
        // Don't fail the login if logging fails
      }

      // Get company roles
      let companyRoles = [];
      try {
        const roles = await sdk.rawQuery(
          "SELECT company_id, role FROM longtermhire_company_member WHERE user_id = ?",
          [user.id]
        );
        companyRoles = roles;
      } catch (error) {
        console.log("⚠️ Error fetching company roles:", error);
      }

      return res.status(200).json({
        error: false,
        access_token: accessToken,
        token: accessToken, // For compatibility with frontend
        user_id: user.id,
        role: user.role_id,
        company_roles: companyRoles,
        email: user.email,
        client_profile: clientProfile,
        expire_at: 60 * 60 * 12,
        message: "Login successful",
      });
    } catch (error) {
      console.error("Client login error:", error);
      return res.status(500).json({
        error: true,
        message: error.message || "Internal server error",
      });
    }
  });

  // Client Logout
  app.post(
    "/v1/api/longtermhire/client/logout",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        console.log("🚪 Client logout for user:", req.user_id);
        // In a real app, you'd invalidate the token in database
        return res.status(200).json({
          error: false,
          message: "Logout successful",
        });
      } catch (error) {
        console.error("Client logout error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get Client Profile
  app.get(
    "/v1/api/longtermhire/client/profile",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get user information
        const user = await sdk.findOne("user", {
          id: req.user_id,
        });

        if (!user) {
          return res.status(404).json({
            error: true,
            message: "User not found",
          });
        }

        // Get client profile
        let clientProfile = null;
        try {
          clientProfile = await sdk.findOne("client", {
            user_id: req.user_id,
          });

          if (!clientProfile) {
            // Check company member table
            const memberResult = await sdk.rawQuery(
              `SELECT cm.*, c.company_name 
               FROM longtermhire_company_member cm
               JOIN longtermhire_company c ON cm.company_id = c.id
               WHERE cm.user_id = ?
               LIMIT 1`,
              [req.user_id]
            );

            if (memberResult && memberResult.length > 0) {
              const member = memberResult[0];
              clientProfile = {
                ...member,
                client_name: member.member_name, // Map member_name to client_name for consistency
              };
              console.log("✅ Found profile in company_member table");
            }
          }
        } catch (error) {
          console.log("⚠️ No client profile found for user:", req.user_id);
        }

        // Remove password from response
        const { password, ...userProfile } = user;

        return res.status(200).json({
          error: false,
          data: {
            user: userProfile,
            client_profile: clientProfile,
          },
        });
      } catch (error) {
        console.error("Get client profile error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Update Client Profile
  app.put(
    "/v1/api/longtermhire/client/profile",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { client_name, name } = req.body;

        if (!client_name && !name) {
          return res.status(400).json({
            error: true,
            message: "Client name is required",
          });
        }

        // Get current user
        const user = await sdk.findOne("user", {
          id: req.user_id,
        });

        if (!user) {
          return res.status(404).json({
            error: true,
            message: "User not found",
          });
        }

        // Get client profile - check company_member table first (V2), then longtermhire_client (V1)
        let clientProfile = null;
        let isCompanyMember = false;

        // Try company_member table first (V2 - preferred)
        const companyMemberQuery = `
          SELECT id, company_id, member_name, user_id
          FROM longtermhire_company_member
          WHERE user_id = ?
          LIMIT 1
        `;
        const companyMemberResult = await sdk.rawQuery(companyMemberQuery, [
          req.user_id,
        ]);

        if (companyMemberResult && companyMemberResult.length > 0) {
          // User is a company member - update member_name
          isCompanyMember = true;
          clientProfile = companyMemberResult[0];

          const currentTime = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

          const updateSQL = `
            UPDATE longtermhire_company_member
            SET member_name = ?, updated_at = ?
            WHERE id = ?
          `;

          console.log("Updating company member profile:", {
            member_id: clientProfile.id,
            new_name: client_name || name,
            sql: updateSQL,
          });

          await sdk.rawQuery(updateSQL, [
            client_name || name,
            currentTime,
            clientProfile.id,
          ]);
        } else {
          // Fallback to longtermhire_client table (V1)
          clientProfile = await sdk.findOne("client", {
            user_id: req.user_id,
          });

          if (!clientProfile) {
            return res.status(404).json({
              error: true,
              message: "Client profile not found",
            });
          }

          // Update client profile using raw SQL to avoid SDK issues
          const currentTime = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

          const updateSQL = `
            UPDATE longtermhire_client
            SET client_name = ?, updated_at = ?
            WHERE id = ?
          `;

          console.log("Updating client profile:", {
            client_id: clientProfile.id,
            new_name: client_name || name,
            sql: updateSQL,
          });

          await sdk.rawQuery(updateSQL, [
            client_name || name,
            currentTime,
            clientProfile.id,
          ]);
        }

        console.log("✅ Client profile updated successfully");

        return res.status(200).json({
          error: false,
          message: "Profile updated successfully",
        });
      } catch (error) {
        console.error("Update client profile error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Change Client Password
  app.put(
    "/v1/api/longtermhire/client/change-password",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
          return res.status(400).json({
            error: true,
            message: "Current password and new password are required",
          });
        }

        // Get current user
        const user = await sdk.findOne("user", {
          id: req.user_id,
        });

        if (!user) {
          return res.status(404).json({
            error: true,
            message: "User not found",
          });
        }

        // Verify current password with bcrypt
        const isCurrentPasswordValid = await bcrypt.compare(
          current_password,
          user.password
        );
        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            error: true,
            message: "Current password is incorrect",
          });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // Update password using raw SQL to avoid SDK issues
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        const updatePasswordSQL = `
          UPDATE longtermhire_user
          SET password = ?, updated_at = ?
          WHERE id = ?
        `;

        console.log("Updating client password for user ID:", req.user_id);

        await sdk.rawQuery(updatePasswordSQL, [
          hashedNewPassword,
          currentTime,
          req.user_id,
        ]);

        console.log("✅ Client password updated successfully");

        return res.status(200).json({
          error: false,
          message: "Password changed successfully",
        });
      } catch (error) {
        console.error("Change client password error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );
};
