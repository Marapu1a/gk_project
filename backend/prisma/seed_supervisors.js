// prisma/seed_from_excel.js
const { PrismaClient, PaymentType, PaymentStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

const norm = (s) => String(s ?? '').trim();
const isEmail = (s) => {
  s = norm(s).toLowerCase();
  return !!s && s.includes('@') && s.split('@')[1]?.includes('.');
};
function pickColumnName(columns, aliases) {
  const normCols = columns.map((c) => norm(c).toLowerCase());
  for (const a of aliases) {
    const i = normCols.indexOf(a.toLowerCase());
    if (i !== -1) return columns[i];
  }
}

async function getGroupOrThrow(name) {
  const g = await prisma.group.findUnique({ where: { name } });
  if (!g) throw new Error(`Группа "${name}" не найдена. Сначала запусти seed.js`);
  return g;
}

async function processSupervisors(rows, groups) {
  const passwordHash = await bcrypt.hash('111111', 10);

  let created = 0,
    existed = 0,
    linkedApplicant = 0,
    linkedSupervisor = 0,
    regPaid = 0,
    skipped = 0;

  const columns = Object.keys(rows[0] || {});
  const colFullName = pickColumnName(columns, ['фио', 'имя', 'fullname', 'full name']);
  const colEmail = pickColumnName(columns, ['почта', 'email', 'e-mail', 'электронная почта']);
  if (!colFullName || !colEmail) {
    throw new Error(`Не нашёл колонки. Нашёл: ${columns.join(', ')}. Ожидал "ФИО" и "Почта".`);
  }

  for (const r of rows) {
    const fullName = norm(r[colFullName]);
    const email = norm(r[colEmail]).toLowerCase();
    if (!isEmail(email)) {
      skipped++;
      continue;
    }

    // user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          password: passwordHash,
          role: 'STUDENT', // как в обычной регистрации
        },
      });
      created++;

      // все 4 платежа UNPAID
      await prisma.payment.createMany({
        data: [
          PaymentType.DOCUMENT_REVIEW,
          PaymentType.EXAM_ACCESS,
          PaymentType.REGISTRATION,
          PaymentType.FULL_PACKAGE,
        ].map((type) => ({
          userId: user.id,
          type,
          status: PaymentStatus.UNPAID,
        })),
      });
    } else {
      existed++;
    }

    // линк к "Соискатель"
    const applicantLink = await prisma.userGroup.findFirst({
      where: { userId: user.id, groupId: groups.applicant.id },
    });
    if (!applicantLink) {
      await prisma.userGroup.create({ data: { userId: user.id, groupId: groups.applicant.id } });
      linkedApplicant++;
    }

    // линк к "Супервизор"
    const supLink = await prisma.userGroup.findFirst({
      where: { userId: user.id, groupId: groups.supervisor.id },
    });
    if (!supLink) {
      await prisma.userGroup.create({ data: { userId: user.id, groupId: groups.supervisor.id } });
      linkedSupervisor++;
    }

    // регистрация -> PAID
    const reg = await prisma.payment.findFirst({
      where: { userId: user.id, type: 'REGISTRATION' },
      orderBy: { createdAt: 'desc' },
    });
    if (reg && reg.status !== 'PAID') {
      await prisma.payment.update({
        where: { id: reg.id },
        data: {
          status: 'PAID',
          confirmedAt: new Date(),
          comment: (reg.comment ? reg.comment + ' | ' : '') + 'Импорт из XLSX',
        },
      });
      regPaid++;
    }
  }

  return {
    created,
    existed,
    linkedApplicant,
    linkedSupervisor,
    regPaid,
    skipped,
  };
}

async function main() {
  const file = process.argv[2] || './data/пользователи цс пап-подготовленный файл.xlsx';
  const wb = xlsx.readFile(file);

  const applicantGroup = await getGroupOrThrow('Соискатель'); // ⬅ было "Студент"
  const supervisorGroup = await getGroupOrThrow('Супервизор');

  const supSheetName =
    wb.SheetNames.find((n) => norm(n).toLowerCase() === 'супервизоры') || wb.SheetNames[0];
  const supRows = xlsx.utils.sheet_to_json(wb.Sheets[supSheetName], { defval: '' });
  const stats = await processSupervisors(supRows, {
    applicant: applicantGroup,
    supervisor: supervisorGroup,
  });

  console.log(`✅ Готово (${path.basename(file)})`);
  console.log(`Лист "${supSheetName}" (супервизоры):
  users: created=${stats.created}, existed=${stats.existed}, skipped=${stats.skipped}
  group "Соискатель": linked=${stats.linkedApplicant}
  group "Супервизор": linked=${stats.linkedSupervisor}
  payments REGISTRATION: set to PAID=${stats.regPaid}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
