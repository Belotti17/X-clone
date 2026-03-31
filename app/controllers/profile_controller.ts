import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tweet from '#models/tweet'
import Follow from '#models/follow'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export default class ProfileController {
  async show({ params, view, auth }: HttpContext) {
    const currentUser = await auth.use('web').user
    const username = params.username || currentUser?.username

    if (!username) {
      return view.render('pages/auth/signup')
    }

    const profileUser = await User.findByOrFail('username', username)

    let isFollowing = false
    if (currentUser && currentUser.id !== profileUser.id) {
      const follow = await Follow.query()
        .where('followerId', currentUser.id)
        .where('followingId', profileUser.id)
        .first()
      isFollowing = !!follow
    }

    const tweets = await Tweet.query()
      .where('userId', profileUser.id)
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

    const followersCount = await Follow.query()
      .where('followingId', profileUser.id)
      .count('* as total')
    const followingCount = await Follow.query()
      .where('followerId', profileUser.id)
      .count('* as total')

    const suggestions = await User.query()
      .whereNot('id', currentUser?.id || 0)
      .whereNotIn('id', [profileUser.id])
      .limit(5)

    return view.render('pages/profile', {
      profileUser,
      currentUser,
      tweets,
      isFollowing,
      followersCount: Number(followersCount[0].$extras.total),
      followingCount: Number(followingCount[0].$extras.total),
      suggestions,
    })
  }

  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!

    // Récupérer les champs texte
    const name = request.input('name')
    const bio = request.input('bio')

    // Récupérer les fichiers
    const profilePicture = request.file('profile_picture', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    const bannerPicture = request.file('banner_picture', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    // Mettre à jour le nom et la bio
    if (name) {
      user.name = name
    }
    if (bio !== undefined) {
      user.bio = bio
    }

    // Gérer l'upload de la photo de profil
    if (profilePicture && profilePicture.isValid) {
      const fileName = `${randomUUID()}.${profilePicture.extname}`
      await profilePicture.move(path.join(process.cwd(), 'public/uploads/profiles'), {
        name: fileName,
      })
      user.profile_picture = `/uploads/profiles/${fileName}`
    } else if (profilePicture && !profilePicture.isValid) {
      // CORRECTION : media.errors est un tableau, on prend le premier message
      const errorMessage =
        profilePicture.errors && profilePicture.errors[0]
          ? profilePicture.errors[0].message
          : 'Format de photo de profil non supporté'
      session.flash('error', errorMessage)
      return response.redirect().back()
    }

    // Gérer l'upload de la photo de couverture
    if (bannerPicture && bannerPicture.isValid) {
      const fileName = `${randomUUID()}.${bannerPicture.extname}`
      await bannerPicture.move(path.join(process.cwd(), 'public/uploads/banners'), {
        name: fileName,
      })
      user.banner_picture = `/uploads/banners/${fileName}`
    } else if (bannerPicture && !bannerPicture.isValid) {
      // CORRECTION : media.errors est un tableau, on prend le premier message
      const errorMessage =
        bannerPicture.errors && bannerPicture.errors[0]
          ? bannerPicture.errors[0].message
          : 'Format de photo de couverture non supporté'
      session.flash('error', errorMessage)
      return response.redirect().back()
    }

    await user.save()

    session.flash('success', 'Profil mis à jour avec succès !')
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
