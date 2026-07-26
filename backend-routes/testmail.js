const MailService = require("../../../baas/services/MailService");

module.exports = function (app) {
  // Get configuration and initialize mail service
  const config = app.get("configuration");
  const mailService = new MailService(config);

  // Test email endpoint - GET request for easy browser testing
  app.get("/v1/api/longtermhire/test/send-email", async (req, res) => {
    try {
      console.log("🧪 Testing email sending functionality...");

      const testEmail = "azeezumarfaruk@gmail.com";
      const testName = "Azeez Umar Faruk";
      const testLink = "http://localhost:3000/client/login";

      console.log("📧 Sending test email to:", testEmail);

      // Create a simple HTML email template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">🎉 Equipment Hire Client Invitation</h2>
          <p>Hello <strong>${testName}</strong>,</p>
          <p>You have been invited to join the Equipment Hire Platform!</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
            <p><strong>Company:</strong> Test Company Ltd</p>
            <p><strong>Login URL:</strong> <a href="${testLink}" style="color: #007bff;">${testLink}</a></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${testLink}"
               style="background: #FDCE06; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Access Your Account
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This is a test email from the Equipment Hire Platform.<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `;

      // Send email using MailService
      const result = await mailService.send(
        config.mail?.from_mail || "noreply@equipmenthire.com",
        testEmail,
        "🎉 Test: Equipment Hire Client Invitation",
        htmlContent
      );

      console.log("✅ Email sent successfully:", result);

      return res.status(200).json({
        error: false,
        message: "Test email sent successfully!",
        data: {
          recipient: testEmail,
          subject: "🎉 Test: Equipment Hire Client Invitation",
          result: result,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Test email sending failed:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to send test email",
        details: error.message,
        stack: error.stack,
      });
    }
  });

  // Test email with custom recipient - GET request
  app.get("/v1/api/longtermhire/test/send-email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const { name = "Test User", company = "Test Company" } = req.query;

      console.log("🧪 Testing email sending to custom recipient:", email);

      const testLink = "http://localhost:3000/client/login";

      console.log("📧 Sending test email to:", email);

      // Create HTML email template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">🎉 Equipment Hire Client Invitation</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You have been invited to join the Equipment Hire Platform!</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>Login URL:</strong> <a href="${testLink}" style="color: #007bff;">${testLink}</a></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${testLink}"
               style="background: #FDCE06; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Access Your Account
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This is a test email from the Equipment Hire Platform.<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `;

      // Send email using MailService
      const result = await mailService.send(
        config.mail?.from_mail || "noreply@equipmenthire.com",
        email,
        "🎉 Test: Equipment Hire Client Invitation",
        htmlContent
      );

      console.log("✅ Email sent successfully:", result);

      return res.status(200).json({
        error: false,
        message: "Test email sent successfully!",
        data: {
          recipient: email,
          name: name,
          company: company,
          subject: "🎉 Test: Equipment Hire Client Invitation",
          result: result,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Test email sending failed:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to send test email",
        details: error.message,
        stack: error.stack,
      });
    }
  });

  // Test simple email without template - GET request
  app.get("/v1/api/longtermhire/test/send-simple-email", async (req, res) => {
    try {
      console.log("🧪 Testing simple email sending...");

      const testEmail = "azeezumarfaruk@gmail.com";

      console.log("📧 Sending simple test email to:", testEmail);

      // Simple HTML content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email from Equipment Hire Platform</h2>
          <p>Hello!</p>
          <p>This is a test email to verify that the email sending functionality is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, the email service is working properly! 🎉</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from the Equipment Hire Platform.
          </p>
        </div>
      `;

      // Send email using MailService
      const result = await mailService.send(
        config.mail?.from_mail || "noreply@equipmenthire.com",
        testEmail,
        "🧪 Simple Test Email from Equipment Hire Platform",
        htmlContent
      );

      console.log("✅ Simple email sent successfully:", result);

      return res.status(200).json({
        error: false,
        message: "Simple test email sent successfully!",
        data: {
          recipient: testEmail,
          subject: "🧪 Simple Test Email from Equipment Hire Platform",
          result: result,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Simple test email sending failed:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to send simple test email",
        details: error.message,
        stack: error.stack,
      });
    }
  });
};
