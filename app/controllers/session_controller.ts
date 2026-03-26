import User from '#models/user' // modèle utilisateur
import type { HttpContext } from '@adonisjs/core/http' // contexte HTTP

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
  async store({ request, auth, response }: HttpContext) {
    // Récupération des champs envoyés
    const { email, password } = request.all()

    // Vérification des identifiants
    const user = await User.verifyCredentials(email, password)

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
