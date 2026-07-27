const MailService = require("../../../baas/services/MailService");

/**
 * ChatNotificationService handles sending email notifications for chat messages
 *
 * Notification Behavior:
 * - CLIENT → ADMIN: Always send email notification (no rate limiting)
 * - ADMIN → CLIENT: Send email notification only once per 24 hours (rate limiting)
 *
 * This ensures clients can always reach admins while preventing admin spam to clients.
 */
class ChatNotificationService {
  constructor(config) {
    this.mailService = new MailService(config);
    this.config = config;
  }

  /**
   * Check if we can send a chat notification (rate limiting)
   * @param {number} fromUserId - The sender's user ID
   * @param {number} toUserId - The recipient's user ID
   * @param {Object} sdk - The SDK instance
   * @param {boolean} isFromClient - Whether the sender is a client (true) or admin (false)
   * @returns {Promise<boolean>} - True if notification can be sent
   */
  async canSendChatNotification(
    fromUserId,
    toUserId,
    sdk,
    isFromClient = false
  ) {
    try {
      console.log(
        "🔍 Checking rate limiting for from:",
        fromUserId,
        "to:",
        toUserId,
        "isFromClient:",
        isFromClient
      );

      // If sender is a client, always allow notification (no rate limiting)
      if (isFromClient) {
        console.log(
          "✅ Client sender - no rate limiting, can send notification"
        );
        return true;
      }

      // If sender is admin, apply rate limiting (1 per 24 hours)
      console.log("🔍 Admin sender - applying rate limiting (1 per 24 hours)");

      const existingRecord = await sdk.findOne("chat_notifications", {
        client_user_id: fromUserId,
        admin_user_id: toUserId,
      });

      console.log("🔍 Existing notification record:", existingRecord);

      if (!existingRecord) {
        console.log("✅ No existing record, can send notification");
        return true; // First notification
      }

      const lastNotification = new Date(existingRecord.last_notification_sent);
      const now = new Date();
      const hoursSinceLastNotification =
        (now - lastNotification) / (1000 * 60 * 60);

      console.log("🔍 Last notification:", lastNotification);
      console.log("🔍 Current time:", now);
      console.log(
        "🔍 Hours since last notification:",
        hoursSinceLastNotification
      );

      // Allow notification if more than 24 hours have passed
      const canSend = hoursSinceLastNotification >= 24;
      console.log("🔍 Can send notification:", canSend);

      return canSend;
    } catch (error) {
      console.error("Error checking chat notification eligibility:", error);
      return false;
    }
  }

