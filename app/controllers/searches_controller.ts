
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tweet from '#models/tweet'
import Follow from '#models/follow'

export default class SearchesController {
  async index({ request, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const query = request.input('q', '').trim()
    
    let users: any[] = []
    let tweets: any[] = []
    let hashtags: string[] = []
    let activeTab = 'top'

    // Récupérer l'onglet actif
    const tab = request.input('tab', 'top')
    activeTab = tab

    if (query.length > 0) {
      // 1. RECHERCHE D'UTILISATEURS
      if (tab === 'users' || tab === 'top') {
        users = await User.query()
          .where('username', 'LIKE', `%${query}%`)
          .orWhere('name', 'LIKE', `%${query}%`)
          .limit(20)

        // Ajouter le statut follow pour chaque utilisateur
        if (currentUser && users.length > 0) {
          const following = await Follow.query()
            .where('followerId', currentUser.id)
            .select('followingId')
          const followingIds = new Set(following.map(f => f.followingId))
          
          users = users.map(user => ({
            ...user.$attributes,
            isFollowing: followingIds.has(user.id),
            isCurrentUser: currentUser.id === user.id
          }))
        }
      }

      // 2. RECHERCHE DE TWEETS
      if (tab === 'posts' || tab === 'top') {
        tweets = await Tweet.query()
          .where('content', 'LIKE', `%${query}%`)
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
            const hasLiked = tweet.likes.some((like) => like.userId === currentUser.id)
            tweet.$extras.userLiked = hasLiked
          }
        }
      }

      // 3. RECHERCHE DE HASHTAGS
      if (tab === 'hashtags' || tab === 'top') {
        // Extraire les hashtags du texte
        const hashtagRegex = /#[\p{L}\p{N}_]+/gu
        const allTweets = await Tweet.query()
          .where('content', 'LIKE', `%#%`)
          .select('content')
          .limit(100)
        
        const hashtagMap = new Map<string, number>()
        for (const tweet of allTweets) {
          const matches = tweet.content.match(hashtagRegex) || []
          for (const match of matches) {
            const tag = match.toLowerCase()
            hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1)
          }
        }
        
        // Filtrer par la recherche
        hashtags = Array.from(hashtagMap.entries())
          .filter(([tag]) => tag.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }))
      }
    }

    // Suggestions d'utilisateurs (si pas de recherche)
    let suggestions: any[] = []
    if (!query && currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .orderByRaw('RANDOM()')
        .limit(5)
    }

    return view.render('pages/search', {
      currentUser,
      query,
      users,
      tweets,
      hashtags,
      suggestions,
      activeTab,
      hasResults: query.length > 0,
      searchPerformed: query.length > 0
    })
  }

  // Recherche par hashtag spécifique
  async hashtag({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const tag = params.tag.startsWith('#') ? params.tag : `#${params.tag}`
    
    const tweets = await Tweet.query()
      .where('content', 'LIKE', `%${tag}%`)
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
        const hasLiked = tweet.likes.some((like) => like.userId === currentUser.id)
        tweet.$extras.userLiked = hasLiked
      }
    }

    const suggestions = await User.query()
      .whereNot('id', currentUser?.id || 0)
      .limit(5)

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
      isHashtagSearch: true
    })
  }
}