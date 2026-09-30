import multer from "multer";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ATTACHMENTS = 10;

const mailgunUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: MAX_ATTACHMENTS,
    fileSize: MAX_ATTACHMENT_SIZE,
  },

  fileFilter: (_req, file, callback) => {
    if (!file.fieldname.startsWith("attachment-")) {
      return callback(new Error("Invalid Mailgun attachment field"));
    }

    callback(null, true);
  },
});

export default mailgunUpload;
