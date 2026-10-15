import User from '#models/user' // modèle utilisateur
import type { HttpContext } from '@adonisjs/core/http' // contexte HTTP
import { errors as authErrors } from '@adonisjs/auth'
import { loginValidator } from '#validators/auth'

/**
 * Controller de gestion des sessions
 */
export default class SessionController {
  /**
   * Affichage page login (optionnel)
   */
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login') // affiche login
  }

  /**
   * Connexion utilisateur
   */
  async store({ request, auth, response, session }: HttpContext) {
    const [validationError, credentials] = await request.tryValidateUsing(loginValidator)

    if (validationError) {
      session.flash('loginError', 'Veuillez saisir une adresse e-mail et un mot de passe valides.')
      return response.redirect().back()
    }

    let user: User
    try {
      user = await User.verifyCredentials(credentials.email, credentials.password)
    } catch (error) {
      if (!authErrors.E_INVALID_CREDENTIALS.isError(error)) {
        throw error
      }

      session.flash('loginError', 'Adresse e-mail ou mot de passe incorrect.')
      return response.redirect().back()
    }

    if (!user.isVerified) {
      session.put('otpEmail', user.email)
      session.flash('errors', ['Votre adresse e-mail doit être vérifiée avant la connexion.'])
      return response.redirect().toRoute('otp.create')
    }

    // Connexion de l'utilisateur avec le guard "web"
    await auth.use('web').login(user)

    // REDIRECTION IMPORTANTE
    return response.redirect().toRoute('timeline') // aller vers timeline
  }

  /**
   * Déconnexion utilisateur
   */
  async destroy({ auth, response }: HttpContext) {
    // Déconnexion utilisateur
    await auth.use('web').logout()

    // Redirection vers signup
    return response.redirect().toRoute('new_account.create')
  }
}
