import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Uploads a buffer straight to Cloudinary — nothing touches the server disk,
 * so this works unchanged on a read-only filesystem.
 */
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export const uploadImages = asyncHandler(async (req, res) => {
  if (!env.cloudinary.enabled) {
    throw ApiError.badRequest(
      "Cloudinary is not configured. Add CLOUDINARY_* values to the server .env.",
    );
  }
  if (!req.files?.length) throw ApiError.badRequest("No files received");

  const uploaded = await Promise.all(
    req.files.map(async (file) => {
      const r = await uploadBuffer(file.buffer, env.cloudinary.folder);
      return {
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width,
        height: r.height,
      };
    }),
  );

  return ok(res, uploaded);
});

export const deleteImage = asyncHandler(async (req, res) => {
  if (!env.cloudinary.enabled) throw ApiError.badRequest("Cloudinary is not configured");
  await cloudinary.uploader.destroy(req.body.publicId);
  return ok(res, { ok: true });
});
