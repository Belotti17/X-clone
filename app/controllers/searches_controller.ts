// Importation des types nécessaires depuis AdonisJS
import type { HttpContext } from '@adonisjs/core/http'

// Importation des modèles
import User from '#models/user' // Modèle Utilisateur
import Tweet from '#models/tweet' // Modèle Tweet/Post
import Follow from '#models/follow' // Modèle Follow (abonnements)

// Interface pour typer les hashtags
interface HashtagResult {
  tag: string // Le hashtag (ex: "#AdonisJS")
  count: number // Le nombre d'occurrences
}

export default class SearchesController {
  /*
   * Méthode principale de recherche
   * Gère les requêtes GET /search?q=mot&tab=onglet
   */
  async index({ request, view, auth }: HttpContext) {
    // Récupération de l'utilisateur actuellement connecté
    const currentUser = await auth.use('web').user

    // Récupération du terme de recherche depuis l'URL
    const query = request.input('q', '').trim()

    // Initialisation des tableaux vides pour stocker les résultats
    let users: any[] = []
    let tweets: any[] = []
    let hashtags: HashtagResult[] = []
    let activeTab = 'top'

    // Récupération de l'onglet demandé dans l'URL
    const tab = request.input('tab', 'top')
    activeTab = tab

    // RÉCUPÉRATION DES IDs DES UTILISATEURS DÉJÀ SUIVIS

    let followingIds: number[] = []
    if (currentUser) {
      const following = await Follow.query()
        .where('followerId', currentUser.id)
        .select('followingId')
      followingIds = following.map((f) => f.followingId)
    }

    // Vérification : on ne lance la recherche que si la requête contient au moins 1 caractère
    if (query.length > 0) {
      // 1. RECHERCHE D'UTILISATEURS

      if (tab === 'users' || tab === 'top') {
        users = await User.query()
          .where('username', 'ILIKE', `%${query}%`)
          .orWhere('name', 'ILIKE', `%${query}%`)
          .limit(20)

        if (currentUser && users.length > 0) {
          users = users.map((user) => ({
            ...user.$attributes,
            isFollowing: followingIds.includes(user.id),
            isCurrentUser: currentUser.id === user.id,
          }))
        }
      }

      // 2. RECHERCHE DE TWEETS

      if (tab === 'posts' || tab === 'top') {
        tweets = await Tweet.query()
          .where('content', 'ILIKE', `%${query}%`)
          .where('isReply', false)
          .preload('user')
          .preload('likes')
          .preload('retweets')
          .orderBy('createdAt', 'desc')
          .limit(30)

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
      }

      // 3. RECHERCHE DE HASHTAGS

      if (tab === 'hashtags' || tab === 'top') {
        const hashtagRegex = /#[\p{L}\p{N}\p{M}_]+/gu

        const allTweets = await Tweet.query()
          .where('content', 'ILIKE', '%#%')
          .select('content')
          .limit(100)

        const hashtagMap = new Map<string, number>()

        for (const tweet of allTweets) {
          const content = tweet.content ?? ''
          const matches = content.match(hashtagRegex) || []

          for (const match of matches) {
            const tag = match.toLowerCase()
            hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
          }
        }

        const searchLower = query.toLowerCase()
        hashtags = Array.from(hashtagMap.entries())
          .filter(([tag]: [string, number]) => tag.toLowerCase().includes(searchLower))
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]: [string, number]) => ({ tag, count }))
      }
    }

    // SUGGESTIONS D'UTILISATEURS
    // EXCLUT LES UTILISATEURS DÉJÀ SUIVIS

    let suggestions: any[] = []

    // Vérifie si:
    // 1. Aucune recherche n'a été faite
    // 2. Un utilisateur est connecté
    if (!query && currentUser) {
      // CORRECTION : Exclut les utilisateurs déjà suivis
      // whereNotIn('id', followingIds) = exclut les IDs des personnes déjà suivies
      suggestions = await User.query()
        .whereNot('id', currentUser.id) // Exclut l'utilisateur connecté
        .whereNotIn('id', followingIds) // EXCLUT LES UTILISATEURS DÉJÀ SUIVIS
        .orderByRaw('RANDOM()') // Tri aléatoire
        .limit(5) // 5 suggestions maximum
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
   */
  async hashtag({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const tag = params.tag.startsWith('#') ? params.tag : `#${params.tag}`

    // Récupération des IDs des utilisateurs déjà suivis
    let followingIds: number[] = []
    if (currentUser) {
      const following = await Follow.query()
        .where('followerId', currentUser.id)
        .select('followingId')
      followingIds = following.map((f) => f.followingId)
    }

    const tweets = await Tweet.query()
      .where('content', 'ILIKE', `%${tag}%`)
      .orWhere('content', 'ILIKE', `%${tag.toLowerCase()}%`)
      .orWhere('content', 'ILIKE', `%${tag.toUpperCase()}%`)
      .where('isReply', false)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

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

    // Suggestions excluant les utilisateurs déjà suivis
    let suggestions: any[] = []
    if (currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .whereNotIn('id', followingIds) //  EXCLUT LES UTILISATEURS DÉJÀ SUIVIS
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
