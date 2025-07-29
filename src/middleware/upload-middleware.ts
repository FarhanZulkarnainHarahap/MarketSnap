import multer from "multer";
import path from "path";
import fs from "fs";

// Cek apakah sedang berjalan di Vercel (read-only file system)
const isVercel = process.env.VERCEL === "1";

// Tetapkan folder upload
const uploadPath = "./uploads";

// ✅ Hanya buat folder kalau **bukan di Vercel**
if (!isVercel && !fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (isVercel) {
      // ❌ Error saat dipakai di Vercel
      cb(
        new Error("File upload to local folder is not supported on Vercel"),
        ""
      );
    } else {
      cb(null, uploadPath);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });
