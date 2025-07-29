import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    return {
      folder: "Market-Snap",
      format: file.mimetype.split("/")[1], // contoh: jpg, png, webp
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    };
  },
});

export const upload = multer({ storage });
export default cloudinary;
