//Mail configuration

import env from '#start/env' // Import du module env qui permet de lire les variables d'environnement du fichier .env
import { defineConfig, transports } from '@adonisjs/mail' // Import des fonctions nécessaires pour définir la configuration du mail et utiliser les transports SMTP

//Conversion du port SMTP en number

const smtpPort = Number(env.get('SMTP_PORT') || 587) // Récupère la variable SMTP_PORT depuis le fichier .env et la convertit en nombre ; si elle n'existe pas, utilise 587 par défaut

//Vérifie si connexion sécurisée

const isSecure = smtpPort === 465 // Vérifie si le port utilisé est 465 ; si oui, la connexion SMTP sera sécurisée (true), sinon non (false)

const mailConfig = defineConfig({
  // Déclaration de l'objet de configuration principal du système de mail AdonisJS
  default: 'smtp', // Définit le transporteur par défaut qui sera utilisé pour envoyer les emails (ici SMTP)

  from: {
    // Définition de l'expéditeur par défaut des emails envoyés par l'application
    address: env.get('MAIL_FROM_ADDRESS') || 'no-reply@example.com', // Adresse email de l'expéditeur récupérée depuis le fichier .env ou valeur par défaut
    name: env.get('MAIL_FROM_NAME') || 'X Clone', // Nom affiché comme expéditeur dans les emails
  },

  mailers: {
    // Déclaration de tous les transporteurs d'email disponibles dans l'application
    smtp: transports.smtp({
      // Configuration du transporteur SMTP pour l'envoi des emails
      host: env.get('SMTP_HOST') || 'smtp.gmail.com', // Adresse du serveur SMTP récupérée depuis .env ou utilisation de Gmail par défaut

      port: smtpPort, // Port utilisé pour la connexion au serveur SMTP

      secure: isSecure, // Indique si la connexion doit être sécurisée (true pour SSL/TLS) ou non

      auth: {
        // Configuration de l'authentification pour se connecter au serveur SMTP
        type: 'login', // Type d'authentification utilisé pour le SMTP (login classique avec username et password)
        user: env.get('SMTP_USERNAME') || '', // Nom d'utilisateur SMTP récupéré depuis les variables d'environnement
        pass: env.get('SMTP_PASSWORD') || '', // Mot de passe SMTP récupéré depuis les variables d'environnement
      },
    }),
  },
})

export default mailConfig // Exporte la configuration du mail afin qu'elle puisse être utilisée dans toute l'application
