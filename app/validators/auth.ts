// Import vine
import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().toLowerCase().email(),
    password: vine.string().minLength(1),
  })
)

// Validator OTP
export const verifyOtpValidator = vine.compile(
  vine.object({
    token: vine
      .string() // code OTP
      .fixedLength(6) // exactement 6 caractères
      .regex(/^[0-9]+$/), // seulement chiffres
  })
)
