// Import vine validator
import vine from '@vinejs/vine'

// Validator pour l'inscription
export const signupValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3), // nom obligatoire

    username: vine
      .string()
      .trim()
      .minLength(3) // username minimum 3 caractères
      .unique(async (db, value) => {
        // vérifie unicité
        const user = await db.from('users').where('username', value).first()
        return !user
      }),

    email: vine
      .string()
      .trim()
      .toLowerCase()
      .email() // email valide
      .unique(async (db, value) => {
        const user = await db.from('users').where('email', value).first()
        return !user
      }),

    password: vine
      .string()
      .minLength(6) // password min 6 caractères
      .confirmed({ confirmationField: 'passwordConfirmation' }), // confirmation password
  })
)
