import * as ImagePicker from "expo-image-picker";
import { Platform, Alert, Linking } from "react-native";
import { supabase } from "@/lib/supabase";
import { decode } from 'base64-arraybuffer';

export interface PickedImage {
  uri: string;
  base64?: string | null;
  width: number;
  height: number;
  mimeType?: string;
  fileName?: string | null;
  fileSize?: number;
}

export interface ImagePickerResult {
  success: boolean;
  image?: PickedImage;
  error?: string;
  permissionDenied?: boolean;
}

const showAlert = (title: string, message: string, onOpenSettings?: () => void) => {
  if (Platform.OS === "web") {
    alert(`${title}: ${message}`);
  } else {
    const buttons: { text: string; style?: "cancel" | "default"; onPress?: () => void }[] = [
      { text: "OK", style: "cancel" },
    ];
    if (onOpenSettings) {
      buttons.push({ text: "Open Settings", onPress: onOpenSettings });
    }
    Alert.alert(title, message, buttons);
  }
};

const openAppSettings = () => {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else if (Platform.OS === "android") {
    Linking.openSettings();
  }
};

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return true;
  }

  const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
  
  if (status === ImagePicker.PermissionStatus.GRANTED) {
    return true;
  }

  if (status === ImagePicker.PermissionStatus.DENIED && !canAskAgain) {
    showAlert(
      "Camera Access Required",
      "Please enable camera access in your device settings to take photos.",
      openAppSettings
    );
    return false;
  }

  const result = await ImagePicker.requestCameraPermissionsAsync();
  
  if (result.status !== ImagePicker.PermissionStatus.GRANTED) {
    showAlert(
      "Camera Access Denied",
      "Camera permission is required to take photos. Please enable it in settings.",
      result.canAskAgain ? undefined : openAppSettings
    );
    return false;
  }

  return true;
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return true;
  }

  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
  
  if (status === ImagePicker.PermissionStatus.GRANTED) {
    return true;
  }

  if (status === ImagePicker.PermissionStatus.DENIED && !canAskAgain) {
    showAlert(
      "Photo Library Access Required",
      "Please enable photo library access in your device settings to select photos.",
      openAppSettings
    );
    return false;
  }

  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (result.status !== ImagePicker.PermissionStatus.GRANTED) {
    showAlert(
      "Photo Library Access Denied",
      "Photo library permission is required to select photos. Please enable it in settings.",
      result.canAskAgain ? undefined : openAppSettings
    );
    return false;
  }

  return true;
}

export async function pickImageFromCamera(): Promise<ImagePickerResult> {
  console.log("ImagePicker: Launching camera...");

  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    return { success: false, error: "Camera permission denied", permissionDenied: true };
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      console.log("ImagePicker: Camera capture canceled");
      return { success: false, error: "Canceled" };
    }

    const asset = result.assets[0];
    console.log("ImagePicker: Image captured successfully", asset.uri);

    return {
      success: true,
      image: {
        uri: asset.uri,
        base64: asset.base64,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      },
    };
  } catch (error) {
    console.error("ImagePicker: Camera error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to capture image",
    };
  }
}

export async function pickImageFromGallery(): Promise<ImagePickerResult> {
  console.log("ImagePicker: Launching gallery...");

  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    return { success: false, error: "Media library permission denied", permissionDenied: true };
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      console.log("ImagePicker: Gallery selection canceled");
      return { success: false, error: "Canceled" };
    }

    const asset = result.assets[0];
    console.log("ImagePicker: Image selected successfully", asset.uri);

    return {
      success: true,
      image: {
        uri: asset.uri,
        base64: asset.base64,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      },
    };
  } catch (error) {
    console.error("ImagePicker: Gallery error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to select image",
    };
  }
}

export async function uploadAvatarToSupabase(
  userId: string,
  image: PickedImage
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log("ImageUpload: Starting avatar upload for user:", userId);

    let base64Data = image.base64;

    if (!base64Data && Platform.OS === 'web') {
      try {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        console.error("ImageUpload: Failed to fetch image on web:", fetchError);
        return { success: false, error: "Failed to process image" };
      }
    }

    if (!base64Data) {
      return { success: false, error: "No image data available" };
    }

    const mimeType = image.mimeType || 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filePath = `avatars/${userId}_${Date.now()}.${ext}`;

    console.log("ImageUpload: Uploading to path:", filePath);

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64Data), {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("ImageUpload: Storage upload error:", error);
      return { success: false, error: error.message || "Failed to upload image" };
    }

    console.log("ImageUpload: Upload successful, getting public URL");

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
    console.log("ImageUpload: Public URL:", publicUrl);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("ImageUpload: Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
}

export function showImagePickerOptions(
  onCamera: () => void,
  onGallery: () => void,
  onCancel?: () => void
) {
  if (Platform.OS === "web") {
    onGallery();
    return;
  }

  Alert.alert(
    "Change Profile Photo",
    "Choose how you want to update your profile picture",
    [
      {
        text: "Take Photo",
        onPress: onCamera,
      },
      {
        text: "Choose from Library",
        onPress: onGallery,
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: onCancel,
      },
    ],
    { cancelable: true }
  );
}
