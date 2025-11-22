// prisma/seed.js
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
  if (!g) throw new Error(`Группа "${name}" не найдена`);
  return g;
}

async function seedGroupsAndAdmin() {
  // 🔁 ОДНОРАЗОВАЯ миграция: если есть старая группа "Студент" — переименуем в "Соискатель"
  await prisma.group.updateMany({
    where: { name: 'Студент' },
    data: { name: 'Соискатель' },
  });

  // группы уже с новым названием
  const groups = [
    { name: 'Соискатель', rank: 1 },
    { name: 'Инструктор', rank: 2 },
    { name: 'Куратор', rank: 3 },
    { name: 'Супервизор', rank: 4 },
    { name: 'Опытный Супервизор', rank: 5 },
  ];

  for (const { name, rank } of groups) {
    await prisma.group.upsert({
      where: { name },
      update: { rank },
      create: { name, rank },
    });
  }
  console.log('✅ Группы созданы/обновлены.');

  // админ
  const email = 'admin@admin.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const password = await bcrypt.hash('111111', 10);
    const adminUser = await prisma.user.create({
      data: {
        email,
        password,
        fullName: 'Администратор',
        role: 'ADMIN',
        isEmailConfirmed: true,
      },
    });

    const supervisorGroup = await prisma.group.findFirst({
      where: { name: 'Опытный Супервизор' },
    });

    if (supervisorGroup) {
      await prisma.userGroup.create({
        data: { userId: adminUser.id, groupId: supervisorGroup.id },
      });
    }

    console.log('✅ Админ создан: admin@admin.com / 111111');
  } else {
    console.log('ℹ️ Админ уже существует, пропущено.');
  }
}

async function processSupervisors(rows, groups) {
  const passwordHash = await bcrypt.hash('111111', 10);

  let created = 0,
    existed = 0,
    linkedStudent = 0,
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
          role: 'REVIEWER', // 👈 вместо STUDENT
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
      // на всякий случай обновляем роль, если она не ADMIN/REVIEWER
      if (user.role !== 'ADMIN' && user.role !== 'REVIEWER') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'REVIEWER' },
        });
      }
    }

    // линк к "Соискатель"
    const studentLink = await prisma.userGroup.findFirst({
      where: { userId: user.id, groupId: groups.applicant.id },
    });
    if (!studentLink) {
      await prisma.userGroup.create({ data: { userId: user.id, groupId: groups.applicant.id } });
      linkedStudent++;
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

  return { created, existed, linkedStudent, linkedSupervisor, regPaid, skipped };
}

async function seedSupervisors() {
  const file = './data/пользователи цс пап-подготовленный файл.xlsx';
  const wb = xlsx.readFile(file);

  const applicantGroup = await getGroupOrThrow('Соискатель'); // 👈 было 'Студент'
  const supervisorGroup = await getGroupOrThrow('Супервизор');

  const supSheetName =
    wb.SheetNames.find((n) => norm(n).toLowerCase() === 'супервизоры') || wb.SheetNames[0];
  const supRows = xlsx.utils.sheet_to_json(wb.Sheets[supSheetName], { defval: '' });
  const stats = await processSupervisors(supRows, {
    applicant: applicantGroup, // 👈 новое имя ключа
    supervisor: supervisorGroup,
  });

  console.log(`✅ Импорт супервизоров (${path.basename(file)})`);
  console.log(`Лист "${supSheetName}":
  users: created=${stats.created}, existed=${stats.existed}, skipped=${stats.skipped}
  group "Соискатель": linked=${stats.linkedStudent}
  group "Супервизор": linked=${stats.linkedSupervisor}
  payments REGISTRATION: set to PAID=${stats.regPaid}`);
}

async function main() {
  await seedGroupsAndAdmin();
  await seedSupervisors();
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
