// app/controllers/searches_controller.ts

// Importation des types nécessaires depuis AdonisJS pour gérer la requête HTTP
import type { HttpContext } from '@adonisjs/core/http'

// Importation des modèles pour interagir avec la base de données
import User from '#models/user' // Modèle Utilisateur
import Tweet from '#models/tweet' // Modèle Tweet/Post
import Follow from '#models/follow' // Modèle Follow (abonnements)

// Définition d'une interface pour typer les hashtags correctement
// Cela résout l'erreur de type 'string[]' vs objet
interface HashtagResult {
  tag: string // Le hashtag (ex: "#AdonisJS")
  count: number // Le nombre d'occurrences
}

export default class SearchesController {
  /**
   * Méthode principale de recherche
   * Gère les requêtes GET /search?q=mot&tab=onglet
   */
  async index({ request, view, auth }: HttpContext) {
    // Récupération de l'utilisateur actuellement connecté (peut être null)
    const currentUser = await auth.use('web').user

    // Récupération du terme de recherche depuis l'URL, suppression des espaces
    const query = request.input('q', '').trim()

    // Initialisation des tableaux vides pour stocker les résultats
    let users: any[] = [] // Tableau des utilisateurs trouvés
    let tweets: any[] = [] // Tableau des tweets trouvés
    let hashtags: HashtagResult[] = [] // Tableau des hashtags avec leur compteur (typage explicite)
    let activeTab = 'top' // Onglet actif par défaut : 'top' (tous les résultats)

    // Récupération de l'onglet demandé dans l'URL (ex: ?tab=users)
    const tab = request.input('tab', 'top')
    activeTab = tab

    // Vérification : on ne lance la recherche que si la requête contient au moins 1 caractère
    if (query.length > 0) {
      // ==============================================
      // 1. RECHERCHE D'UTILISATEURS
      // ==============================================
      // On recherche uniquement si l'onglet 'users' ou 'top' est actif
      if (tab === 'users' || tab === 'top') {
        // Requête SQL: WHERE username LIKE %query% OR name LIKE %query%
        // .limit(20) limite à 20 résultats maximum
        users = await User.query()
          .where('username', 'LIKE', `%${query}%`)
          .orWhere('name', 'LIKE', `%${query}%`)
          .limit(20)

        // Si un utilisateur est connecté, on détermine pour chaque résultat
        // si l'utilisateur connecté suit déjà cette personne
        if (currentUser && users.length > 0) {
          // Récupération de tous les follows de l'utilisateur connecté
          const following = await Follow.query()
            .where('followerId', currentUser.id)
            .select('followingId')

          // Création d'un Set (structure de données unique) pour recherche rapide
          // Set permet de vérifier en O(1) si un ID est présent
          const followingIds = new Set(following.map((f) => f.followingId))

          // Transformation du tableau users pour ajouter les propriétés isFollowing et isCurrentUser
          // .$attributes permet d'accéder aux propriétés brutes du modèle
          users = users.map((user) => ({
            ...user.$attributes, // Copie toutes les propriétés existantes
            isFollowing: followingIds.has(user.id), // true si l'utilisateur connecté suit cette personne
            isCurrentUser: currentUser.id === user.id, // true si c'est le profil de l'utilisateur lui-même
          }))
        }
      }

      // ==============================================
      // 2. RECHERCHE DE TWEETS (POSTS)
      // ==============================================
      // On recherche uniquement si l'onglet 'posts' ou 'top' est actif
      if (tab === 'posts' || tab === 'top') {
        // Requête: WHERE content LIKE %query% ET ce n'est pas une réponse (isReply = false)
        // On précharge les relations: user (auteur), likes, retweets
        // .preload() = jointure SQL pour éviter les requêtes N+1
        tweets = await Tweet.query()
          .where('content', 'LIKE', `%${query}%`)
          .where('isReply', false)
          .preload('user') // Chargement de l'auteur du tweet
          .preload('likes') // Chargement des likes
          .preload('retweets') // Chargement des retweets
          .orderBy('createdAt', 'desc') // Tri du plus récent au plus ancien
          .limit(30) // Limite à 30 tweets maximum

        // Boucle sur chaque tweet pour ajouter des métadonnées (compteurs)
        for (const tweet of tweets) {
          // Utilisation de $extras pour stocker des données calculées non persistantes
          // .length donne le nombre de likes (tableau)
          tweet.$extras.likesCount = tweet.likes.length
          tweet.$extras.retweetsCount = tweet.retweets.length

          // Comptage des réponses (replies) à ce tweet
          // isReply = true et parentTweetId = tweet.id
          // Utilisation de .count('* as total') pour un compteur SQL
          const repliesCount = await Tweet.query()
            .where('parentTweetId', tweet.id)
            .where('isReply', true)
            .count('* as total')

          // Conversion en nombre (car le résultat peut être string ou number)
          // Le double + (opérateur unaire) convertit en nombre
          // $extras.total contient le résultat du COUNT
          tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

          // Si un utilisateur est connecté, on vérifie s'il a liké ce tweet
          if (currentUser) {
            // .some() retourne true si au moins un élément du tableau satisfait la condition
            // like.userId === currentUser.id vérifie si l'utilisateur a liké
            const hasLiked = tweet.likes.some((like: any) => like.userId === currentUser.id)
            tweet.$extras.userLiked = hasLiked
          }
        }
      }

      // ==============================================
      // 3. RECHERCHE DE HASHTAGS
      // ==============================================
      // On recherche uniquement si l'onglet 'hashtags' ou 'top' est actif
      if (tab === 'hashtags' || tab === 'top') {
        // Expression régulière pour extraire les hashtags
        // \p{L} = n'importe quelle lettre (unicode)
        // \p{N} = n'importe quel chiffre
        // \p{M} = caractères diacritiques (accents)
        // /gu = drapeaux: g (global) et u (unicode)
        const hashtagRegex = /#[\p{L}\p{N}\p{M}_]+/gu

        // Récupération des tweets contenant des hashtags (ceux avec #)
        // On limite à 100 tweets pour éviter une surcharge
        const allTweets = await Tweet.query()
          .where('content', 'LIKE', '%#%')
          .select('content')
          .limit(100)

        // Map pour compter les occurrences de chaque hashtag
        // Map = structure clé/valeur plus performante qu'un objet pour ce cas
        const hashtagMap = new Map<string, number>()

        // Parcours de chaque tweet
        for (const tweet of allTweets) {
          // Vérification que tweet.content n'est pas null avant d'utiliser .match()
          // L'opérateur ?? [] retourne un tableau vide si content est null
          const content = tweet.content ?? ''
          const matches = content.match(hashtagRegex) || []

          // Pour chaque hashtag trouvé
          for (const match of matches) {
            // Conversion en minuscules pour éviter les doublons (#Adonis = #adonis)
            const tag = match.toLowerCase()
            // Incrémentation du compteur: (ancienne valeur ou 0) + 1
            hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
          }
        }

        // Transformation du Map en tableau d'objets { tag, count }
        // Array.from() convertit un Map en tableau
        // On filtre pour ne garder que les hashtags contenant le terme recherché
        // On trie par nombre d'occurrences décroissant (le plus populaire en premier)
        // On limite à 10 résultats maximum
        hashtags = Array.from(hashtagMap.entries())
          .filter(([tag]: [string, number]) => tag.toLowerCase().includes(query.toLowerCase()))
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]: [string, number]) => ({ tag, count }))
      }
    }

    // ==============================================
    // SUGGESTIONS D'UTILISATEURS (si aucune recherche)
    // ==============================================
    let suggestions: any[] = []

    // Si pas de recherche ET un utilisateur est connecté, on propose 5 utilisateurs aléatoires
    if (!query && currentUser) {
      // Récupération de 5 utilisateurs aléatoires différents de l'utilisateur connecté
      // .orderByRaw('RANDOM()') est spécifique à PostgreSQL pour le tri aléatoire
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .orderByRaw('RANDOM()')
        .limit(5)
    }

    // ==============================================
    // RENDU DE LA VUE
    // ==============================================
    // Passage de toutes les variables à la vue search.edge
    return view.render('pages/search', {
      currentUser, // Utilisateur connecté
      query, // Terme de recherche
      users, // Résultats utilisateurs
      tweets, // Résultats tweets
      hashtags, // Résultats hashtags (typage correct)
      suggestions, // Suggestions aléatoires
      activeTab, // Onglet actif
      hasResults: query.length > 0, // true si une recherche a été faite
      searchPerformed: query.length > 0, // true si une recherche a été faite
    })
  }

  /**
   * Méthode pour rechercher par hashtag spécifique
   * Exemple: /search/hashtag/adonisjs
   */
  async hashtag({ params, view, auth }: HttpContext) {
    // Récupération de l'utilisateur connecté
    const currentUser = await auth.use('web').user

    // Récupération du tag depuis l'URL, ajout du # s'il n'existe pas
    // Exemple: "adonisjs" devient "#adonisjs"
    const tag = params.tag.startsWith('#') ? params.tag : `#${params.tag}`

    // Recherche des tweets contenant ce hashtag exact ou approximatif
    // Utilisation de LIKE avec % pour une recherche flexible
    const tweets = await Tweet.query()
      .where('content', 'LIKE', `%${tag}%`)
      .where('isReply', false)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50) // Limite à 50 tweets pour la recherche hashtag

    // Boucle sur chaque tweet pour ajouter les métadonnées (compteurs)
    for (const tweet of tweets) {
      // Comptage des likes
      tweet.$extras.likesCount = tweet.likes.length
      // Comptage des retweets
      tweet.$extras.retweetsCount = tweet.retweets.length

      // Comptage des réponses
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      // Vérification si l'utilisateur connecté a liké ce tweet
      if (currentUser) {
        const hasLiked = tweet.likes.some((like: any) => like.userId === currentUser.id)
        tweet.$extras.userLiked = hasLiked
      }
    }

    // Suggestions d'utilisateurs aléatoires
    let suggestions: any[] = []
    if (currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .orderByRaw('RANDOM()')
        .limit(5)
    }

    // Rendu de la vue avec les résultats
    return view.render('pages/search', {
      currentUser,
      query: tag, // Le hashtag recherché devient le terme de recherche
      users: [], // Pas de résultats utilisateurs
      tweets, // Tweets contenant le hashtag
      hashtags: [], // Pas de sous-hashtags
      suggestions,
      activeTab: 'posts', // Onglet posts actif par défaut
      hasResults: tweets.length > 0,
      searchPerformed: true,
      isHashtagSearch: true, // Indique que c'est une recherche par hashtag
    })
  }
}
