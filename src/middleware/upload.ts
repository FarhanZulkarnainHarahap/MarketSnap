import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary-config.js";
import { UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("paymentProof"), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "upload-payment-proof" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    res.json({
      message: "Uploaded successfully",
      imageUrl: result.secure_url,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