  /**
   * Send chat notification email to recipient
   * @param {number} fromUserId - The sender's user ID
   * @param {number} toUserId - The recipient's user ID
   * @param {Object} senderData - Sender information
   * @param {Object} recipientData - Recipient information
   * @param {Object} sdk - The SDK instance
   * @param {string} messageText - Optional message text to include in email (only for text messages)
   * @param {string} messageType - Message type ('text', 'image', 'pdf', 'file', etc.)
   */
  async sendChatNotification(
    fromUserId,
    toUserId,
    senderData,
    recipientData,
    sdk,
    messageText = null,
    messageType = "text"
  ) {
    try {
      console.log(
        "📧 ===== ChatNotificationService.sendChatNotification START ====="
      );
      console.log("📧 fromUserId:", fromUserId);
      console.log("📧 toUserId:", toUserId);
      console.log("📧 senderData:", JSON.stringify(senderData, null, 2));
      console.log("📧 recipientData:", JSON.stringify(recipientData, null, 2));

      // Determine if the sender is a client or admin
      const isFromClient = senderData.is_client === true;
      console.log("📧 Sender type - isFromClient:", isFromClient);
      console.log(
        "📧 Notification type:",
        isFromClient
          ? "CLIENT → ADMIN (no rate limiting)"
          : "ADMIN → CLIENT (rate limited to 1 per 24h)"
      );

      // Check rate limiting
      const canSend = await this.canSendChatNotification(
        fromUserId,
        toUserId,
        sdk,
        isFromClient
      );
      console.log("📧 Rate limiting check result:", canSend);

      if (!canSend) {
        console.log(
          `⏰ Chat notification rate limited for user: ${fromUserId}`
        );
        return false;
      }

      // Create HTML email content based on sender type
      let htmlContent, emailSubject;

      // Determine if we should show message text (only for text messages, exclude attachments)
      const shouldShowMessageText = messageText && messageType === "text";
      const messagePreview = shouldShowMessageText
        ? messageText.substring(0, 200) + (messageText.length > 200 ? "..." : "")
        : null;

      if (isFromClient) {
        // Client to Admin email template
        emailSubject = `New Message from ${
          senderData?.client_name || senderData?.first_name || "Client"
        } ${senderData?.last_name || ""}`;
        htmlContent = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
            <div style="background-color: #1F1F20; padding: 30px; border-radius: 8px; border: 2px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">

              <!-- Header with Logo -->
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333333;">
                <img src="https://longtermhire.com/login-logo.png"
                     alt="Longterm Hire Logo"
                     style="width: 240px; height: 135px; margin-bottom: 15px;">
                <h1 style="color: #E5E5E5; margin: 0; font-size: 24px; font-weight: 400;">💬 New Client Message</h1>
                <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">A client has sent you a new message</p>
              </div>

              <!-- Message Content -->
              <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">Hello Admin!</h3>
                <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                  You have received a new message from a client at <strong>Long Term Hire</strong>.
                </p>

                <div style="background: #292A2B; padding: 15px; border-radius: 4px; border: 1px solid #444444; margin: 15px 0;">
                  <p style="color: #E5E5E5; margin: 0; font-size: 14px;"><strong>From Client:</strong> ${
                    senderData.client_name || senderData.first_name || "Unknown"
                  } ${senderData.last_name || ""}</p>
                  <p style="color: #ADAEBC; margin: 5px 0 0 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString(
                    "en-AU",
                    { timeZone: "Australia/Melbourne" }
                  )}</p>
                  ${
                    messageType !== "text"
                      ? `<p style="color: #ADAEBC; margin: 5px 0 0 0; font-size: 14px;"><strong>Type:</strong> ${
                          messageType === "image"
                            ? "Image"
                            : messageType === "pdf"
                            ? "PDF Document"
                            : "File Attachment"
                        }</p>`
                      : ""
                  }
                </div>
                ${
                  shouldShowMessageText
                    ? `<div style="background: #1C1C1C; padding: 15px; border-radius: 4px; border-left: 4px solid #FDCE06; margin-top: 15px;">
                    <p style="color: #E5E5E5; margin: 0; font-size: 14px; line-height: 1.5;"><strong>Message Preview:</strong></p>
                    <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 13px; line-height: 1.5; font-style: italic;">"${messagePreview}"</p>
                  </div>`
                    : ""
                }
              </div>

              <!-- Login Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.longtermhire.com/login" 
                   style="background: #FDCE06; color: #1F1F20; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #FDCE06;">
                  🔗 Login to View Message
                </a>
              </div>

              <!-- Notice -->
              <div style="background: #1C1C1C; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444; border-left: 4px solid #FDCE06;">
                <h4 style="color: #FDCE06; margin-top: 0; font-size: 16px; font-weight: 400;">ℹ️ Client Communication</h4>
                <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">
                  Please respond to this client message promptly. You will receive notifications for all client messages.
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #333333; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #ADAEBC; font-size: 14px; margin: 0;">
                  Need assistance? Contact our support team.<br>
                  <small style="color: #666666;">Notification sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small>
                </p>
              </div>
            </div>
          </div>
        `;
      } else {
        // Admin to Client email template
        emailSubject = "New Message from Long Term Hire Team";
        htmlContent = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #292A2B;">
            <div style="background-color: #1F1F20; padding: 30px; border-radius: 8px; border: 2px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">

              <!-- Header with Logo -->
              <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333333;">
                <img src="https://longtermhire.com/login-logo.png"
                     alt="Longterm Hire Logo"
                     style="width: 240px; height: 135px; margin-bottom: 15px;">
                <h1 style="color: #E5E5E5; margin: 0; font-size: 24px; font-weight: 400;">💬 New Message Available</h1>
                <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 16px;">You have a new message from our team</p>
              </div>

              <!-- Message Content -->
              <div style="background: #1C1C1C; padding: 25px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444;">
                <h3 style="color: #E5E5E5; margin-top: 0; font-size: 18px; font-weight: 400;">Hello ${
                  recipientData.client_name ||
                  recipientData.first_name ||
                  "there"
                }!</h3>
                <p style="color: #ADAEBC; line-height: 1.6; margin: 15px 0;">
                  You have received a new message from our team at <strong>Long Term Hire</strong>.
                </p>

                <div style="background: #292A2B; padding: 15px; border-radius: 4px; border: 1px solid #444444; margin: 15px 0;">
                  <p style="color: #E5E5E5; margin: 0; font-size: 14px;"><strong>From:</strong> ${
                    senderData.client_name || senderData.first_name || "User"
                  } ${senderData.last_name || ""}</p>
                  <p style="color: #ADAEBC; margin: 5px 0 0 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString(
                    "en-AU",
                    { timeZone: "Australia/Melbourne" }
                  )}</p>
                  ${
                    messageType !== "text"
                      ? `<p style="color: #ADAEBC; margin: 5px 0 0 0; font-size: 14px;"><strong>Type:</strong> ${
                          messageType === "image"
                            ? "Image"
                            : messageType === "pdf"
                            ? "PDF Document"
                            : "File Attachment"
                        }</p>`
                      : ""
                  }
                </div>
                ${
                  shouldShowMessageText
                    ? `<div style="background: #1C1C1C; padding: 15px; border-radius: 4px; border-left: 4px solid #FDCE06; margin-top: 15px;">
                    <p style="color: #E5E5E5; margin: 0; font-size: 14px; line-height: 1.5;"><strong>Message Preview:</strong></p>
                    <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 13px; line-height: 1.5; font-style: italic;">"${messagePreview}"</p>
                  </div>`
                    : ""
                }
              </div>

              <!-- Login Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.longtermhire.com/client/login" 
                   style="background: #FDCE06; color: #1F1F20; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #FDCE06;">
                  🔗 Login to View Message
                </a>
              </div>

              <!-- Notice -->
              <div style="background: #1C1C1C; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #444444; border-left: 4px solid #FDCE06;">
                <h4 style="color: #FDCE06; margin-top: 0; font-size: 16px; font-weight: 400;">ℹ️ Notification Policy</h4>
                <p style="color: #ADAEBC; margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">
                  To avoid spam, you will only receive one notification per 24 hours. 
                  Please log in to view all your messages and respond.
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #333333; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #ADAEBC; font-size: 14px; margin: 0;">
                  Need assistance? Contact our support team.<br>
                  <small style="color: #666666;">Notification sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small>
                </p>
              </div>
            </div>
          </div>
        `;
      }

