# X Clone - AdonisJS

## Description

Ce projet est un clone simplifié de la plateforme **X (anciennement Twitter)**, développé avec **AdonisJS** en architecture MVC et utilisant **PostgreSQL** comme base de données.

L'application permet aux utilisateurs de publier des tweets, interagir avec du contenu (likes, commentaires, retweets), suivre d'autres utilisateurs et gérer leur authentification avec vérification OTP.

## Fonctionnalités

### Authentification et gestion des utilisateurs

- Inscription avec email
- Vérification OTP (email avec expiration)
- Connexion sécurisée avec session
- Déconnexion
- Protection des routes avec middleware (auth, guest)
- Vérification d’email (isVerified)
- Gestion de session persistante

### Tweets

- Création de tweets
- Suppression de tweets (uniquement par l’auteur)
- Affichage dynamique des tweets (timeline)
- Upload de média (image + vidéo)
- Preview avant publication
- Validation des données côté serveur

### Interactions

- Like / Unlike d’un tweet (AJAX)
- Commenter un tweet
- Retweet (avec ou sans commentaire)
- Compteurs dynamiques (likes, retweets, réponses)

### Follows

- Suivre / Se désabonner d’un utilisateur
- Relations via table pivot (follows)
- Timeline dynamique basée sur les abonnements
- Suggestions de comptes à suivre

### Interface utilisateur

- Interface inspirée de X
- Sidebar + Timeline + Suggestions
- Modales dynamiques (tweet, reply, retweet)
- Feedback utilisateur (flash messages)
- UI interactive avec JavaScript (fetch API)

## Technologies utilisées

- **Backend** : AdonisJS (MVC)
- **Frontend** : Edge Templates + CSS
- **Base de données** : PostgreSQL
- **ORM** : Lucid ORM
- **Validation** : VineJS
- **Authentification** : AdonisJS Auth (session-based)
- **Email** : AdonisJS Mail (OTP)
- **JavaScript** : Vanilla JS (AJAX, preview, interactions)
- **Upload fichiers** : Images & vidéos (multipart/form-data)

---

##  Structure du projet

```
app/
├── Controllers/
├── Models/
├── Validators/
├── Middleware/

resources/
├── views/
│   ├── layouts/
│   ├── pages/
│   └── components/

start/
├── routes.ts

database/
├── migrations/
├── seeders/
```

---

##  Installation

### 1. Cloner le projet

```bash
git clone https://github.com/Belotti17/X-clone
---

### 2. Installer les dépendances

```bash
npm install
```

---

### 3. Configurer l’environnement

Créer un fichier `.env` :

```env
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=development
LOG_LEVEL=info

# Application
APP_KEY=
APP_URL=http://localhost:3333

# Database
SESSION_DRIVER=cookie
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=app

# Mail (Brevo SMTP)
MAIL_MAILER=smtp
MAIL_FROM_NAME="Clone X"
MAIL_FROM_ADDRESS=adresse-expediteur-verifiee@example.com
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=votre-identifiant-smtp-brevo
SMTP_PASSWORD=votre-cle-smtp-brevo
```

`SMTP_USERNAME` et `SMTP_PASSWORD` sont les identifiants SMTP fournis par Brevo (pas la clé API). L'adresse `MAIL_FROM_ADDRESS` doit être vérifiée chez le fournisseur. Remplacez ces valeurs par celles de votre fournisseur SMTP, puis redémarrez le serveur après toute modification du `.env`.

---

### 4. Générer la clé de l’application

```bash
node ace generate:key
```

---

### 5. Lancer les migrations

```bash
node ace migration:run
```

---

### 6. Lancer le serveur

```bash
node ace serve --watch
```

---

##  Routes principales

| Méthode | Route           | Description          |
| ------- | --------------- | -------------------- |
| POST    | /signup         | Inscription          |
| POST    | /verify-otp     | Vérification OTP     |
| POST    | /login          | Connexion            |
| GET     | /timeline       | Timeline utilisateur |
| POST    | /tweets         | Créer un tweet       |
| POST    | /tweets//like   | Like / Unlike        |
| POST    | /tweets//delete | Supprimer un tweet   |
| POST    | /follow/        | Suivre utilisateur   |
| POST    | /logout         | Déconnexion          |

---

##  Architecture

Le projet suit le pattern **MVC** :

- **Models** → Gestion des données (User, Tweet, Like, Follow, etc.)
- **Controllers** → Logique métier (auth, tweets, timeline)
- **Views (Edge)** → Rendu côté serveur
- **Middleware** → Sécurité et accès aux routes

---

##  Sécurité

- Protection CSRF intégrée
- Validation des données avec VineJS
- Hash des mots de passe
- OTP avec expiration
- Sessions sécurisées (cookies HTTP only)

---

##  Fonctionnalités avancées

- Upload image + vidéo avec preview
- Envoi de formulaire via AJAX (fetch)
- Système OTP complet (génération, validation, expiration)
- Timeline personnalisée (followings + user)
- Gestion des erreurs côté client et serveur

---

##  Améliorations possibles

- (WebSocket)
- Upload cloud (Cloudinary / S3)
- Pagination des tweets
- Infinite scroll
- Système de bookmarks
- Dark mode

---

## Auteur

**Belotti WENZE**

Projet réalisé dans le cadre d’un apprentissage avancé fullstack avec AdonisJS.

##  Licence

Ce projet est à but éducatif.
