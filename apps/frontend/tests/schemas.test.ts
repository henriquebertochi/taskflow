import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from "@/features/auth/schemas"

const valid = { name: "Ana", email: "ana@example.com", password: "12345678", passwordConfirmation: "12345678" }

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message
}

describe("registerSchema", () => {
  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("exige senha com no mínimo 8 caracteres", () => {
    const result = registerSchema.safeParse({ ...valid, password: "1234567", passwordConfirmation: "1234567" })
    expect(firstMessage(result)).toBe("A senha deve ter no mínimo 8 caracteres")
  })

  it("exige confirmação igual à senha, apontando o campo de confirmação", () => {
    const result = registerSchema.safeParse({ ...valid, passwordConfirmation: "87654321" })
    expect(result.error?.issues[0]).toMatchObject({
      message: "As senhas não coincidem",
      path: ["passwordConfirmation"],
    })
  })

  it("rejeita e-mail inválido e nome vazio", () => {
    expect(firstMessage(registerSchema.safeParse({ ...valid, name: "  " }))).toBe("Informe o nome completo")
    expect(firstMessage(registerSchema.safeParse({ ...valid, email: "ana@" }))).toBe("E-mail inválido")
  })
})

describe("forgot/reset", () => {
  it("valida e-mail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x" }).success).toBe(false)
  })
  it("reset exige senhas iguais", () => {
    expect(resetPasswordSchema.safeParse({ password: "12345678", passwordConfirmation: "x" }).success).toBe(false)
  })
})
