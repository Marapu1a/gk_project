import { api } from "@/lib/axios";

export async function downloadUsersExportXlsx(): Promise<Blob> {
  const response = await api.get("/admin/users/export.xlsx", {
    responseType: "blob",
  });

  // На всякий случай проверим, что прилетел файл, а не JSON с ошибкой
  const contentType = String(response.headers?.["content-type"] ?? "");
  if (contentType.includes("application/json")) {
    // Попробуем прочитать текст ошибки
    const text = await (response.data as Blob).text().catch(() => "");
    throw new Error(text || "Сервер вернул JSON вместо XLSX");
  }

  return response.data as Blob;
}
