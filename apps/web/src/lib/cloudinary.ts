const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// 直接從瀏覽器上傳到 Cloudinary，不經過我們自己的後端/資料庫——這樣圖片的
// bytes 完全不會流經 Neon，之前 picture_url/avatar 直接存 base64 進 Postgres
// TEXT 欄位，每次 /user/user-info、/pet/get-pets 都要整包傳輸，很快就把
// Neon 免費方案 5GB/月的 network transfer 額度用完，才會一直 500。
// 用的是「unsigned upload preset」：cloud name 跟 preset 名稱本來就是設計成
// 可以放在前端程式碼裡曝光的東西，不是密鑰，不需要透過後端代轉。
// 上傳完只會拿到一個 secure_url 字串，存進資料庫的是這個網址，不是整張圖。
export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "尚未設定 VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `圖片上傳失敗（${res.status}）`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

// 健康檢查報告除了圖片，還可能是 PDF（血檢單、超音波報告等），Cloudinary 的
// image/upload 端點只吃圖片，PDF 會被拒絕；改用 auto/upload 讓 Cloudinary
// 自己判斷檔案類型（圖片/PDF/其他都吃），一樣是 unsigned 上傳，回傳網址存進
// report_files。
export async function uploadFileToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "尚未設定 VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error?.message ?? `檔案「${file.name}」上傳失敗（${res.status}）`,
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
