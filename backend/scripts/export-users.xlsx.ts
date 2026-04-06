// scripts/export-users.xlsx.ts
import {
  PrismaClient,
  PaymentType,
  ConsentDocumentType,
} from "@prisma/client";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const CONSENT_ITEM_CODES = {
  PUBLIC_OFFER_ACCEPTED: "PUBLIC_OFFER_ACCEPTED",
  PD_PROCESSING_ACCEPTED: "PD_PROCESSING_ACCEPTED",
  USER_AGREEMENT_ACCEPTED: "USER_AGREEMENT_ACCEPTED",
  TRANSBORDER_PD_TRANSFER_ACCEPTED: "TRANSBORDER_PD_TRANSFER_ACCEPTED",
  INFO_MAILING_ACCEPTED: "INFO_MAILING_ACCEPTED",
} as const;

function paymentStatusRu(status: string): string {
  switch (status) {
    case "PAID":
      return "Оплачен";
    case "UNPAID":
      return "Не оплачен";
    case "PENDING":
      return "Ожидает";
    default:
      return status;
  }
}

function dateOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);

  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  return s;
}

function dateTimeValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().replace("T", " ").slice(0, 19);

  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return s.replace("T", " ").slice(0, 19);
  }

  return s;
}

function targetLevelRu(v: string | null | undefined): string {
  if (!v) return "";
  switch (v) {
    case "INSTRUCTOR":
      return "Инструктор";
    case "CURATOR":
      return "Куратор";
    case "SUPERVISOR":
      return "Супервизор";
    default:
      return String(v);
  }
}

function consentSourceRu(v: string | null | undefined): string {
  if (!v) return "";
  switch (v) {
    case "REGISTRATION_MODAL":
      return "Регистрация";
    case "LEGACY_MODAL":
      return "Legacy modal";
    default:
      return String(v);
  }
}

function yesNo(v: boolean | null | undefined): string {
  if (v === true) return "Да";
  if (v === false) return "Нет";
  return "";
}

function currentGroupByMaxRank(
  groups: { group: { name: string; rank: number } }[]
): string {
  if (!groups?.length) return "";
  const sorted = [...groups].sort(
    (a, b) => (b.group.rank ?? 0) - (a.group.rank ?? 0)
  );
  return sorted[0]?.group?.name ?? "";
}

type PaySlot = { status: string; confirmedAt: string };

function emptyPaySlots(): Record<PaymentType, PaySlot> {
  return {
    REGISTRATION: { status: "", confirmedAt: "" },
    DOCUMENT_REVIEW: { status: "", confirmedAt: "" },
    EXAM_ACCESS: { status: "", confirmedAt: "" },
    RENEWAL: { status: "", confirmedAt: "" },
    FULL_PACKAGE: { status: "", confirmedAt: "" },
  };
}

