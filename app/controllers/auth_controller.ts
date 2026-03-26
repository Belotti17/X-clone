import User from '#models/user'
import EmailVerificationToken from '#models/email_verification_token'
import mail from '@adonisjs/mail/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { verifyOtpValidator } from '#validators/auth'

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

    try {
      // Validation via le validator (vérifie que 'token' est présent)
      const { token } = await request.validateUsing(verifyOtpValidator)

      const user = await User.findByOrFail('email', email)

      // Recherche du jeton valide
      const otpRecord = await EmailVerificationToken.query()
        .where('user_id', user.id)
        .where('token', token)
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
    } catch (error) {
      session.flash('errors', ['Une erreur est survenue lors de la vérification.'])
      return response.redirect().back()
    }
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

      const otp = Math.floor(100000 + Math.random() * 900000).toString()

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
      session.flash('errors', ['Impossible de renvoyer le code.'])
      return response.redirect().back()
    }
  }
}
