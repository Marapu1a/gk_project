import { FastifyRequest, FastifyReply } from "fastify";
import ExcelJS from "exceljs";
import { PaymentType } from "@prisma/client";
import { prisma } from "../../lib/prisma";

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
    FULL_PACKAGE: { status: "", confirmedAt: "" },
  };
}

export async function getUsersExportXlsxHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  if (req.user.role !== "ADMIN") {
    return reply.code(403).send({ error: "Доступ запрещён" });
  }

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

      payFullStatus: slots.FULL_PACKAGE.status,
      payFullConfirmedAt: slots.FULL_PACKAGE.confirmedAt,
    });
  }

  const ab = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(ab);

  reply
    .header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    .header("Content-Disposition", 'attachment; filename="cs_pap_users_export.xlsx"')
    .send(buffer);
}
