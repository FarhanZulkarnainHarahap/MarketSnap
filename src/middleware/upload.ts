// upload.ts
import express from "express";

import { Request, Response } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary-config.js";
import { UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
import path from "path";

const router = express.Router();

const storage = multer.memoryStorage();
export const upload = multer({ storage });

interface MulterRequest extends Request {
  file: Express.Multer.File;
}
router.post(
  "/upload",
  upload.single("paymentProof"),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const data = JSON.parse(req.body.data);
      const fileBuffer = req.file.buffer;

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "upload-payment-proof" },
        (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ error: "Upload failed", details: error });
          }

          res.json({
            message: "Uploaded successfully",
            imageUrl: result?.secure_url,
            data,
          });
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
