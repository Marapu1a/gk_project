// prisma/seed_from_excel.js
const { PrismaClient } = require('@prisma/client');
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
  if (!g) throw new Error(`Группа "${name}" не найдена. Сначала запусти основной seed.js`);
  return g;
}

async function upsertRegistrationPaid(userId) {
  const existing = await prisma.payment.findFirst({
    where: { userId, type: 'REGISTRATION' },
    orderBy: { createdAt: 'desc' },
  });
  if (!existing) {
    await prisma.payment.create({
      data: {
        userId,
        type: 'REGISTRATION',
        status: 'PAID',
        confirmedAt: new Date(),
        comment: 'Импорт из XLSX',
      },
    });
    return { created: 1, updated: 0, untouched: 0 };
  }
  if (existing.status !== 'PAID') {
    await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'PAID',
        confirmedAt: new Date(),
        comment: (existing.comment ? existing.comment + ' | ' : '') + 'Импорт из XLSX',
      },
    });
    return { created: 0, updated: 1, untouched: 0 };
  }
  return { created: 0, updated: 0, untouched: 1 };
}

async function processSheet(rows, mode, groups) {
  // mode: 'SUPERVISORS' | 'OTHERS'
  const passwordHash = await bcrypt.hash('111111', 10);

  let created = 0,
    existed = 0,
    linkedNew = 0,
    linkedExisted = 0,
    roleUpdated = 0,
    skipped = 0,
    payCreated = 0,
    payUpdated = 0,
    payUntouched = 0;

  const columns = Object.keys(rows[0] || {});
  const colFullName = pickColumnName(columns, ['фио', 'фио ', 'имя', 'fullname', 'full name']);
  const colEmail = pickColumnName(columns, [
    'почта',
    'почта ',
    'email',
    'e-mail',
    'электронная почта',
  ]);
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
          role: mode === 'SUPERVISORS' ? 'REVIEWER' : 'STUDENT',
          isEmailConfirmed: false,
        },
      });
      created++;
    } else {
      existed++;
      // апдейт роли для супервизоров (не трогаем ADMIN/REVIEWER)
      if (mode === 'SUPERVISORS' && user.role !== 'ADMIN' && user.role !== 'REVIEWER') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'REVIEWER' } });
        roleUpdated++;
      }
    }

    // group link
    const groupId = mode === 'SUPERVISORS' ? groups.supervisor.id : groups.student.id;
    const already = await prisma.userGroup.findFirst({
      where: { userId: user.id, groupId },
      select: { id: true },
    });
    if (!already) {
      await prisma.userGroup.create({ data: { userId: user.id, groupId } });
      linkedNew++;
    } else {
      linkedExisted++;
    }

    // payment REGISTRATION -> PAID
    const res = await upsertRegistrationPaid(user.id);
    payCreated += res.created;
    payUpdated += res.updated;
    payUntouched += res.untouched;
  }

  return {
    created,
    existed,
    roleUpdated,
    linkedNew,
    linkedExisted,
    skipped,
    payCreated,
    payUpdated,
    payUntouched,
  };
}

async function main() {
  const file = process.argv[2] || './data/пользователи цс пап-подготовленный файл.xlsx';
  const wb = xlsx.readFile(file);

  // группы только читаем (не создаём)
  const studentGroup = await getGroupOrThrow('Студент');
  const supervisorGroup = await getGroupOrThrow('Супервизор');

  // 1) "супервизоры" или первый лист
  const supSheetName =
    wb.SheetNames.find((n) => norm(n).toLowerCase() === 'супервизоры') || wb.SheetNames[0];
  const supRows = xlsx.utils.sheet_to_json(wb.Sheets[supSheetName], { defval: '' });
  const supStats = await processSheet(supRows, 'SUPERVISORS', {
    student: studentGroup,
    supervisor: supervisorGroup,
  });

  // 2) второй лист (остальные), если есть
  const otherSheetName = wb.SheetNames[1];
  let otherStats = null;
  if (otherSheetName) {
    const otherRows = xlsx.utils.sheet_to_json(wb.Sheets[otherSheetName], { defval: '' });
    otherStats = await processSheet(otherRows, 'OTHERS', {
      student: studentGroup,
      supervisor: supervisorGroup,
    });
  }

  // Итоги
  console.log(`✅ Готово (${path.basename(file)})`);
  console.log(`Лист "${supSheetName}" (супервизоры):
  users: created=${supStats.created}, existed=${supStats.existed}, roleUpdated=${supStats.roleUpdated}, skipped=${supStats.skipped}
  group "Супервизор": linked=${supStats.linkedNew}, already_linked=${supStats.linkedExisted}
  payments REGISTRATION: created=${supStats.payCreated}, updated=${supStats.payUpdated}, untouched=${supStats.payUntouched}`);
  if (otherStats) {
    console.log(`Лист "${otherSheetName}" (остальные):
  users: created=${otherStats.created}, existed=${otherStats.existed}, skipped=${otherStats.skipped}
  group "Студент": linked=${otherStats.linkedNew}, already_linked=${otherStats.linkedExisted}
  payments REGISTRATION: created=${otherStats.payCreated}, updated=${otherStats.payUpdated}, untouched=${otherStats.payUntouched}`);
  } else {
    console.log('Второго листа нет — пропущено.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
