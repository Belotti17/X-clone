import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tweet from '#models/tweet'
import Follow from '#models/follow'

export default class ProfileController {
  async show({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const username = params.username || currentUser?.username

    if (!username) {
      return view.render('pages/auth/signup')
    }

    // Récupérer l'utilisateur du profil
    const profileUser = await User.findByOrFail('username', username)

    // Vérifier si l'utilisateur courant suit ce profil
    let isFollowing = false
    if (currentUser && currentUser.id !== profileUser.id) {
      const follow = await Follow.query()
        .where('followerId', currentUser.id)
        .where('followingId', profileUser.id)
        .first()
      isFollowing = !!follow
    }

    // Récupérer les tweets de l'utilisateur (uniquement les tweets, pas les réponses)
    const tweets = await Tweet.query()
      .where('userId', profileUser.id)
      .where('isReply', false)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Ajouter les compteurs
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

    // Compter les followers et following
    const followersCount = await Follow.query()
      .where('followingId', profileUser.id)
      .count('* as total')
    const followingCount = await Follow.query()
      .where('followerId', profileUser.id)
      .count('* as total')

    return view.render('pages/profile', {
      profileUser,
      currentUser,
      tweets,
      isFollowing,
      followersCount: Number(followersCount[0].$extras.total),
      followingCount: Number(followingCount[0].$extras.total),
    })
  }

  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const data = request.only(['name', 'bio', 'avatar'])

    user.merge(data)
    await user.save()

    session.flash('success', 'Profil mis à jour')
    return response.redirect().back()
  }

  async followers({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const username = params.username

    const profileUser = await User.findByOrFail('username', username)

    const followers = await Follow.query()
      .where('followingId', profileUser.id)
      .preload('follower')
      .orderBy('createdAt', 'desc')
      .limit(50)

    return view.render('pages/followers', {
      profileUser,
      currentUser,
      followers: followers.map((f) => f.follower),
    })
  }

  async following({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const username = params.username

    const profileUser = await User.findByOrFail('username', username)

    const following = await Follow.query()
      .where('followerId', profileUser.id)
      .preload('following')
      .orderBy('createdAt', 'desc')
      .limit(50)

    return view.render('pages/following', {
      profileUser,
      currentUser,
      following: following.map((f) => f.following),
    })
  }
}
