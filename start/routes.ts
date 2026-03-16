import router from '@adonisjs/core/services/router'
// Importe le service router d’AdonisJS qui permet de définir les routes de l'application
import { middleware } from '#start/kernel'
// Importe les middlewares configurés dans l'application (auth, guest, etc.)

import AuthController from '#controllers/auth_controller'
// Contrôleur responsable de la vérification OTP et de certaines actions d'authentification
import SessionController from '#controllers/session_controller'
// Contrôleur responsable de la gestion de la session (login et logout)
import TimelineController from '#controllers/timelines_controller'
// Contrôleur responsable de l'affichage du timeline des posts
import NewAccountController from '#controllers/new_account_controller'
// Contrôleur responsable de la création d'un nouveau compte

// Route de la page d'accueil
router.on('/').render('pages/home').as('home')
// Affiche la vue pages/home lorsque l'utilisateur visite la racine du site

// Groupe de routes accessibles uniquement aux visiteurs non connectés
router
  .group(() => {
    // Début du groupe de routes

    router.get('/signup', [NewAccountController, 'create']).as('new_account.create') // Route GET qui affiche la page d'inscription

    router.post('/signup', [NewAccountController, 'store']).as('new_account.store') // Route POST qui envoie les données du formulaire pour créer un compte

    router.get('/verify-otp', [NewAccountController, 'showOtpPage']).as('otp.create') // Route GET qui affiche la page où l'utilisateur doit entrer son code OTP

    router.post('/verify-otp', [AuthController, 'verifyOtp']).as('verify.otp') // Route POST qui vérifie le code OTP saisi par l'utilisateur

    router.post('/resend-otp', [AuthController, 'resendOtp']).as('otp.resend') // Route POST qui permet de renvoyer un nouveau code OTP à l'utilisateur

    router
      .get('/login', async ({ view }) => {
        // Route GET pour afficher la page de connexion
        return view.render('pages/login') // Rend la vue pages/login
      })
      .as('session.create') // Donne un nom à la route pour pouvoir l'utiliser facilement dans les vues et redirections

    router.post('/login', [SessionController, 'store']).as('session.store') // Route POST qui traite la connexion de l'utilisateur
  })
  .middleware([middleware.guest()]) // Applique le middleware guest pour empêcher les utilisateurs connectés d'accéder à ces routes

// Groupe de routes accessibles uniquement aux utilisateurs connectés
router
  .group(() => {
    // Début du groupe sécurisé

    router.post('/logout', [SessionController, 'destroy']).as('session.destroy') // Route POST qui permet à l'utilisateur de se déconnecter

    router
      .get('/profile', async ({ auth, view }) => {
        // Route GET pour afficher la page du profil utilisateur
        return view.render('pages/profile', { user: auth.user }) // Rend la vue profile en envoyant les informations de l'utilisateur connecté
      })
      .as('profile') // Donne un nom à la route profile

    router.get('/timeline', [TimelineController, 'index']).as('timeline') // Route GET qui affiche le timeline (fil des posts)
  })
  .middleware([middleware.auth()]) // Applique le middleware auth pour restreindre l'accès uniquement aux utilisateurs connectés