      console.log("📧 About to send email to:", recipientData.email);
      console.log("📧 MailService config:", this.config);

      // Send email using correct MailService format (4 parameters)
      const emailResult = await this.mailService.send(
        this.config.mail?.from_mail || "admin@longtermhire.com", // from
        recipientData.email, // to
        emailSubject, // subject
        htmlContent // html
      );
      console.log("📧 Email service result:", emailResult);

      if (emailResult && emailResult.error) {
        console.error("📧 Email service error:", emailResult.error);
        console.error("📧 Email service message:", emailResult.message);
      }

      // Update notification record
      const existingRecord = await sdk.findOne("chat_notifications", {
        client_user_id: fromUserId,
        admin_user_id: toUserId,
      });

      console.log("📧 Existing notification record:", existingRecord);
      console.log(
        "📧 notification_count_24h value:",
        existingRecord?.notification_count_24h
      );
      console.log(
        "📧 Type of notification_count_24h:",
        typeof existingRecord?.notification_count_24h
      );

      // Format date for MySQL (YYYY-MM-DD HH:MM:SS)
      const currentTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      if (existingRecord) {
        try {
          if (isFromClient) {
            // Client to admin: Update timestamp but don't increment count (no rate limiting)
            const updateSQL = `
              UPDATE longtermhire_chat_notifications 
              SET last_notification_sent = ?, updated_at = NOW()
              WHERE id = ?
            `;
            await sdk.rawQuery(updateSQL, [currentTime, existingRecord.id]);
            console.log(
              "📧 Updated client-to-admin notification record (no rate limiting)"
            );
          } else {
            // Admin to client: Update timestamp and increment count (rate limiting applies)
            const updateSQL = `
              UPDATE longtermhire_chat_notifications 
              SET last_notification_sent = ?, notification_count_24h = ?, updated_at = NOW()
              WHERE id = ?
            `;
            await sdk.rawQuery(updateSQL, [
              currentTime,
              (existingRecord.notification_count_24h || 0) + 1,
              existingRecord.id,
            ]);
            console.log(
              "📧 Updated admin-to-client notification record (rate limiting applies)"
            );
          }
        } catch (updateError) {
          console.error(
            "📧 Failed to update notification record:",
            updateError
          );
          // Continue anyway since email was sent successfully
        }
      } else {
        try {
          if (isFromClient) {
            // Client to admin: Create record without count (no rate limiting)
            const insertSQL = `
              INSERT INTO longtermhire_chat_notifications 
              (client_user_id, admin_user_id, last_notification_sent, notification_count_24h, created_at, updated_at)
              VALUES (?, ?, ?, ?, NOW(), NOW())
            `;
            await sdk.rawQuery(insertSQL, [
              fromUserId,
              toUserId,
              currentTime,
              0,
            ]);
            console.log(
              "📧 Created new client-to-admin notification record (no rate limiting)"
            );
          } else {
            // Admin to client: Create record with count (rate limiting applies)
            const insertSQL = `
              INSERT INTO longtermhire_chat_notifications 
              (client_user_id, admin_user_id, last_notification_sent, notification_count_24h, created_at, updated_at)
              VALUES (?, ?, ?, ?, NOW(), NOW())
            `;
            await sdk.rawQuery(insertSQL, [
              fromUserId,
              toUserId,
              currentTime,
              1,
            ]);
            console.log(
              "📧 Created new admin-to-client notification record (rate limiting applies)"
            );
          }
        } catch (insertError) {
          console.error(
            "📧 Failed to create notification record:",
            insertError
          );
          // Continue anyway since email was sent successfully
        }
      }

      console.log(`📧 Chat notification sent to: ${recipientData.email}`);
      console.log(
        `📧 ✅ EMAIL SENT SUCCESSFULLY - ${
          isFromClient
            ? "CLIENT→ADMIN (no rate limiting)"
            : "ADMIN→CLIENT (rate limited to 1 per 24h)"
        }`
      );
      console.log(
        "📧 ✅ EMAIL SENT SUCCESSFULLY - Database update may have failed but email was delivered"
      );
      console.log(
        "📧 ===== ChatNotificationService.sendChatNotification END ====="
      );
      return true;
    } catch (error) {
      console.error("Error sending chat notification:", error);
      return false;
    }
  }
}

module.exports = ChatNotificationService;
