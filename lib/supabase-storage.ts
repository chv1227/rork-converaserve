import { getSupabaseClient } from "./supabase-auth";
import { Platform } from "react-native";
import { PickedImage } from "./image-picker";

const BUCKET_NAME = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function ensureBucketExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      });
      
      if (error && !error.message.includes("already exists")) {
        console.error("Failed to create bucket:", error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error checking/creating bucket:", error);
    return true;
  }
}

function generateFileName(userId: string, mimeType?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = mimeType?.split("/")[1] || "jpg";
  return `${userId}/${timestamp}-${random}.${extension}`;
}

async function base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export async function uploadProfileImage(
  userId: string,
  image: PickedImage
): Promise<UploadResult> {
  console.log("Storage: Starting profile image upload for user:", userId);

  try {
    await ensureBucketExists();

    const supabase = getSupabaseClient();
    const mimeType = image.mimeType || "image/jpeg";
    const fileName = generateFileName(userId, mimeType);

    if (image.fileSize && image.fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Image is too large. Maximum size is 5MB.",
      };
    }

    let uploadData: Blob | FormData;

    if (image.base64) {
      console.log("Storage: Uploading from base64 data");
      uploadData = await base64ToBlob(image.base64, mimeType);
    } else if (Platform.OS === "web") {
      console.log("Storage: Fetching image from URI for web");
      const response = await fetch(image.uri);
      uploadData = await response.blob();
    } else {
      console.log("Storage: Uploading from URI for native");
      const response = await fetch(image.uri);
      const blob = await response.blob();
      uploadData = blob;
    }

    console.log("Storage: Uploading to Supabase Storage...");
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, uploadData, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Storage: Upload error:", error);
      return {
        success: false,
        error: error.message || "Failed to upload image",
      };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log("Storage: Upload successful, URL:", urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Storage: Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
}

export async function deleteProfileImage(imageUrl: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      console.log("Storage: Invalid image URL format");
      return false;
    }
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Storage: Delete error:", error);
      return false;
    }

    console.log("Storage: Image deleted successfully");
    return true;
  } catch (error) {
    console.error("Storage: Delete error:", error);
    return false;
  }
}
