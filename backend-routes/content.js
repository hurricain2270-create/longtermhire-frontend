const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");

module.exports = function (app) {
  console.log("Loading content routes...");

  // Get all content with pagination and search
  app.get(
    "/v1/api/longtermhire/super_admin/content",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log("GET /v1/api/longtermhire/super_admin/content called");
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Extract query parameters for pagination and search
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const equipmentId = req.query.equipmentId || "";
        const equipmentName = req.query.equipmentName || "";
        const offset = (page - 1) * limit;

        // Build search conditions
        let searchConditions = [];
        let searchParams = [];

        if (equipmentId) {
          searchConditions.push("e.equipment_id = ?");
          searchParams.push(equipmentId);
        }
        if (equipmentName) {
          searchConditions.push("e.equipment_name LIKE ?");
          searchParams.push(`%${equipmentName}%`);
        }

        const whereClause =
          searchConditions.length > 0
            ? `WHERE ${searchConditions.join(" AND ")}`
            : "";

        // Get content with pagination and images
        const contentQuery = `
        SELECT 
          c.id,
          c.equipment_id as content_equipment_id,
          c.description,
          c.banner_description,
          c.image_url,
          c.user_id,
          c.created_at,
          c.updated_at,
          e.equipment_id,
          c.updated_at,
          e.equipment_id,
          e.equipment_name,
          e.specs_files,
          GROUP_CONCAT(
            CASE 
              WHEN ci.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', ci.id,
                  'image_url', ci.image_url,
                  'image_order', ci.image_order,
                  'is_main', ci.is_main,
                  'caption', ci.caption
                )
              ELSE NULL
            END ORDER BY ci.image_order ASC SEPARATOR '|||'
          ) as images
        FROM longtermhire_content c
        LEFT JOIN longtermhire_equipment_item e ON c.equipment_id = e.id
        LEFT JOIN longtermhire_content_images ci ON c.id = ci.content_id
        ${whereClause}
        GROUP BY c.id, e.id
        ORDER BY c.id DESC
        LIMIT ? OFFSET ?
      `;

        // Get total count for pagination
        const countQuery = `
        SELECT COUNT(*) as total
        FROM longtermhire_content c
        LEFT JOIN longtermhire_equipment_item e ON c.equipment_id = e.id
        ${whereClause}
      `;

        console.log("🔍 Executing content query with params:", [
          ...searchParams,
          limit,
          offset,
        ]);

        const content = await sdk.rawQuery(contentQuery, [
          ...searchParams,
          limit,
          offset,
        ]);

        console.log(
          "🔍 Raw database response:",
          JSON.stringify(content, null, 2)
        );
        const countResult = await sdk.rawQuery(countQuery, searchParams);
        const total = countResult[0]?.total || 0;

        // Process images data
        console.log(
          "🔍 Raw content data from database:",
          JSON.stringify(content, null, 2)
        );

        const processedContent = content.map((item) => {
          console.log(
            `📋 Processing content ID ${item.id}, raw images field:`,
            item.images
          );

          if (item.images && item.images !== "null" && item.images !== "NULL") {
            try {
              // Check if it's multiple images (contains separator) or single image
              if (item.images.includes("|||")) {
                // Multiple images - split by separator
                const imageStrings = item.images.split("|||");
                console.log(
                  `🔄 Multiple images found for content ${item.id}:`,
                  imageStrings
                );

                item.images = imageStrings
                  .map((imgStr) => {
                    try {
                      const parsed = JSON.parse(imgStr.trim());
                      console.log(
                        `✅ Parsed image for content ${item.id}:`,
                        parsed
                      );
                      return parsed;
                    } catch (e) {
                      console.log(
                        `❌ Failed to parse image string for content ${item.id}:`,
                        imgStr,
                        e.message
                      );
                      return null;
                    }
                  })
                  .filter(
                    (img) =>
                      img !== null && img.id !== null && img.image_url !== null
                  );

                console.log(
                  `🎯 Final images array for content ${item.id}:`,
                  item.images
                );
              } else {
                // Single image - parse directly
                const parsed = JSON.parse(item.images);
                item.images = [parsed];
                console.log(
                  `✅ Single image parsed for content ${item.id}:`,
                  item.images
                );
              }
            } catch (e) {
              console.log(
                `❌ Error processing images for content ${item.id}:`,
                e.message
              );
              item.images = [];
            }
          } else {
            console.log(
              `⚠️ No images data for content ${item.id} - images field is null/undefined/empty`
            );
            item.images = [];
          }
          return item;
        });

        return res.status(200).json({
          error: false,
          data: processedContent,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        });
      } catch (error) {
        console.error("Get content error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Get content by ID
  app.get(
    "/v1/api/longtermhire/super_admin/content/:id",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const contentId = req.params.id;

        const contentQuery = `
          SELECT 
            c.id,
            c.equipment_id as content_equipment_id,
            c.equipment_name,
            c.description,
            c.banner_description,
            c.image_url,
            c.user_id,
            c.created_at,
            c.updated_at,
            c.updated_at,
            e.equipment_id,
            e.specs_files,
            e.category_id,
            e.category_name,
            GROUP_CONCAT(
              CASE 
                WHEN ci.id IS NOT NULL THEN
                  JSON_OBJECT(
                    'id', ci.id,
                    'image_url', ci.image_url,
                    'image_order', ci.image_order,
                    'is_main', ci.is_main,
                    'caption', ci.caption
                  )
                ELSE NULL
              END ORDER BY ci.image_order ASC SEPARATOR '|||'
            ) as images
          FROM longtermhire_content c
          LEFT JOIN longtermhire_equipment_item e ON c.equipment_id = e.id
          LEFT JOIN longtermhire_content_images ci ON c.id = ci.content_id
          WHERE c.id = ?
          GROUP BY c.id, e.id
        `;

        const content = await sdk.rawQuery(contentQuery, [contentId]);

        if (!content || content.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Content not found",
          });
        }

        const item = content[0];

        // Parse images array if it exists
        if (item.images && item.images !== "null" && item.images !== "NULL") {
          try {
            if (item.images.includes("|||")) {
              const imageStrings = item.images.split("|||");
              item.images = imageStrings
                .map((imgStr) => {
                  try {
                    return JSON.parse(imgStr.trim());
                  } catch (e) {
                    return null;
                  }
                })
                .filter(
                  (img) =>
                    img !== null && img.id !== null && img.image_url !== null
                );
            } else {
              const parsed = JSON.parse(item.images);
              item.images = parsed ? [parsed] : [];
            }
          } catch (e) {
            console.error("Error parsing images for content:", item.id, e);
            item.images = [];
          }
        } else {
          item.images = [];
        }

        return res.status(200).json({
          error: false,
          data: item,
        });
      } catch (error) {
        console.error("Get content by ID error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Add content
  app.post(
    "/v1/api/longtermhire/super_admin/content",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log("POST /v1/api/longtermhire/super_admin/content called");
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const {
          equipment_id,
          equipment_name,
          description,
          banner_description,
          image_url, // Keep for backward compatibility
          images, // New field for multiple images array
        } = req.body;

        if (!equipment_id || !equipment_name) {
          return res.status(400).json({
            error: true,
            message: "Equipment ID and name are required",
          });
        }

        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // Get a valid user ID (use the first admin user)
        const userQuery = `SELECT id FROM longtermhire_user WHERE role_id = 'super_admin' LIMIT 1`;
        const userResult = await sdk.rawQuery(userQuery, []);
        const createdBy = userResult.length > 0 ? userResult[0].id : 1;

        // Insert content into database
        const insertSQL = `
        INSERT INTO longtermhire_content
        (equipment_id, equipment_name, description, banner_description, image_url, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

        const result = await sdk.rawQuery(insertSQL, [
          equipment_id,
          equipment_name,
          description || null,
          banner_description || null,
          image_url || null,
          createdBy,
          currentTime,
          currentTime,
        ]);

        const contentId = result.insertId;

        // Handle multiple images if provided
        if (images && Array.isArray(images) && images.length > 0) {
          console.log(
            "🔍 Processing images array:",
            JSON.stringify(images, null, 2)
          );

          // Limit to 5 images
          const limitedImages = images.slice(0, 5);

          for (let i = 0; i < limitedImages.length; i++) {
            const image = limitedImages[i];

            // If this image is marked as main, unset other main images first
            if (image.is_main) {
              const unsetMainSQL = `
                UPDATE longtermhire_content_images 
                SET is_main = FALSE 
                WHERE content_id = ?
              `;
              await sdk.rawQuery(unsetMainSQL, [contentId]);
            }

            const imageSQL = `
              INSERT INTO longtermhire_content_images
              (content_id, image_url, image_order, is_main, caption, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            await sdk.rawQuery(imageSQL, [
              contentId,
              image.url,
              i,
              image.is_main || i === 0, // First image is main by default
              image.caption || null,
              currentTime,
              currentTime,
            ]);
          }
        }

        return res.status(200).json({
          error: false,
          message: "Content created successfully",
          data: { id: result.insertId },
        });
      } catch (error) {
        console.error("Save content error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Get content by equipment ID
  app.get(
    "/v1/api/longtermhire/super_admin/content/:equipmentId",
    TokenMiddleware(),
    async (req, res) => {
      try {
        console.log(
          "GET /v1/api/longtermhire/super_admin/content/:equipmentId called"
        );

        // For now, return empty content
        return res.status(200).json({
          error: false,
          data: null,
        });
      } catch (error) {
        console.error("Get content by equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Update content
  app.put("/v1/api/longtermhire/super_admin/content/:id", async (req, res) => {
    try {
      console.log("PUT /v1/api/longtermhire/super_admin/content/:id called");
      const sdk = app.get("sdk");
      sdk.setProjectId("longtermhire");

      const {
        equipment_id,
        equipment_name,
        description,
        banner_description,

        image_url, // Keep for backward compatibility
        images, // New field for multiple images array
        specs_files, // New field for specs files
      } = req.body;
      const contentId = req.params.id;
      const currentTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // Check if content exists
      const checkSQL = "SELECT id FROM longtermhire_content WHERE id = ?";
      const contentExists = await sdk.rawQuery(checkSQL, [contentId]);

      if (!contentExists || contentExists.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Content not found",
        });
      }

      // Update content in database
      const updateSQL = `
          UPDATE longtermhire_content
          SET
            equipment_id = ?,
            equipment_name = ?,
            description = ?,
            banner_description = ?,
            image_url = ?,
            updated_at = ?
          WHERE id = ?
        `;

      await sdk.rawQuery(updateSQL, [
        equipment_id,
        equipment_name,
        description || null,
        banner_description || null,
        image_url || null,
        currentTime,
        contentId,
      ]);

      // Update specs_files in longtermhire_equipment_item if provided
      if (specs_files !== undefined) {
        const specsFilesValue = Array.isArray(specs_files)
          ? JSON.stringify(specs_files)
          : specs_files || null;
        const updateSpecsSQL = `
          UPDATE longtermhire_equipment_item
          SET specs_files = ?, updated_at = ?
          WHERE id = ?
        `;
        await sdk.rawQuery(updateSpecsSQL, [
          specsFilesValue,
          currentTime,
          equipment_id,
        ]);
      }

      // Handle multiple images if provided
      if (images && Array.isArray(images)) {
        // Delete existing images for this content
        const deleteImagesSQL =
          "DELETE FROM longtermhire_content_images WHERE content_id = ?";
        await sdk.rawQuery(deleteImagesSQL, [contentId]);

        // Add new images (limit to 5)
        if (images.length > 0) {
          const limitedImages = images.slice(0, 5);

          for (let i = 0; i < limitedImages.length; i++) {
            const image = limitedImages[i];

            // If this image is marked as main, unset other main images first
            if (image.is_main) {
              const unsetMainSQL = `
                 UPDATE longtermhire_content_images 
                 SET is_main = FALSE 
                 WHERE content_id = ?
               `;
              await sdk.rawQuery(unsetMainSQL, [contentId]);
            }

            const imageSQL = `
               INSERT INTO longtermhire_content_images
               (content_id, image_url, image_order, is_main, caption, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
             `;

            await sdk.rawQuery(imageSQL, [
              contentId,
              image.url,
              i,
              image.is_main || i === 0, // First image is main by default
              image.caption || null,
              currentTime,
              currentTime,
            ]);
          }
        }
      }

      return res.status(200).json({
        error: false,
        message: "Content updated successfully",
      });
    } catch (error) {
      console.error("Update content error:", error);
      return res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  });

  // Delete content
  app.delete(
    "/v1/api/longtermhire/super_admin/content/:contentId",
    async (req, res) => {
      try {
        console.log(
          "DELETE /v1/api/longtermhire/super_admin/content/:contentId called"
        );
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        const contentId = req.params.contentId;

        // Check if content exists
        const checkSQL = "SELECT id FROM longtermhire_content WHERE id = ?";
        const contentExists = await sdk.rawQuery(checkSQL, [contentId]);

        if (!contentExists || contentExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Content not found",
          });
        }

        // Delete the content
        await sdk.rawQuery("DELETE FROM longtermhire_content WHERE id = ?", [
          contentId,
        ]);

        return res.status(200).json({
          error: false,
          message: "Content deleted successfully",
        });
      } catch (error) {
        console.error("Delete content error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Add/Update content for equipment
  app.post(
    "/v1/api/longterm-hire/super_admin/content",
    TokenMiddleware,
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId(req.projectId);

        const {
          equipment_id,
          equipment_name,
          description,
          banner_description,
          image,
        } = req.body;

        if (!equipment_id || !equipment_name) {
          return res.status(400).json({
            error: true,
            message: "Equipment ID and name are required",
          });
        }

        sdk.setTable("content");

        // Check if content already exists for this equipment
        const existing = await sdk.get({ equipment_id: equipment_id });

        if (existing.length > 0) {
          // Update existing content
          await sdk.update(
            {
              equipment_name,
              description: description || null,
              banner_description: banner_description || null,
              image: image || null,
              user_id: req.user_id,
              updated_at: new Date(),
            },
            existing[0].id
          );

          return res.status(200).json({
            error: false,
            message: "Content updated successfully",
          });
        } else {
          // Create new content
          const result = await sdk.insert({
            equipment_id,
            equipment_name,
            description: description || null,
            banner_description: banner_description || null,
            image: image || null,
            user_id: req.user_id,
            created_at: new Date(),
            updated_at: new Date(),
          });

          return res.status(200).json({
            error: false,
            message: "Content created successfully",
            data: { id: result.insertId },
          });
        }
      } catch (error) {
        console.error("Add/Update content error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Get content by equipment ID
  app.get(
    "/v1/api/longterm-hire/super_admin/content/:equipment_id",
    TokenMiddleware,
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId(req.projectId);

        sdk.setTable("content");
        const content = await sdk.get({
          equipment_id: req.params.equipment_id,
        });

        return res.status(200).json({
          error: false,
          data: content.length > 0 ? content[0] : null,
        });
      } catch (error) {
        console.error("Get content by equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Delete content
  app.delete(
    "/v1/api/longterm-hire/super_admin/content/:id",
    TokenMiddleware,
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId(req.projectId);

        sdk.setTable("content");
        await sdk.delete({}, req.params.id);

        return res.status(200).json({
          error: false,
          message: "Content deleted successfully",
        });
      } catch (error) {
        console.error("Delete content error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Client route to get available equipment with content
  app.get(
    "/v1/api/longtermhire/member/equipment",
    TokenMiddleware(),
    RoleMiddleware(["member"]),
    async (req, res) => {
      try {
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        // Get equipment assigned to this client with content
        const equipment = await sdk.rawQuery(
          `
          SELECT e.*, c.description, c.banner_description, c.image
          FROM longtermhire_client_equipment ce
          JOIN longtermhire_equipment_item e ON ce.equipment_id = e.id
          LEFT JOIN longtermhire_content c ON e.equipment_id = c.equipment_id
          WHERE ce.client_user_id = ? AND e.availability = 1
          ORDER BY e.category_name, e.equipment_name
        `,
          [req.user_id]
        );

        return res.status(200).json({
          error: false,
          data: equipment,
        });
      } catch (error) {
        console.error("Get client equipment error:", error);
        return res.status(500).json({
          error: true,
          message: error.message,
        });
      }
    }
  );

  // Delete specific image from content
  app.delete(
    "/v1/api/longtermhire/super_admin/content/:contentId/images/:imageId",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const { contentId, imageId } = req.params;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log(`🗑️ Deleting image ${imageId} from content ${contentId}`);

        // 1. Verify content exists
        const contentCheckSQL =
          "SELECT id FROM longtermhire_content WHERE id = ?";
        const contentExists = await sdk.rawQuery(contentCheckSQL, [contentId]);

        if (!contentExists || contentExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Content not found",
          });
        }

        // 2. Verify image exists and belongs to this content
        const imageCheckSQL = `
          SELECT id, is_main 
          FROM longtermhire_content_images 
          WHERE id = ? AND content_id = ?
        `;
        const imageExists = await sdk.rawQuery(imageCheckSQL, [
          imageId,
          contentId,
        ]);

        if (!imageExists || imageExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Image not found or does not belong to this content",
          });
        }

        const wasMainImage = imageExists[0].is_main;

        // 3. Delete the specific image
        const deleteImageSQL =
          "DELETE FROM longtermhire_content_images WHERE id = ?";
        await sdk.rawQuery(deleteImageSQL, [imageId]);

        console.log(`✅ Image ${imageId} deleted successfully`);

        // 4. If it was the main image, set the first remaining image as main
        if (wasMainImage) {
          const remainingImagesSQL = `
            SELECT id 
            FROM longtermhire_content_images 
            WHERE content_id = ? 
            ORDER BY image_order ASC, id ASC 
            LIMIT 1
          `;
          const remainingImages = await sdk.rawQuery(remainingImagesSQL, [
            contentId,
          ]);

          if (remainingImages && remainingImages.length > 0) {
            const newMainImageId = remainingImages[0].id;
            const setNewMainSQL = `
              UPDATE longtermhire_content_images 
              SET is_main = TRUE 
              WHERE id = ?
            `;
            await sdk.rawQuery(setNewMainSQL, [newMainImageId]);
            console.log(`🔄 Set image ${newMainImageId} as new main image`);
          }
        }

        return res.status(200).json({
          error: false,
          message: "Image deleted successfully",
          data: {
            deleted_image_id: imageId,
            was_main_image: wasMainImage,
          },
        });
      } catch (error) {
        console.error("Delete image error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Set image as main
  app.put(
    "/v1/api/longtermhire/super_admin/content/:contentId/images/:imageId/main",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const { contentId, imageId } = req.params;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log(
          `🔄 Setting image ${imageId} as main for content ${contentId}`
        );

        // 1. Verify content exists
        const contentCheckSQL =
          "SELECT id FROM longtermhire_content WHERE id = ?";
        const contentExists = await sdk.rawQuery(contentCheckSQL, [contentId]);

        if (!contentExists || contentExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Content not found",
          });
        }

        // 2. Verify image exists and belongs to this content
        const imageCheckSQL = `
          SELECT id, is_main 
          FROM longtermhire_content_images 
          WHERE id = ? AND content_id = ?
        `;
        const imageExists = await sdk.rawQuery(imageCheckSQL, [
          imageId,
          contentId,
        ]);

        if (!imageExists || imageExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Image not found or does not belong to this content",
          });
        }

        // 3. Unset all other main images for this content
        const unsetMainSQL = `
          UPDATE longtermhire_content_images 
          SET is_main = FALSE 
          WHERE content_id = ?
        `;
        await sdk.rawQuery(unsetMainSQL, [contentId]);

        // 4. Set the specified image as main
        const setMainSQL = `
          UPDATE longtermhire_content_images 
          SET is_main = TRUE 
          WHERE id = ?
        `;
        await sdk.rawQuery(setMainSQL, [imageId]);

        console.log(`✅ Image ${imageId} set as main successfully`);

        return res.status(200).json({
          error: false,
          message: "Image set as main successfully",
          data: {
            image_id: imageId,
            content_id: contentId,
            is_main: true,
          },
        });
      } catch (error) {
        console.error("Set main image error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );

  // Reorder images
  app.put(
    "/v1/api/longtermhire/super_admin/content/:contentId/images/reorder",
    TokenMiddleware(),
    RoleMiddleware(["super_admin"]),
    async (req, res) => {
      try {
        const { contentId } = req.params;
        const { imageOrder } = req.body;
        const sdk = app.get("sdk");
        sdk.setProjectId("longtermhire");

        console.log(
          `🔄 Reordering images for content ${contentId}:`,
          imageOrder
        );

        if (!imageOrder || !Array.isArray(imageOrder)) {
          return res.status(400).json({
            error: true,
            message: "imageOrder array is required",
          });
        }

        // 1. Verify content exists
        const contentCheckSQL =
          "SELECT id FROM longtermhire_content WHERE id = ?";
        const contentExists = await sdk.rawQuery(contentCheckSQL, [contentId]);

        if (!contentExists || contentExists.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Content not found",
          });
        }

        // 2. Verify all images exist and belong to this content
        const imageCheckSQL = `
          SELECT id 
          FROM longtermhire_content_images 
          WHERE id IN (${imageOrder.map(() => "?").join(",")}) 
          AND content_id = ?
        `;
        const imageExists = await sdk.rawQuery(imageCheckSQL, [
          ...imageOrder,
          contentId,
        ]);

        if (imageExists.length !== imageOrder.length) {
          return res.status(400).json({
            error: true,
            message:
              "One or more images not found or do not belong to this content",
          });
        }

        // 3. Update image order for each image
        const currentTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        for (let i = 0; i < imageOrder.length; i++) {
          const imageId = imageOrder[i];
          const updateOrderSQL = `
            UPDATE longtermhire_content_images 
            SET image_order = ?, updated_at = ? 
            WHERE id = ?
          `;
          await sdk.rawQuery(updateOrderSQL, [i, currentTime, imageId]);
        }

        console.log(
          `✅ Images reordered successfully for content ${contentId}`
        );

        return res.status(200).json({
          error: false,
          message: "Images reordered successfully",
          data: {
            content_id: contentId,
            image_order: imageOrder,
          },
        });
      } catch (error) {
        console.error("Reorder images error:", error);
        return res.status(500).json({
          error: true,
          message: error.message || "Internal server error",
        });
      }
    }
  );
};