function extractAcceptedItems(raw: unknown): Set<string> {
  const result = new Set<string>();

  const walk = (value: unknown) => {
    if (!value) return;

    if (typeof value === "string") {
      result.add(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          result.add(item);
          continue;
        }

        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;

          if (typeof obj.code === "string") {
            const accepted =
              obj.accepted === undefined ? true : Boolean(obj.accepted);

            if (accepted) result.add(obj.code);
          }

          if (Array.isArray(obj.items)) {
            walk(obj.items);
          }
        }
      }
      return;
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;

      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "boolean") {
          if (val) result.add(key);
          continue;
        }

        if (key === "items" && Array.isArray(val)) {
          walk(val);
          continue;
        }

        if (val && typeof val === "object") {
          walk(val);
        }
      }
    }
  };

  walk(raw);

  return result;
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      createdAt: true,
      lastActiveAt: true,

      fullName: true,
      fullNameLatin: true,
      country: true,
      city: true,
      email: true,
      phone: true,
      targetLevel: true,
      groups: { select: { group: { select: { name: true, rank: true } } } },

      certificates: {
        select: { title: true, number: true, issuedAt: true, expiresAt: true },
        orderBy: { issuedAt: "desc" },
        take: 1,
      },

      payments: {
        select: { type: true, status: true, confirmedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },

      consents: {
        where: {
          documentType: ConsentDocumentType.TRANSBORDER_PD_TRANSFER,
        },
        select: {
          documentVersion: true,
          acceptedItems: true,
          source: true,
          consentedAt: true,
          emailStatus: true,
          emailSentAt: true,
        },
        orderBy: { consentedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Users");

  ws.columns = [
    { header: "Дата регистрации", key: "registeredAt", width: 16 },
    { header: "Последняя активность", key: "lastActiveAt", width: 20 },

    { header: "ФИО", key: "fullName", width: 28 },
    { header: "Латинское имя и фамилия", key: "fullNameLatin", width: 28 },
    { header: "Страна", key: "country", width: 18 },
    { header: "Город", key: "city", width: 18 },
    { header: "Емэил", key: "email", width: 26 },
    { header: "Телефон", key: "phone", width: 18 },
    { header: "Текущая группа", key: "currentGroup", width: 22 },
    { header: "Целевая группа", key: "targetGroup", width: 18 },

    { header: "Согласие на трансграничную передачу — принято", key: "consentAccepted", width: 24 },
    { header: "Согласие — версия документа", key: "consentVersion", width: 22 },
    { header: "Согласие — дата и время", key: "consentedAt", width: 22 },
    { header: "Согласие — источник", key: "consentSource", width: 18 },

    { header: "Чекбокс — публичная оферта", key: "cbPublicOffer", width: 22 },
    { header: "Чекбокс — политика ПД", key: "cbPdProcessing", width: 22 },
    { header: "Чекбокс — пользовательское соглашение", key: "cbUserAgreement", width: 28 },
    { header: "Чекбокс — трансграничная передача ПД", key: "cbTransborder", width: 30 },
    { header: "Чекбокс — инфо-рассылка", key: "cbInfoMailing", width: 22 },

    { header: "Письмо по согласию — статус", key: "consentEmailStatus", width: 22 },
    { header: "Письмо по согласию — отправлено", key: "consentEmailSentAt", width: 24 },

    { header: "Название сертификата", key: "certTitle", width: 28 },
    { header: "Номер сертификата", key: "certNumber", width: 18 },
    { header: "Дата выдачи сертификата", key: "certIssuedAt", width: 20 },
    { header: "Дата окончания сертификата", key: "certExpiresAt", width: 22 },

    { header: "Регистрация — статус", key: "payRegStatus", width: 20 },
    { header: "Регистрация — дата подтверждения", key: "payRegConfirmedAt", width: 26 },

    { header: "Проверка документов — статус", key: "payDocStatus", width: 26 },
    { header: "Проверка документов — дата подтверждения", key: "payDocConfirmedAt", width: 30 },

    { header: "Доступ к экзамену — статус", key: "payExamStatus", width: 24 },
    { header: "Доступ к экзамену — дата подтверждения", key: "payExamConfirmedAt", width: 30 },

    { header: "Ресертификация — статус", key: "payRenewalStatus", width: 24 },
    { header: "Ресертификация — дата подтверждения", key: "payRenewalConfirmedAt", width: 30 },

    { header: "Полный пакет — статус", key: "payFullStatus", width: 22 },
    { header: "Полный пакет — дата подтверждения", key: "payFullConfirmedAt", width: 30 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  for (const u of users) {
    const cert = u.certificates?.[0];
    const consent = u.consents?.[0] ?? null;
    const acceptedItems = extractAcceptedItems(consent?.acceptedItems);

    const slots = emptyPaySlots();
    for (const p of u.payments) {
      if (slots[p.type].status) continue;

      const rawStatus = String(p.status);
      slots[p.type] = {
        status: paymentStatusRu(rawStatus),
        confirmedAt: rawStatus === "PAID" ? dateOnly(p.confirmedAt) : "",
      };
    }

    ws.addRow({
      registeredAt: dateOnly(u.createdAt),
      lastActiveAt: dateOnly(u.lastActiveAt),

      fullName: u.fullName,
      fullNameLatin: u.fullNameLatin ?? "",
      country: u.country ?? "",
      city: u.city ?? "",
      email: u.email,
      phone: u.phone ?? "",
      currentGroup: currentGroupByMaxRank(u.groups),
      targetGroup: targetLevelRu(u.targetLevel),

      consentAccepted: yesNo(Boolean(consent)),
      consentVersion: consent?.documentVersion ?? "",
      consentedAt: dateTimeValue(consent?.consentedAt),
      consentSource: consentSourceRu(consent?.source),

      cbPublicOffer: yesNo(
        acceptedItems.has(CONSENT_ITEM_CODES.PUBLIC_OFFER_ACCEPTED)
      ),
      cbPdProcessing: yesNo(
        acceptedItems.has(CONSENT_ITEM_CODES.PD_PROCESSING_ACCEPTED)
      ),
      cbUserAgreement: yesNo(
        acceptedItems.has(CONSENT_ITEM_CODES.USER_AGREEMENT_ACCEPTED)
      ),
      cbTransborder: yesNo(
        acceptedItems.has(
          CONSENT_ITEM_CODES.TRANSBORDER_PD_TRANSFER_ACCEPTED
        )
      ),
      cbInfoMailing: yesNo(
        acceptedItems.has(CONSENT_ITEM_CODES.INFO_MAILING_ACCEPTED)
      ),

      consentEmailStatus: consent?.emailStatus ?? "",
      consentEmailSentAt: dateTimeValue(consent?.emailSentAt),

      certTitle: cert?.title ?? "",
      certNumber: cert?.number ?? "",
      certIssuedAt: dateOnly(cert?.issuedAt ?? null),
      certExpiresAt: dateOnly(cert?.expiresAt ?? null),

      payRegStatus: slots.REGISTRATION.status,
      payRegConfirmedAt: slots.REGISTRATION.confirmedAt,

      payDocStatus: slots.DOCUMENT_REVIEW.status,
      payDocConfirmedAt: slots.DOCUMENT_REVIEW.confirmedAt,

      payExamStatus: slots.EXAM_ACCESS.status,
      payExamConfirmedAt: slots.EXAM_ACCESS.confirmedAt,

      payRenewalStatus: slots.RENEWAL.status,
      payRenewalConfirmedAt: slots.RENEWAL.confirmedAt,

      payFullStatus: slots.FULL_PACKAGE.status,
      payFullConfirmedAt: slots.FULL_PACKAGE.confirmedAt,
    });
  }

  const outDir = path.resolve(process.cwd(), "exports");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "cs_pap_users_export.xlsx");
  await workbook.xlsx.writeFile(outPath);

  console.log(`OK: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
