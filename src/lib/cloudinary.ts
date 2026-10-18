import { authStorage } from "@/lib/apiConfig";

interface CloudinaryUploadResponse {
  success?: boolean;
  secureUrl?: string;
  error?: string;
}

export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const token = authStorage.getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch("https://be-ql-chubeo.onrender.com/api/uploads/image", {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });
  const result = (await response.json()) as CloudinaryUploadResponse;
  console.log("Cloudinary Upload Response:", result.secureUrl); // Log the response for debugging

  if (!response.ok || !result.secureUrl) {
    throw new Error(result.error || "Không thể tải ảnh lên Cloudinary123.");
  }

  return result.secureUrl;
}