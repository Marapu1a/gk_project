import axios from "axios"
import dotenv from "dotenv"
dotenv.config()

const GC_API_URL = `https://${process.env.GC_ACCOUNT}.getcourse.ru/pl/api/users`
const GC_SECRET_KEY = process.env.GC_SECRET_KEY!

type CreateUserParams = {
  email: string
  firstName: string
  lastName?: string
  group?: string
}

export async function createGCUser({ email, firstName, lastName, group }: CreateUserParams) {
  const payload = {
    user: {
      email,
      first_name: firstName,
      last_name: lastName,
      group_name: group ? [group] : [],
    },
    system: {
      refresh_if_exists: 1,
    },
  }

  const params = Buffer.from(JSON.stringify(payload)).toString("base64")

  const response = await axios.post(GC_API_URL, new URLSearchParams({
    action: "add",
    key: GC_SECRET_KEY,
    params,
  }), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })

  console.log("🔄 GC response:", response.data)

  const result = response.data.result
  if (!result.success || result.error) {
    throw new Error(result.error_message || "Ошибка при создании пользователя в GetCourse")
  }

  return result.user_id
}
