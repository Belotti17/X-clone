import type { HttpContext } from '@adonisjs/core/http'
import Tweet from '#models/tweet'
import User from '#models/user'
import Follow from '#models/follow'

export default class TimelineController {
  /**
   * Affiche la timeline principale (For you)
   * Mélange les tweets des personnes suivies et les tweets de l'utilisateur
   */
  async index({ view, auth }: HttpContext) {
    // Récupère l'utilisateur connecté via la session
    const user = await auth.use('web').user

    // Si l'utilisateur n'est pas connecté, redirige vers la page d'inscription
    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupère la liste des IDs des utilisateurs que l'utilisateur suit
    const follows = await Follow.query().where('followerId', user.id).select('followingId')

    // Extrait les IDs des personnes suivies
    const followingIds = follows.map((f) => f.followingId)
    // Ajoute l'ID de l'utilisateur lui‑même pour voir aussi ses propres tweets
    followingIds.push(user.id)

    // Requête des tweets : seulement ceux qui ne sont pas des réponses (isReply = false)
    const tweets = await Tweet.query()
      .whereIn('userId', followingIds) // tweets des personnes suivies + utilisateur
      .where('isReply', false) // exclut les réponses
      .preload('user') // charge l'utilisateur associé à chaque tweet
      .preload('originalTweet', (query) => {
        // pour les retweets, charge le tweet original
        query.preload('user').preload('likes').preload('retweets')
      })
      .preload('likes') // charge les likes pour compter
      .preload('retweets') // charge les retweets pour compter
      .orderBy('createdAt', 'desc') // tri du plus récent au plus ancien
      .limit(50) // limite à 50 tweets

    // Pour chaque tweet, calcule les compteurs (likes, retweets, réponses)
    // et détermine si l'utilisateur a liké ce tweet
    for (const tweet of tweets) {
      // Compte les likes
      tweet.$extras.likesCount = tweet.likes.length
      // Compte les retweets
      tweet.$extras.retweetsCount = tweet.retweets.length
      // Compte les réponses (sans charger tous les objets)
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      // Vérifie si l'utilisateur a déjà liké ce tweet
      const hasLiked = tweet.likes.some((like) => like.userId === user.id)
      tweet.$extras.userLiked = hasLiked

      // Si c'est un retweet, ajoute les mêmes informations pour le tweet original
      if (tweet.isRetweet && tweet.originalTweet) {
        tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
        tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
        const originalRepliesCount = await Tweet.query()
          .where('parentTweetId', tweet.originalTweet.id)
          .where('isReply', true)
          .count('* as total')
        tweet.originalTweet.$extras.repliesCount = Number(originalRepliesCount[0].$extras.total)
        const hasLikedOriginal = tweet.originalTweet.likes.some((like) => like.userId === user.id)
        tweet.originalTweet.$extras.userLiked = hasLikedOriginal
      }
    }

    // Suggestions de comptes à suivre : utilisateurs que l'utilisateur ne suit pas encore
    const suggestions = await User.query()
      .whereNot('id', user.id) // exclut l'utilisateur lui‑même
      .whereNotIn('id', followingIds) // exclut ceux déjà suivis
      .limit(5) // limite à 5 suggestions

    // Rend la vue de la timeline principale avec les données
    return view.render('pages/index', { user, tweets, suggestions })
  }

  /**
   * Affiche la page "Abonnements" (following)
   * Liste des utilisateurs que l'utilisateur connecté suit
   */
  async following({ view, auth }: HttpContext) {
    // Récupère l'utilisateur connecté
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupère la liste des relations "follow" où l'utilisateur est le follower
    const follows = await Follow.query()
      .where('followerId', user.id) // l'utilisateur suit quelqu'un
      .preload('following') // charge l'utilisateur suivi (relation)
      .orderBy('createdAt', 'desc') // tri par date de follow (optionnel)
      .limit(50)

    // Extrait les objets utilisateur suivis à partir des relations
    const followingUsers = follows.map((f) => f.following)

    // Suggestions pour la colonne de droite (comme dans la timeline)
    const followingIds = follows.map((f) => f.followingId)
    const suggestions = await User.query()
      .whereNot('id', user.id) // exclut l'utilisateur lui‑même
      .whereNotIn('id', followingIds) // exclut ceux déjà suivis
      .limit(5)

    // Rend la vue spécifique "pages/following" avec la liste des abonnements
    return view.render('pages/following', { user, followingUsers, suggestions })
  }

  /**
   * Page Explore (découverte) – tweets populaires récents
   */
  async explore({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    // Récupère les tweets récents (pas de filtre de suivi)
    const tweets = await Tweet.query()
      .where('isReply', false) // exclut les réponses
      .preload('user')
      .preload('originalTweet', (query) => {
        query.preload('user').preload('likes').preload('retweets')
      })
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Calcule les compteurs pour chaque tweet (sans vérification de like, car pas nécessaire ici)
    for (const tweet of tweets) {
      tweet.$extras.likesCount = tweet.likes.length
      tweet.$extras.retweetsCount = tweet.retweets.length
      const repliesCount = await Tweet.query()
        .where('parentTweetId', tweet.id)
        .where('isReply', true)
        .count('* as total')
      tweet.$extras.repliesCount = Number(repliesCount[0].$extras.total)

      if (tweet.isRetweet && tweet.originalTweet) {
        tweet.originalTweet.$extras.likesCount = tweet.originalTweet.likes.length
        tweet.originalTweet.$extras.retweetsCount = tweet.originalTweet.retweets.length
        const originalRepliesCount = await Tweet.query()
          .where('parentTweetId', tweet.originalTweet.id)
          .where('isReply', true)
          .count('* as total')
        tweet.originalTweet.$extras.repliesCount = Number(originalRepliesCount[0].$extras.total)
      }
    }

    return view.render('pages/explore', { user, tweets })
  }

  /**
   * Page Notifications (à implémenter ultérieurement)
   */
  async notifications({ view, auth }: HttpContext) {
    const user = await auth.use('web').user
    const notifications: any[] = [] // tableau vide pour l'instant
    return view.render('pages/notifications', { user, notifications })
  }

  /**
   * Page Communautés – suggestions d'utilisateurs à suivre
   */
  async communities({ view, auth }: HttpContext) {
    const user = await auth.use('web').user

    if (!user) {
      return view.render('pages/auth/signup')
    }

    // Récupère les IDs des personnes déjà suivies
    const follows = await Follow.query().where('followerId', user.id).select('followingId')
    const followingIds = follows.map((f) => f.followingId)

    // Suggestions : utilisateurs non suivis et différents de l'utilisateur
    const suggestions = await User.query()
      .whereNot('id', user.id)
      .whereNotIn('id', followingIds)
      .limit(20)

    return view.render('pages/communities', { user, suggestions })
  }
}
