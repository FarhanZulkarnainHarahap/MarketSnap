// upload.ts
import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary-config.js";
import { UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
import path from "path";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("paymentProof"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const data = JSON.parse(req.body.data);

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "upload-payment-proof" },
        (error, result) => {
          if (error || !result) return reject(error);
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
