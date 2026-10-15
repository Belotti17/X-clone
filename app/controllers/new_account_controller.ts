import User from '#models/user' // Import du modèle User qui représente la table des utilisateurs dans la base de données
import EmailVerificationToken from '#models/email_verification_token' // Import du modèle qui stocke les tokens OTP de vérification email

import { signupValidator } from '#validators/user' // Import du validateur qui vérifie les données envoyées lors de l'inscription

import mail from '@adonisjs/mail/services/main' // Import du service mail d'AdonisJS pour envoyer des emails
import logger from '@adonisjs/core/services/logger'

import { DateTime } from 'luxon' // Import de Luxon pour manipuler les dates et heures
import { randomInt } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http' // Import du type HttpContext qui représente le contexte HTTP d'une requête

export default class NewAccountController {
  // Déclaration du contrôleur responsable de la création d'un nouveau compte utilisateur

  // Méthode qui affiche la page d'inscription
  async create({ view }: HttpContext) {
    // Récupère l'objet view depuis le contexte HTTP
    return view.render('pages/auth/signup') // Rend la vue Edge correspondant à la page signup
  }

  // Méthode qui crée un utilisateur et envoie un OTP de vérification
  async store({ request, response, session }: HttpContext) {
    // Récupère les objets request, response et session du contexte HTTP

    const payload = await request.validateUsing(signupValidator) // Valide les données envoyées par le formulaire avec le validator signupValidator

    // Création de l'utilisateur dans la base de données
    const user = await User.create({
      // Insère un nouvel utilisateur dans la table users
      name: payload.name, // Enregistre le nom de l'utilisateur
      username: payload.username, // Enregistre le username de l'utilisateur
      email: payload.email, // Enregistre l'email de l'utilisateur
      password: payload.password, // Enregistre le mot de passe de l'utilisateur (qui sera automatiquement hashé si configuré dans le modèle)
      isVerified: false, // Définit l'utilisateur comme non vérifié tant que l'OTP n'est pas confirmé
    })

    // Génération d'un code OTP à 6 chiffres
    const otp = randomInt(100000, 1000000).toString()

    // Sauvegarde du token OTP dans la base de données
    await EmailVerificationToken.create({
      // Crée un nouvel enregistrement dans la table des tokens de vérification
      userId: user.id, // Associe le token à l'utilisateur qui vient d'être créé
      token: otp, // Stocke le code OTP généré
      expiresAt: DateTime.now().plus({ minutes: 10 }), // Définit une date d'expiration du token à 10 minutes après sa création
    })

    session.put('otpEmail', user.email)

    try {
      await mail.send((message) => {
        message
          .to(user.email)
          .subject('Votre code OTP')
          .text(`Votre code de vérification est : ${otp}`)
      })
    } catch (error) {
      logger.error({ err: error }, 'Unable to send the account verification OTP')
      session.flash('errors', [
        'Le code n’a pas pu être envoyé. Utilisez « Renvoyer le code OTP » pour réessayer.',
      ])
    }

    // Redirection vers la page de vérification OTP
    return response.redirect().toRoute('otp.create') // Redirige l'utilisateur vers la route qui affiche la page de saisie de l'OTP
  }

  // Méthode qui affiche la page où l'utilisateur doit entrer son OTP
  async showOtpPage({ view, session }: HttpContext) {
    // Récupère les objets view et session du contexte HTTP

    const email = session.get('otpEmail') || '' // Récupère l'email sauvegardé dans la session ou retourne une chaîne vide si aucune valeur n'existe

    return view.render('pages/auth/verify_otp', { email }) // Rend la vue verify_otp et envoie l'email à la vue
  }
}
