import { UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary";

class CloudinaryService {
  static uploadBuffer(
    buffer: Buffer,
    options: {
      folder: string;
      resource_type?: "image" | "raw" | "video" | "auto";
      public_id?: string;
    },
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resource_type ?? "auto",
          public_id: options.public_id,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result) {
            return reject(new Error("Cloudinary upload returned no result"));
          }

          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  static async delete(publicId: string, resourceType: "image" | "raw" | "video" = "raw") {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}

export default CloudinaryService;
