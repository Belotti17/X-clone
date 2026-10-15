import User from '#models/user'
import EmailVerificationToken from '#models/email_verification_token'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { verifyOtpValidator } from '#validators/auth'
import { randomInt } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'

export default class AuthController {
  /**
   * Vérification du code OTP
   */
  public async verifyOtp({ request, response, session, auth }: HttpContext) {
    const email = session.get('otpEmail')

    if (!email) {
      session.flash('errors', ['Session expirée, veuillez vous réinscrire.'])
      return response.redirect().toRoute('new_account.create')
    }

    const [validationError, payload] = await request.tryValidateUsing(verifyOtpValidator)
    if (validationError) {
      session.flash('errors', ['Le code OTP doit contenir exactement 6 chiffres.'])
      return response.redirect().back()
    }

    const user = await User.findByOrFail('email', email)

    // Recherche du jeton valide
    const otpRecord = await EmailVerificationToken.query()
      .where('user_id', user.id)
      .where('token', payload.token)
      .where('expires_at', '>', DateTime.now().toJSDate())
      .first()

    if (!otpRecord) {
      session.flash('errors', ['Code OTP invalide ou expiré.'])
      return response.redirect().back()
    }

    // Validation réussie
    user.isVerified = true
    await user.save()

    await otpRecord.delete()
    session.forget('otpEmail')

    // Connexion et redirection
    await auth.use('web').login(user)
    await session.commit()

    return response.redirect().toRoute('timeline')
  }

  /**
   * Renvoi du code OTP
   */
  public async resendOtp({ session, response }: HttpContext) {
    const email = session.get('otpEmail')

    if (!email) {
      session.flash('errors', ['Session expirée, veuillez recommencer.'])
      return response.redirect().toRoute('new_account.create')
    }

    try {
      const user = await User.findByOrFail('email', email)

      // Nettoyage des anciens codes
      await EmailVerificationToken.query().where('user_id', user.id).delete()

      const otp = randomInt(100000, 1000000).toString()

      await EmailVerificationToken.create({
        userId: user.id,
        token: otp,
        expiresAt: DateTime.now().plus({ minutes: 10 }),
      })

      await mail.send((message) => {
        message
          .to(user.email)
          .subject('Nouveau code de vérification X')
          .text(`Votre nouveau code est : ${otp}`)
      })

      session.flash('success', 'Un nouveau code a été envoyé !')
      return response.redirect().back()
    } catch (error) {
      logger.error({ err: error }, 'Unable to resend the account verification OTP')
      session.flash('errors', ['Impossible de renvoyer le code.'])
      return response.redirect().back()
    }
  }
}
