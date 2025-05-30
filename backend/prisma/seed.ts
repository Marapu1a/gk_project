import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const groups = ['Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор']

  for (const name of groups) {
    await prisma.group.upsert({
      where: { name },
      update: {},
      create: {
        name,
      },
    })
  }

  console.log('✅ Группы созданы или уже существовали.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
