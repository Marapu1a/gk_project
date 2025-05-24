import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GC_ACCOUNT = process.env.GC_ACCOUNT!;
const GC_SECRET_KEY = process.env.GC_SECRET_KEY!;
const BASE_URL = `https://${GC_ACCOUNT}.getcourse.ru/pl/api/account`;

export async function getUserGroupsFromGC(email: string): Promise<string[]> {
  try {
    // 1. Инициализация экспорта
    const initUrl = `${BASE_URL}/users?key=${GC_SECRET_KEY}&email=${encodeURIComponent(email)}`;
    const initRes = await axios.get(initUrl);
    const exportId = initRes.data?.export_id;

    if (!exportId) {
      throw new Error("Экспорт не инициализирован");
    }

    // 2. Ожидание готовности и получение результата
    const statusUrl = `${BASE_URL}/exports/${exportId}?key=${GC_SECRET_KEY}`;
    let exportData = null;

    for (let i = 0; i < 10; i++) {
      const statusRes = await axios.get(statusUrl);

      if (statusRes.data.status === "ready") {
        exportData = statusRes.data.result;
        break;
      }

      await new Promise((res) => setTimeout(res, 1000)); // пауза 1 секунда
    }

    if (!exportData || !Array.isArray(exportData) || exportData.length === 0) {
      throw new Error("Пользователь не найден или данные недоступны");
    }

    const groups: string[] = exportData[0].group_name || [];
    return groups.map((g) => g.trim());
  } catch (err: any) {
    console.warn("⚠️ GC export error:", err?.message || err);
    return [];
  }
}
