import { useMutation } from "@tanstack/react-query";
import { downloadUsersExportXlsx } from "../api/downloadUsersExport";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useDownloadUsersExport() {
  return useMutation({
    mutationFn: async () => {
      const blob = await downloadUsersExportXlsx();
      const filename = `cs_pap_users_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveBlob(blob, filename);
    },
  });
}
