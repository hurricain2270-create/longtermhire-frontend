const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const chatService = require("../services/ChatService");
const ChatNotificationService = require("../services/ChatNotificationService");
const UploadService = require("../../../baas/services/UploadService");
const { getLocalPath } = require("../../../baas/services/UtilService");

module.exports = function (app) {
  console.log("Loading chat routes...");

  // Initialize ChatService
  chatService.initialize().catch((error) => {
    console.error("Failed to initialize ChatService:", error);
  });

  // Upload file for chat (images, PDFs, documents)
  app.post(
    "/v1/api/longtermhire/chat/upload",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    function (req, res, next) {
      // Determine upload method based on config
      const config = app.get("configuration");
      const uploadMiddleware = config.upload_type === "s3"
        ? UploadService.s3_upload().single("file")
        : UploadService.local_upload().single("file");

      uploadMiddleware(req, res, async function (err) {
        if (err) {
          console.error("File upload error:", err);
          return res.status(500).json({
            error: true,
            message: "File upload failed: " + err.message,
          });
        }

        try {
          if (!req.file) {
            return res.status(400).json({
              error: true,
              message: "No file uploaded",
            });
          }

          const sdk = app.get("sdk");
          sdk.setProjectId("longtermhire");

          // Get file URL based on upload type
          const fileUrl = config.upload_type === "s3"
            ? req.file.location
            : getLocalPath(req.file.path);

          // Determine message type based on MIME type
          let messageType = "file";
          if (req.file.mimetype.startsWith("image/")) {
            messageType = "image";
          } else if (req.file.mimetype === "application/pdf") {
            messageType = "pdf";
          }

          console.log("✅ Chat file uploaded:", {
            url: fileUrl,
            type: messageType,
            mimetype: req.file.mimetype,
            size: req.file.size,
            originalname: req.file.originalname,
          });

          return res.status(200).json({
            error: false,
            message: "File uploaded successfully",
            data: {
              url: fileUrl,
              type: messageType,
              mimetype: req.file.mimetype,
              size: req.file.size,
              filename: req.file.originalname,
            },
          });
        } catch (error) {
          console.error("Process upload error:", error);
          return res.status(500).json({
            error: true,
            message: error.message || "Internal server error",
          });
        }
      });
    }
  );

  // Set user as online
  app.post(
    "/v1/api/longtermhire/chat/online",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const userId = req.user_id;
        console.log(`🟢 Setting user ${userId} as online...`);
        await chatService.setUserOnline(userId);

        return res.status(200).json({
          error: false,
          message: "User marked as online",
        });
      } catch (error) {
        console.error("Set online error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Set user as offline
  app.post(
    "/v1/api/longtermhire/chat/offline",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const userId = req.user_id;
        await chatService.setUserOffline(userId);

        return res.status(200).json({
          error: false,
          message: "User marked as offline",
        });
      } catch (error) {
        console.error("Set offline error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Send heartbeat to maintain online status
  app.post(
    "/v1/api/longtermhire/chat/heartbeat",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const userId = req.user_id;
        await chatService.setUserOnline(userId);

        return res.status(200).json({
          error: false,
          message: "Heartbeat received",
        });
      } catch (error) {
        console.error("Heartbeat error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Check if any admin is online
  app.get(
    "/v1/api/longtermhire/chat/admin-status",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        console.log("🔍 Checking admin status...");
        const onlineUsers = await chatService.getOnlineUsers();
        console.log("📊 Online users:", onlineUsers);

        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get admin user IDs
        const adminSQL = `SELECT id FROM longtermhire_user WHERE role_id = 'super_admin'`;
        const admins = await sdk.rawQuery(adminSQL);
        const adminIds = admins.map((admin) => admin.id.toString());
        console.log("👥 Admin IDs:", adminIds);

        // Check if any admin is online (convert both to strings for comparison)
        console.log("🔍 Comparing online users with admin IDs:");
        onlineUsers.forEach((userId) => {
          const userIdStr = userId.toString();
          const isAdmin = adminIds.includes(userIdStr);
          console.log(
            `  User ${userId} (${typeof userId}) -> "${userIdStr}" in adminIds: ${isAdmin}`
          );
        });

        const onlineAdmins = onlineUsers.filter((userId) =>
          adminIds.includes(userId.toString())
        );
        const hasOnlineAdmin = onlineAdmins.length > 0;
        console.log("🟢 Online admins:", onlineAdmins);
        console.log("✅ Has online admin:", hasOnlineAdmin);

        return res.status(200).json({
          error: false,
          data: {
            has_online_admin: hasOnlineAdmin,
            online_admin_count: onlineAdmins.length,
            total_admin_count: adminIds.length,
          },
        });
      } catch (error) {
        console.error("Admin status check error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get chat conversations for a user
  app.get(
    "/v1/api/longtermhire/chat/conversations",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const userId = req.user_id;
        const userRole = req.role;

        console.log(
          `Getting conversations for user ${userId} with role ${userRole}`
        );

        let conversationsSQL;
        let params;

        if (userRole === "super_admin") {
          // Admin sees all conversations with unread count for messages TO admin
          conversationsSQL = `
            SELECT
              c.id,
              c.user1_id,
              c.user2_id,
              c.last_message_text,
              c.updated_at,
              COALESCE(cl1.client_name, cm1.member_name, u1.email) as user1_name,
              COALESCE(cl2.client_name, cm2.member_name, u2.email) as user2_name,
              CASE
                WHEN c.user1_id = ? THEN COALESCE(cl2.client_name, cm2.member_name, u2.email)
                ELSE COALESCE(cl1.client_name, cm1.member_name, u1.email)
              END as other_user_name,
              CASE
                WHEN c.user1_id = ? THEN c.user2_id
                ELSE c.user1_id
              END as other_user_id,
              (
                SELECT COUNT(*)
                FROM longtermhire_chat_messages m
                WHERE m.to_user_id = ?
                AND m.read_at IS NULL
                AND (
                  (m.from_user_id = c.user1_id AND m.to_user_id = c.user2_id) OR
                  (m.from_user_id = c.user2_id AND m.to_user_id = c.user1_id)
                )
              ) as unread_count
            FROM longtermhire_chat_conversations c
            LEFT JOIN longtermhire_user u1 ON c.user1_id = u1.id
            LEFT JOIN longtermhire_user u2 ON c.user2_id = u2.id
            LEFT JOIN longtermhire_client cl1 ON u1.id = cl1.user_id
            LEFT JOIN longtermhire_client cl2 ON u2.id = cl2.user_id
            LEFT JOIN longtermhire_company_member cm1 ON u1.id = cm1.user_id
            LEFT JOIN longtermhire_company_member cm2 ON u2.id = cm2.user_id
            WHERE c.user1_id = ? OR c.user2_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
          `;
          params = [userId, userId, userId, userId, userId];
        } else {
          // Client only sees conversations with admin
          conversationsSQL = `
            SELECT DISTINCT
              c.id,
              c.user1_id,
              c.user2_id,
              c.last_message_text,
              c.unread_count,
              c.updated_at,
              COALESCE(cl1.client_name, cm1.member_name, u1.email) as user1_name,
              COALESCE(cl2.client_name, cm2.member_name, u2.email) as user2_name,
              'Admin' as other_user_name,
              CASE
                WHEN c.user1_id = ? THEN c.user2_id
                ELSE c.user1_id
              END as other_user_id
            FROM longtermhire_chat_conversations c
            LEFT JOIN longtermhire_user u1 ON c.user1_id = u1.id
            LEFT JOIN longtermhire_user u2 ON c.user2_id = u2.id
            LEFT JOIN longtermhire_client cl1 ON u1.id = cl1.user_id
            LEFT JOIN longtermhire_client cl2 ON u2.id = cl2.user_id
            LEFT JOIN longtermhire_company_member cm1 ON u1.id = cm1.user_id
            LEFT JOIN longtermhire_company_member cm2 ON u2.id = cm2.user_id
            WHERE (c.user1_id = ? OR c.user2_id = ?)
            AND (u1.role_id = 'super_admin' OR u2.role_id = 'super_admin')
            ORDER BY c.updated_at DESC
          `;
          params = [userId, userId, userId];
        }

        const conversations = await sdk.rawQuery(conversationsSQL, params);

        return res.status(200).json({
          error: false,
          data: conversations || [],
        });
      } catch (error) {
        console.error("Get conversations error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get messages for a conversation
  app.get(
    "/v1/api/longtermhire/chat/messages/:conversationId",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { conversationId } = req.params;
        const { page = 1, limit = 30 } = req.query;
        const userId = req.user_id;
        const offset = (page - 1) * limit;

        // First get the conversation to verify access and get participants
        const conversationSQL = `
          SELECT user1_id, user2_id
          FROM longtermhire_chat_conversations
          WHERE id = ? AND (user1_id = ? OR user2_id = ?)
        `;

        const conversation = await sdk.rawQuery(conversationSQL, [
          conversationId,
          userId,
          userId,
        ]);

        if (!conversation || conversation.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Conversation not found or access denied",
          });
        }

        const { user1_id, user2_id } = conversation[0];

        // Get messages for the conversation with pagination (latest first, then reverse for WhatsApp style)
        const messagesSQL = `
          SELECT
            m.id,
            m.from_user_id,
            m.to_user_id,
            m.message,
            m.message_type,
            m.equipment_id,
            m.equipment_name,
            m.attachment_url,
            m.attachment_type,
            m.attachment_name,
            m.attachment_size,
            m.created_at,
            m.read_at,
            COALESCE(cl.client_name, cm.member_name, u.email) as from_user_name
          FROM longtermhire_chat_messages m
          LEFT JOIN longtermhire_user u ON m.from_user_id = u.id
          LEFT JOIN longtermhire_client cl ON u.id = cl.user_id
          LEFT JOIN longtermhire_company_member cm ON u.id = cm.user_id
          WHERE ((m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?))
          ORDER BY m.created_at DESC
          LIMIT ? OFFSET ?
        `;

        const messages = await sdk.rawQuery(messagesSQL, [
          user1_id,
          user2_id,
          user2_id,
          user1_id,
          parseInt(limit),
          parseInt(offset),
        ]);

        // Reverse to show oldest first (WhatsApp style)
        const reversedMessages = messages ? messages.reverse() : [];

        // Mark messages as read automatically ONLY for admin users
        if (req.role === "super_admin") {
          const markReadSQL = `
            UPDATE longtermhire_chat_messages
            SET read_at = NOW()
            WHERE to_user_id = ? AND read_at IS NULL
            AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
          `;
          await sdk.rawQuery(markReadSQL, [
            userId,
            user1_id,
            user2_id,
            user2_id,
            user1_id,
          ]);
        }

        // Get unread count for current user in this conversation
        const unreadCountSQL = `
          SELECT COUNT(*) as unread_count
          FROM longtermhire_chat_messages
          WHERE to_user_id = ? AND read_at IS NULL
          AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
        `;

        const unreadResult = await sdk.rawQuery(unreadCountSQL, [
          userId,
          user1_id,
          user2_id,
          user2_id,
          user1_id,
        ]);

        const unreadCount = unreadResult[0]?.unread_count || 0;

        return res.status(200).json({
          error: false,
          data: reversedMessages,
          unread_count: unreadCount,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            hasMore: messages && messages.length === parseInt(limit),
          },
        });
      } catch (error) {
        console.error("Get messages error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Send a chat message
  app.post(
    "/v1/api/longtermhire/chat/send",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const fromUserId = req.user_id;
        const {
          to_user_id,
          message,
          message_type = "text",
          attachment_url,
          attachment_type,
          attachment_name,
          attachment_size,
        } = req.body;

        if (!to_user_id || !message) {
          return res.status(400).json({
            error: true,
            message: "to_user_id and message are required",
          });
        }

        // Insert original message into database with attachment support
        const insertSQL = `
          INSERT INTO longtermhire_chat_messages
          (from_user_id, to_user_id, message, message_type, attachment_url, attachment_type, attachment_name, attachment_size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const result = await sdk.rawQuery(insertSQL, [
          fromUserId,
          to_user_id,
          message,
          message_type,
          attachment_url || null,
          attachment_type || null,
          attachment_name || null,
          attachment_size || null,
        ]);
        const messageId = result.insertId;

        // Log chat activity
        try {
          const chatActivitySQL = `
            INSERT INTO longtermhire_chat_activity_logs
            (user_id, activity_type, message_id, activity_time)
            VALUES (?, 'message_sent', ?, NOW())
          `;

          await sdk.rawQuery(chatActivitySQL, [fromUserId, messageId]);
        } catch (logError) {
          console.error("⚠️ Failed to log chat activity:", logError);
        }

        // Update or create conversation
        const upsertConversationSQL = `
          INSERT INTO longtermhire_chat_conversations 
          (user1_id, user2_id, last_message_id, last_message_text, updated_at)
          VALUES (LEAST(?, ?), GREATEST(?, ?), ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
          last_message_id = VALUES(last_message_id),
          last_message_text = VALUES(last_message_text),
          updated_at = VALUES(updated_at)
        `;

        await sdk.rawQuery(upsertConversationSQL, [
          fromUserId,
          to_user_id,
          fromUserId,
          to_user_id,
          messageId,
          message,
        ]);

        // Send real-time message via Redis
        await chatService.sendMessage(fromUserId, to_user_id, {
          id: messageId,
          message,
          message_type,
        });

        // Send email notification for both directions (admin->client and client->admin)
        try {
          console.log("🔍 ===== CHAT EMAIL NOTIFICATION START =====");
          console.log("🔍 fromUserId:", fromUserId, "to_user_id:", to_user_id);

          const senderRoleSQL = `SELECT role_id FROM longtermhire_user WHERE id = ?`;
          const senderRole = await sdk.rawQuery(senderRoleSQL, [fromUserId]);
          const isAdmin = senderRole[0]?.role_id === "super_admin";

          console.log("🔍 Sender role data:", senderRole);
          console.log("🔍 Is admin?", isAdmin);

          if (isAdmin) {
            // Admin messaging client - send notification to client
            console.log(
              "✅ Admin messaging client, sending notification to client..."
            );

            // Get client data for email notification
            const clientSQL = `
              SELECT u.email, c.client_name, c.company_name, c.phone
              FROM longtermhire_user u
              LEFT JOIN longtermhire_client c ON u.id = c.user_id
              WHERE u.id = ?
            `;
            const clientData = await sdk.rawQuery(clientSQL, [to_user_id]);
            console.log("🔍 Client data:", clientData);

            // Create admin data object
            const adminData = {
              email: "admin@longtermhire.com",
              first_name: "Admin",
              last_name: "Team",
            };
            console.log("🔍 Admin data:", adminData);

            if (clientData && clientData.length > 0) {
              console.log(
                "✅ All data found, sending notification to client..."
              );
              const config = app.get("configuration");
              const notificationService = new ChatNotificationService(config);

              const result = await notificationService.sendChatNotification(
                fromUserId, // admin user ID (sender)
                to_user_id, // client user ID (recipient)
                adminData, // admin data (sender)
                clientData[0], // client data (recipient)
                sdk,
                message, // message text
                message_type // message type
              );
              console.log("📧 Client notification result:", result);
            } else {
              console.log(
                "❌ Missing client data - Client data length:",
                clientData?.length
              );
            }
          } else {
            // Client messaging admin - send notification to admin
            console.log(
              "✅ Client messaging admin, sending notification to admin..."
            );

            // Get admin data for email notification
            const adminSQL = `
              SELECT u.email, u.id
              FROM longtermhire_user u
              WHERE u.id = ? AND u.role_id = 'super_admin'
            `;
            const adminResult = await sdk.rawQuery(adminSQL, [to_user_id]);
            console.log("🔍 Admin data:", adminResult);

            // Get client data
            const clientSQL = `
              SELECT u.email, c.client_name, c.company_name, c.phone
              FROM longtermhire_user u
              LEFT JOIN longtermhire_client c ON u.id = c.user_id
              WHERE u.id = ?
            `;
            const clientData = await sdk.rawQuery(clientSQL, [fromUserId]);
            console.log("🔍 Client data:", clientData);

            if (
              adminResult &&
              adminResult.length > 0 &&
              clientData &&
              clientData.length > 0
            ) {
              console.log(
                "✅ All data found, sending notification to admin..."
              );
              const config = app.get("configuration");
              const notificationService = new ChatNotificationService(config);

              // For client->admin, notify admin about client's message
              const result = await notificationService.sendChatNotification(
                fromUserId, // client user ID (sender)
                to_user_id, // admin user ID (recipient)
                { ...clientData[0], is_client: true }, // client data (sender) with is_client flag
                {
                  email: adminResult[0].email,
                  first_name: "Admin",
                  last_name: "Team",
                }, // admin data (recipient)
                sdk,
                message, // message text
                message_type // message type
              );
              console.log("📧 Admin notification result:", result);
            } else {
              console.log(
                "❌ Missing data - Admin data length:",
                adminResult?.length,
                "Client data length:",
                clientData?.length
              );
            }
          }
        } catch (notificationError) {
          console.error(
            "⚠️ Failed to send chat notification email:",
            notificationError
          );
          // Don't fail the message send if notification fails
        }

        console.log("🔍 ===== CHAT EMAIL NOTIFICATION END =====");

        return res.status(200).json({
          error: false,
          message: "Message sent successfully",
          data: {
            id: messageId,
          },
        });
      } catch (error) {
        console.error("Send message error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Send equipment request
  app.post(
    "/v1/api/longtermhire/chat/equipment-request",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const clientId = req.user_id;
        const { equipment_id, equipment_name, message } = req.body;

        if (!equipment_id || !equipment_name) {
          return res.status(400).json({
            error: true,
            message: "equipment_id and equipment_name are required",
          });
        }

        // Check if client has existing conversation with any admin
        const existingConversationSQL = `
          SELECT
            c.user1_id,
            c.user2_id,
            CASE
              WHEN c.user1_id = ? THEN c.user2_id
              ELSE c.user1_id
            END as admin_id
          FROM longtermhire_chat_conversations c
          JOIN longtermhire_user u ON (
            (c.user1_id = u.id AND c.user2_id = ?) OR
            (c.user2_id = u.id AND c.user1_id = ?)
          )
          WHERE u.role_id = 'super_admin'
          LIMIT 1
        `;

        const existingConversation = await sdk.rawQuery(
          existingConversationSQL,
          [clientId, clientId, clientId]
        );

        let adminId;

        if (existingConversation && existingConversation.length > 0) {
          // Use admin from existing conversation
          adminId = existingConversation[0].admin_id;
        } else {
          // No existing conversation, get any admin
          const adminSQL = `SELECT id FROM longtermhire_user WHERE role_id = 'super_admin' LIMIT 1`;
          const adminResult = await sdk.rawQuery(adminSQL);

          if (!adminResult || adminResult.length === 0) {
            return res.status(404).json({
              error: true,
              message: "Admin not found",
            });
          }

          adminId = adminResult[0].id;
        }
        const requestMessage =
          message ||
          `I would like to request the ${equipment_name} (ID: ${equipment_id}).`;

        // Insert chat message
        const insertMessageSQL = `
          INSERT INTO longtermhire_chat_messages 
          (from_user_id, to_user_id, message, message_type, equipment_id, equipment_name, created_at)
          VALUES (?, ?, ?, 'equipment_request', ?, ?, NOW())
        `;

        const messageResult = await sdk.rawQuery(insertMessageSQL, [
          clientId,
          adminId,
          requestMessage,
          equipment_id,
          equipment_name,
        ]);
        const messageId = messageResult.insertId;

        // Log the equipment request
        const insertRequestSQL = `
          INSERT INTO longtermhire_equipment_requests 
          (client_id, equipment_id, message_id, status, request_date)
          VALUES (?, ?, ?, 'pending', NOW())
        `;

        await sdk.rawQuery(insertRequestSQL, [
          clientId,
          equipment_id,
          messageId,
        ]);

        // Update or create conversation (use same logic as regular chat)
        const upsertConversationSQL = `
          INSERT INTO longtermhire_chat_conversations
          (user1_id, user2_id, last_message_id, last_message_text, updated_at)
          VALUES (LEAST(?, ?), GREATEST(?, ?), ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
          last_message_id = VALUES(last_message_id),
          last_message_text = VALUES(last_message_text),
          updated_at = VALUES(updated_at)
        `;

        await sdk.rawQuery(upsertConversationSQL, [
          clientId,
          adminId,
          clientId,
          adminId,
          messageId,
          requestMessage,
        ]);

        // Send real-time equipment request via Redis
        await chatService.sendEquipmentRequest(
          clientId,
          adminId,
          {
            equipment_id,
            equipment_name,
          },
          messageId
        );

        // Log equipment request activity
        try {
          const equipmentActivitySQL = `
            INSERT INTO longtermhire_chat_activity_logs
            (user_id, activity_type, message_id, equipment_id, activity_time)
            VALUES (?, 'equipment_request', ?, ?, NOW())
          `;

          await sdk.rawQuery(equipmentActivitySQL, [
            clientId,
            messageId,
            equipment_id,
          ]);
        } catch (logError) {
          console.error(
            "⚠️ Failed to log equipment request activity:",
            logError
          );
        }

        console.log(
          `✅ Equipment request sent: Client ${clientId} requested equipment ${equipment_id}`
        );

        return res.status(200).json({
          error: false,
          message: "Equipment request sent successfully",
          data: {
            message_id: messageId,
            request_status: "pending",
          },
        });
      } catch (error) {
        console.error("Equipment request error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get all clients (for admin to start conversations)
  app.get(
    "/v1/api/longtermhire/chat/clients",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get all clients with their details (only users who have client profiles)
        const clientsSQL = `
          SELECT DISTINCT
            u.id as user_id,
            u.email,
            COALESCE(cl.client_name, u.email) as name,
            cl.company_name,
            cl.phone,
            u.created_at,
            CASE
              WHEN conv.id IS NOT NULL THEN 1
              ELSE 0
            END as has_conversation
          FROM longtermhire_user u
          INNER JOIN longtermhire_client cl ON u.id = cl.user_id
          LEFT JOIN longtermhire_chat_conversations conv ON
            (conv.user1_id = u.id OR conv.user2_id = u.id)
          WHERE u.role_id = 'member' AND cl.id IS NOT NULL
          ORDER BY cl.client_name ASC, u.email ASC
        `;

        const clients = await sdk.rawQuery(clientsSQL);

        return res.status(200).json({
          error: false,
          data: clients || [],
        });
      } catch (error) {
        console.error("Get clients error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Start a new conversation (admin with client)
  app.post(
    "/v1/api/longtermhire/chat/start-conversation",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const adminId = req.user_id;
        const { client_id, initial_message } = req.body;

        if (!client_id) {
          return res.status(400).json({
            error: true,
            message: "Client ID is required",
          });
        }

        // Verify client exists
        const clientCheckSQL = `
          SELECT id FROM longtermhire_user
          WHERE id = ? AND role_id = 'member'
        `;

        const clientExists = await sdk.rawQuery(clientCheckSQL, [client_id]);

        if (!clientExists || clientExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        // Check if conversation already exists (using LEAST/GREATEST for consistency)
        const existingConversationSQL = `
          SELECT id FROM longtermhire_chat_conversations
          WHERE user1_id = LEAST(?, ?) AND user2_id = GREATEST(?, ?)
        `;

        const existingConversation = await sdk.rawQuery(
          existingConversationSQL,
          [adminId, client_id, adminId, client_id]
        );

        let conversationId;

        if (existingConversation && existingConversation.length > 0) {
          conversationId = existingConversation[0].id;
        } else {
          // Create new conversation using LEAST/GREATEST for consistency
          const insertConversationSQL = `
            INSERT INTO longtermhire_chat_conversations
            (user1_id, user2_id, last_message_text, updated_at)
            VALUES (LEAST(?, ?), GREATEST(?, ?), ?, NOW())
          `;

          const conversationResult = await sdk.rawQuery(insertConversationSQL, [
            adminId,
            client_id,
            adminId,
            client_id,
            initial_message || "Conversation started",
          ]);

          conversationId = conversationResult.insertId;
        }

        // Send initial message if provided
        if (initial_message) {
          const insertMessageSQL = `
            INSERT INTO longtermhire_chat_messages
            (from_user_id, to_user_id, message, created_at)
            VALUES (?, ?, ?, NOW())
          `;

          const messageResult = await sdk.rawQuery(insertMessageSQL, [
            adminId,
            client_id,
            initial_message,
          ]);

          // Update conversation with the message
          const updateConversationSQL = `
            UPDATE longtermhire_chat_conversations
            SET last_message_id = ?, last_message_text = ?, updated_at = NOW()
            WHERE id = ?
          `;

          await sdk.rawQuery(updateConversationSQL, [
            messageResult.insertId,
            initial_message,
            conversationId,
          ]);
        }

        return res.status(200).json({
          error: false,
          message: "Conversation started successfully",
          data: {
            conversation_id: conversationId,
          },
        });
      } catch (error) {
        console.error("Start conversation error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get dashboard statistics (for admin dashboard)
  app.get(
    "/v1/api/longtermhire/dashboard/stats",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get recent equipment requests (last 7 days)
        const recentRequestsSQL = `
          SELECT
            er.id,
            er.client_id,
            COALESCE(cl.client_name, u.email) as client_name,
            er.equipment_id,
            er.status,
            er.request_date
          FROM longtermhire_equipment_requests er
          LEFT JOIN longtermhire_user u ON er.client_id = u.id
          LEFT JOIN longtermhire_client cl ON u.id = cl.user_id
          WHERE er.request_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY er.request_date DESC
          LIMIT 10
        `;

        // Get recent chat activity (last 7 days)
        const recentChatSQL = `
          SELECT
            cal.user_id,
            COALESCE(cl.client_name, u.email) as user_name,
            cal.activity_type,
            cal.equipment_id,
            cal.activity_time
          FROM longtermhire_chat_activity_logs cal
          LEFT JOIN longtermhire_user u ON cal.user_id = u.id
          LEFT JOIN longtermhire_client cl ON u.id = cl.user_id
          WHERE cal.activity_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND cal.activity_type IN ('message_sent', 'equipment_request')
          ORDER BY cal.activity_time DESC
          LIMIT 10
        `;

        // Get recent client logins (last 7 days)
        const recentLoginsSQL = `
          SELECT
            cll.client_id,
            COALESCE(cl.client_name, u.email) as client_name,
            cll.login_time,
            cll.ip_address,
            cll.user_agent
          FROM longtermhire_client_login_logs cll
          LEFT JOIN longtermhire_user u ON cll.client_id = u.id
          LEFT JOIN longtermhire_client cl ON u.id = cl.user_id
          WHERE cll.login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY cll.login_time DESC
          LIMIT 10
        `;

        // Get statistics counts
        // Note: recent_messages only counts unread messages FROM clients TO admins (admin dashboard perspective)
        const statsSQL = `
          SELECT
            (SELECT COUNT(*) FROM longtermhire_company) as total_companies,
            (SELECT COUNT(*) FROM longtermhire_user WHERE role_id = 'member') as total_clients,
            (SELECT COUNT(*) FROM longtermhire_equipment_item) as total_equipment,
            (SELECT COUNT(*) FROM longtermhire_chat_messages m
             JOIN longtermhire_user u ON m.from_user_id = u.id
             WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
             AND m.read_at IS NULL 
             AND u.role_id = 'member') as recent_messages,
            (SELECT COUNT(*) FROM longtermhire_equipment_requests WHERE status = 'pending') as pending_requests,
            (SELECT COUNT(*) FROM longtermhire_client_login_logs WHERE login_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as logins_today,
            (SELECT COUNT(*) FROM longtermhire_client_login_logs WHERE login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as logins_this_week
        `;

        // Execute all queries
        const [recentRequests, recentChat, recentLogins, stats] =
          await Promise.all([
            sdk.rawQuery(recentRequestsSQL),
            sdk.rawQuery(recentChatSQL),
            sdk.rawQuery(recentLoginsSQL),
            sdk.rawQuery(statsSQL),
          ]);

        return res.status(200).json({
          error: false,
          data: {
            stats: stats[0] || {},
            recent_requests: recentRequests || [],
            recent_chat_activity: recentChat || [],
            recent_client_logins: recentLogins || [],
          },
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Clear activity logs
  app.delete(
    "/v1/api/longtermhire/dashboard/logs",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log("🧹 Clearing activity logs...");

        // Clear only activity logs and statistics, NOT actual data
        const clearQueries = [
          // Clear chat activity logs (statistics only)
          "DELETE FROM longtermhire_chat_activity_logs",

          // Clear client login logs (statistics only)
          "DELETE FROM longtermhire_client_login_logs",

          // Clear equipment requests (these are just requests, not actual data)
          "DELETE FROM longtermhire_equipment_requests",
        ];

        // Execute queries one by one with error handling
        const results = [];
        for (const query of clearQueries) {
          try {
            console.log(`Executing: ${query}`);
            const result = await sdk.rawQuery(query);
            results.push({
              query,
              success: true,
              affectedRows: result.affectedRows || 0,
            });
            console.log(
              `✅ Query executed successfully, affected rows: ${result.affectedRows || 0
              }`
            );
          } catch (queryError) {
            console.warn(`⚠️ Query failed: ${query}`, queryError.message);
            results.push({ query, success: false, error: queryError.message });
          }
        }

        const successfulQueries = results.filter((r) => r.success).length;
        const totalAffectedRows = results
          .filter((r) => r.success)
          .reduce((sum, r) => sum + (r.affectedRows || 0), 0);

        console.log(
          `🧹 Clear logs completed: ${successfulQueries}/${clearQueries.length} queries successful, ${totalAffectedRows} rows affected`
        );

        return res.status(200).json({
          error: false,
          message: "Activity logs cleared successfully",
          data: {
            successful_queries: successfulQueries,
            total_queries: clearQueries.length,
            affected_rows: totalAffectedRows,
            results: results,
          },
        });
      } catch (error) {
        console.error("Clear logs error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Mark messages as read
  app.put(
    "/v1/api/longtermhire/dashboard/messages/read",
    TokenMiddleware(),
    RoleMiddleware(["super_admin", "member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { messageIds } = req.body;

        if (
          !messageIds ||
          !Array.isArray(messageIds) ||
          messageIds.length === 0
        ) {
          return res.status(400).json({
            error: true,
            message: "messageIds array is required",
          });
        }

        // Mark messages as read
        const placeholders = messageIds.map(() => "?").join(",");
        const updateSQL = `
          UPDATE longtermhire_chat_messages
          SET read_at = NOW()
          WHERE id IN (${placeholders}) AND read_at IS NULL
        `;

        await sdk.rawQuery(updateSQL, messageIds);

        return res.status(200).json({
          error: false,
          message: "Messages marked as read successfully",
        });
      } catch (error) {
        console.error("Mark messages as read error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get client online status (Admin only)
  app.get(
    "/v1/api/longtermhire/chat/client-status",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get all clients
        const clientsQuery = `
          SELECT 
            u.id,
            u.email,
            u.created_at
          FROM longtermhire_user u
          WHERE u.role_id = 'member'
          ORDER BY u.email
        `;

        const clients = await sdk.rawQuery(clientsQuery);

        // Get online users
        const onlineUsers = await chatService.getOnlineUsers();
        const onlineUsersStr = onlineUsers.map((id) => id.toString());
        console.log("🔍 Online users from ChatService:", onlineUsers);
        console.log("🔍 Online users (strings):", onlineUsersStr);
        console.log(
          "🔍 Client IDs:",
          clients.map((c) => c.id)
        );

        // Combine client data with online status
        const clientsWithStatus = clients.map((client) => {
          const clientIdStr = client.id.toString();
          const isOnline = onlineUsersStr.includes(clientIdStr);
          console.log(
            `🔍 Client ${clientIdStr} (${client.email}) online status: ${isOnline}`
          );

          return {
            id: client.id,
            email: client.email,
            full_name: client.email, // Use email as display name since no first/last name
            created_at: client.created_at,
            is_online: isOnline,
            last_seen: null, // Could be enhanced with last activity tracking
          };
        });

        return res.status(200).json({
          error: false,
          data: {
            clients: clientsWithStatus,
            total_clients: clientsWithStatus.length,
            online_clients: clientsWithStatus.filter(
              (client) => client.is_online
            ).length,
            offline_clients: clientsWithStatus.filter(
              (client) => !client.is_online
            ).length,
          },
          message: "Client status retrieved successfully",
        });
      } catch (error) {
        console.error("Get client status error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Get specific client online status
  app.get(
    "/v1/api/longtermhire/chat/client-status/:clientId",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const { clientId } = req.params;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get specific client
        const clientQuery = `
          SELECT 
            u.id,
            u.email,
            u.created_at
          FROM longtermhire_user u
          WHERE u.id = ? AND u.role_id = 'member'
        `;

        const clients = await sdk.rawQuery(clientQuery, [clientId]);

        if (!clients || clients.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Client not found",
          });
        }

        const client = clients[0];

        // Get online users
        const onlineUsers = await chatService.getOnlineUsers();
        const onlineUsersStr = onlineUsers.map((id) => id.toString());
        console.log("🔍 Online users from ChatService (single):", onlineUsers);
        console.log("🔍 Online users (strings):", onlineUsersStr);
        console.log("🔍 Client ID:", client.id);

        // Check if client is online
        const clientIdStr = client.id.toString();
        const isOnline = onlineUsersStr.includes(clientIdStr);
        console.log(
          `🔍 Client ${clientIdStr} (${client.email}) online status: ${isOnline}`
        );

        return res.status(200).json({
          error: false,
          data: {
            id: client.id,
            email: client.email,
            full_name: client.email, // Use email as display name since no first/last name
            created_at: client.created_at,
            is_online: isOnline,
            last_seen: null, // Could be enhanced with last activity tracking
          },
          message: "Client status retrieved successfully",
        });
      } catch (error) {
        console.error("Get client status error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // ==================== V2 UNREAD MESSAGE TRACKING ====================

  /**
   * Get unread message count for admin
   * GET /v1/api/longtermhire/super_admin/chat/unread-count
   */
  app.get(
    "/v1/api/longtermhire/super_admin/chat/unread-count",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get unread count by conversation
        const unreadQuery = `
          SELECT
            c.id as conversation_id,
            c.client_user_id,
            cl.client_name,
            cl.company_name,
            COUNT(m.id) as unread_count
          FROM longtermhire_chat_conversations c
          LEFT JOIN longtermhire_client cl ON cl.user_id = c.client_user_id
          LEFT JOIN longtermhire_chat_messages m ON m.conversation_id = c.id
            AND m.is_read_by_admin = FALSE
            AND m.sender_id = c.client_user_id
          GROUP BY c.id, c.client_user_id, cl.client_name, cl.company_name
          HAVING unread_count > 0
          ORDER BY unread_count DESC
        `;

        const unreadByConversation = await sdk.rawQuery(unreadQuery);

        // Calculate total unread
        const totalUnread = (unreadByConversation || []).reduce(
          (sum, conv) => sum + (parseInt(conv.unread_count) || 0),
          0
        );

        return res.status(200).json({
          error: false,
          data: {
            unread_by_conversation: unreadByConversation || [],
            total_unread: totalUnread
          }
        });

      } catch (error) {
        console.error("Get unread count error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to get unread count"
        });
      }
    }
  );

  /**
   * Mark messages as read
   * PUT /v1/api/longtermhire/super_admin/chat/mark-read
   */
  app.put(
    "/v1/api/longtermhire/super_admin/chat/mark-read",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { conversation_id, message_ids } = req.body;

        if (!conversation_id) {
          return res.status(400).json({
            error: true,
            message: "Conversation ID is required"
          });
        }

        let markReadQuery;
        let params;

        if (message_ids && Array.isArray(message_ids) && message_ids.length > 0) {
          // Mark specific messages as read
          markReadQuery = `
            UPDATE longtermhire_chat_messages
            SET is_read_by_admin = TRUE
            WHERE conversation_id = ?
              AND id IN (${message_ids.join(',')})
              AND is_read_by_admin = FALSE
          `;
          params = [conversation_id];
        } else {
          // Mark all messages in conversation as read
          markReadQuery = `
            UPDATE longtermhire_chat_messages
            SET is_read_by_admin = TRUE
            WHERE conversation_id = ?
              AND is_read_by_admin = FALSE
          `;
          params = [conversation_id];
        }

        await sdk.rawQuery(markReadQuery, params);

        return res.status(200).json({
          error: false,
          message: "Messages marked as read successfully"
        });

      } catch (error) {
        console.error("Mark messages as read error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to mark messages as read"
        });
      }
    }
  );

  /**
   * Get unread status for specific conversation
   * GET /v1/api/longtermhire/super_admin/chat/conversation/:conversationId/unread
   */
  app.get(
    "/v1/api/longtermhire/super_admin/chat/conversation/:conversationId/unread",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const { conversationId } = req.params;

        // Get unread message IDs
        const unreadQuery = `
          SELECT id, created_at, message_type
          FROM longtermhire_chat_messages
          WHERE conversation_id = ?
            AND is_read_by_admin = FALSE
          ORDER BY created_at ASC
        `;

        const unreadMessages = await sdk.rawQuery(unreadQuery, [conversationId]);

        return res.status(200).json({
          error: false,
          data: {
            conversation_id: parseInt(conversationId),
            unread_count: unreadMessages ? unreadMessages.length : 0,
            unread_message_ids: unreadMessages ? unreadMessages.map(m => m.id) : []
          }
        });

      } catch (error) {
        console.error("Get conversation unread status error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Failed to get unread status"
        });
      }
    }
  );
};
