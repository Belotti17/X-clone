// Importation des types nécessaires depuis AdonisJS pour gérer la requête HTTP
import type { HttpContext } from '@adonisjs/core/http'

// Importation des modèles pour interagir avec la base de données
import User from '#models/user' // Modèle Utilisateur
import Tweet from '#models/tweet' // Modèle Tweet/Post
import Follow from '#models/follow' // Modèle Follow (abonnements)

// Définition d'une interface pour typer les hashtags correctement
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
    // Conversion en minuscules pour uniformiser (optionnel, mais bonne pratique)
    const query = request.input('q', '').trim()

    // Initialisation des tableaux vides pour stocker les résultats
    let users: any[] = [] // Tableau des utilisateurs trouvés
    let tweets: any[] = [] // Tableau des tweets trouvés
    let hashtags: HashtagResult[] = [] // Tableau des hashtags avec leur compteur
    let activeTab = 'top' // Onglet actif par défaut : 'top' (tous les résultats)

    // Récupération de l'onglet demandé dans l'URL (ex: ?tab=users)
    const tab = request.input('tab', 'top')
    activeTab = tab

    // Vérification : on ne lance la recherche que si la requête contient au moins 1 caractère
    if (query.length > 0) {
      // ==============================================
      // 1. RECHERCHE D'UTILISATEURS (INSENSIBLE À LA CASSE)
      // ==============================================
      //  Utilisation de ILIKE au lieu de LIKE
      // ILIKE = case-insensitive (insensible à la casse)
      if (tab === 'users' || tab === 'top') {
        users = await User.query()
          .where('username', 'ILIKE', `%${query}%`) // ILIKE pour username
          .orWhere('name', 'ILIKE', `%${query}%`) // ILIKE pour name
          .limit(20)

        // Si un utilisateur est connecté, on détermine pour chaque résultat
        // si l'utilisateur connecté suit déjà cette personne
        if (currentUser && users.length > 0) {
          // Récupération de tous les follows de l'utilisateur connecté
          const following = await Follow.query()
            .where('followerId', currentUser.id)
            .select('followingId')

          // Création d'un Set pour recherche rapide
          const followingIds = new Set(following.map((f) => f.followingId))

          // Transformation du tableau users pour ajouter les propriétés
          users = users.map((user) => ({
            ...user.$attributes,
            isFollowing: followingIds.has(user.id),
            isCurrentUser: currentUser.id === user.id,
          }))
        }
      }

      // ==============================================
      // 2. RECHERCHE DE TWEETS (INSENSIBLE À LA CASSE)
      // ==============================================

      if (tab === 'posts' || tab === 'top') {
        tweets = await Tweet.query()
          .where('content', 'ILIKE', `%${query}%`) // ILIKE pour le contenu
          .where('isReply', false)
          .preload('user')
          .preload('likes')
          .preload('retweets')
          .orderBy('createdAt', 'desc')
          .limit(30)

        // Boucle sur chaque tweet pour ajouter des métadonnées
        for (const tweet of tweets) {
          tweet.$extras.likesCount = tweet.likes.length
          tweet.$extras.retweetsCount = tweet.retweets.length

          // Comptage des réponses (replies)
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
      }

      // 3. RECHERCHE DE HASHTAGS (INSENSIBLE À LA CASSE)

      if (tab === 'hashtags' || tab === 'top') {
        // Expression régulière pour extraire les hashtags
        const hashtagRegex = /#[\p{L}\p{N}\p{M}_]+/gu

        // Récupération des tweets contenant des hashtags
        //  ILIKE pour chercher les tweets avec #
        const allTweets = await Tweet.query()
          .where('content', 'ILIKE', '%#%')
          .select('content')
          .limit(100)

        // Map pour compter les occurrences de chaque hashtag
        const hashtagMap = new Map<string, number>()

        // Parcours de chaque tweet
        for (const tweet of allTweets) {
          // Gestion du cas où content est null
          const content = tweet.content ?? ''
          const matches = content.match(hashtagRegex) || []

          // Pour chaque hashtag trouvé
          for (const match of matches) {
            // Conversion en minuscules pour éviter les doublons
            const tag = match.toLowerCase()
            hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
          }
        }

        // Transformation en tableau et filtrage
        //  Filtrage insensible à la casse avec .toLowerCase()
        const searchLower = query.toLowerCase()
        hashtags = Array.from(hashtagMap.entries())
          .filter(([tag]: [string, number]) => tag.toLowerCase().includes(searchLower))
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]: [string, number]) => ({ tag, count }))
      }
    }

    // SUGGESTIONS D'UTILISATEURS

    let suggestions: any[] = []

    if (!query && currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .orderByRaw('RANDOM()')
        .limit(5)
    }

    // Rendu de la vue
    return view.render('pages/search', {
      currentUser,
      query,
      users,
      tweets,
      hashtags,
      suggestions,
      activeTab,
      hasResults: query.length > 0,
      searchPerformed: query.length > 0,
    })
  }

  /**
   * Méthode pour rechercher par hashtag spécifique
   * Exemple: /search/hashtag/adonisjs
   */
  async hashtag({ params, view, auth }: HttpContext) {
    // Récupération de l'utilisateur connecté
    const currentUser = await auth.use('web').user

    // Récupération du tag depuis l'URL
    const tag = params.tag.startsWith('#') ? params.tag : `#${params.tag}`

    // Recherche des tweets contenant ce hashtag (insensible à la casse)
    const tweets = await Tweet.query()
      .where('content', 'ILIKE', `%${tag}%`) // ILIKE pour le contenu
      .orWhere('content', 'ILIKE', `%${tag.toLowerCase()}%`) // Version minuscule
      .orWhere('content', 'ILIKE', `%${tag.toUpperCase()}%`) // Version majuscule
      .where('isReply', false)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Boucle sur chaque tweet pour ajouter les métadonnées
    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length

      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      if (currentUser) {
        const hasLiked = tweet.likes.some((like: any) => like.userId === currentUser.id)
        tweet.$extras.userLiked = hasLiked
      }
    }

    // Suggestions d'utilisateurs
    let suggestions: any[] = []
    if (currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .orderByRaw('RANDOM()')
        .limit(5)
    }

    return view.render('pages/search', {
      currentUser,
      query: tag,
      users: [],
      tweets,
      hashtags: [],
      suggestions,
      activeTab: 'posts',
      hasResults: tweets.length > 0,
      searchPerformed: true,
      isHashtagSearch: true,
    })
  }
}
