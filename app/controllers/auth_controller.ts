import User from '#models/user' // modèle user
import EmailVerificationToken from '#models/email_verification_token' // modèle OTP
import mail from '@adonisjs/mail/services/main' // service email
import type { HttpContext } from '@adonisjs/core/http' // context HTTP
import { DateTime } from 'luxon' // gestion date
import { verifyOtpValidator } from '#validators/auth' // validator OTP

export default class AuthController {
  // vérifie le OTP
  public async verifyOtp({ request, response, session }: HttpContext) {
    const email = session.get('otpEmail') // email stocké session

    if (!email) {
      // sécurité session
      return response.badRequest({ message: 'Session expirée' })
    }

    const { token } = await request.validateUsing(verifyOtpValidator) // validation OTP

    try {
      const user = await User.findByOrFail('email', email) // recherche user
      const otpRecord = await EmailVerificationToken.query() // démarre une requête Lucid
        .where('user_id', user.id) // filtre par utilisateur
        .where('token', token) // filtre par code OTP
        .where('expires_at', '>', DateTime.now().toJSDate()) // vérifie expiration
        .firstOrFail() // erreur si aucun token trouvé

      user.isVerified = true // email vérifié
      await user.save() // sauvegarde

      await otpRecord.delete() // suppression OTP utilisé

      session.forget('otpEmail') // nettoyage session

      return response.redirect().toRoute('session.create') // redirection login
    } catch {
      return response.badRequest({
        // OTP invalide
        message: 'OTP invalide ou expiré',
      })
    }
  }

  // renvoyer OTP
  public async resendOtp({ session, response }: HttpContext) {
    const email = session.get('otpEmail') // email session

    if (!email) {
      return response.badRequest({ message: 'Session expirée' })
    }

    const user = await User.findByOrFail('email', email) // recherche user

    await EmailVerificationToken.query().where('userId', user.id).delete() // supprime anciens OTP

    const otp = Math.floor(100000 + Math.random() * 900000).toString() // nouveau OTP

    await EmailVerificationToken.create({
      // sauvegarde OTP
      userId: user.id,
      token: otp,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    })

    await mail.send((message) => {
      // envoi email
      message.to(user.email).subject('Votre nouveau code OTP').text(`Votre code OTP est : ${otp}`)
    })

    return response.redirect().back() // retour page précédente
  }
}
