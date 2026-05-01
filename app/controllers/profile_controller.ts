// app/controllers/profile_controller.ts

import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Tweet from '#models/tweet'
import Follow from '#models/follow'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

export default class ProfileController {
  /**
   * Affiche le profil d'un utilisateur
   */
  async show({ params, view, auth, response }: HttpContext) {
    const currentUser = await auth.use('web').user
    let username = params.username

    // ✅ CORRECTION : Vérifier si username est invalide (undefined, null, 'null', 'undefined', 'NaN', '')
    const invalidUsernames = [undefined, null, 'null', 'undefined', 'NaN', '']

    if (invalidUsernames.includes(username)) {
      // Si l'utilisateur est connecté, rediriger vers son propre profil
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}`)
      }
      // Sinon, rediriger vers la page de connexion/inscription
      return view.render('pages/auth/signup')
    }

    // Récupération de l'utilisateur demandé
    const profileUser = await User.findBy('username', username)

    // Si l'utilisateur n'existe pas
    if (!profileUser) {
      // Rediriger vers le profil de l'utilisateur connecté ou vers l'accueil
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}`)
      }
      return view.render('pages/auth/signup')
    }

    // Vérifier si l'utilisateur connecté suit le profil consulté
    let isFollowing = false
    if (currentUser && currentUser.id !== profileUser.id) {
      const follow = await Follow.query()
        .where('followerId', currentUser.id)
        .where('followingId', profileUser.id)
        .first()
      isFollowing = !!follow
    }

    // Récupération des tweets du profil
    const tweets = await Tweet.query()
      .where('userId', profileUser.id)
      .where('isReply', false)
      .preload('user')
      .preload('likes')
      .preload('retweets')
      .orderBy('createdAt', 'desc')
      .limit(50)

    // Ajout des métadonnées aux tweets
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

    // Compteurs d'abonnés et abonnements
    const followersCount = await Follow.query()
      .where('followingId', profileUser.id)
      .count('* as total')
    const followingCount = await Follow.query()
      .where('followerId', profileUser.id)
      .count('* as total')

    // Suggestions d'utilisateurs
    let suggestions: any[] = []
    if (currentUser) {
      suggestions = await User.query()
        .whereNot('id', currentUser.id)
        .whereNot('id', profileUser.id)
        .limit(5)
    }

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

  /**
   * Mise à jour du profil
   */
  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.use('web').user!
    const name = request.input('name')
    const bio = request.input('bio')

    const profilePicture = request.file('profile_picture', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    const bannerPicture = request.file('banner_picture', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    })

    if (name) {
      user.name = name
    }
    if (bio !== undefined) {
      user.bio = bio
    }

    if (profilePicture && profilePicture.isValid) {
      const fileName = `${randomUUID()}.${profilePicture.extname}`
      await profilePicture.move(path.join(process.cwd(), 'public/uploads/profiles'), {
        name: fileName,
      })
      user.profile_picture = `/uploads/profiles/${fileName}`
    } else if (profilePicture && !profilePicture.isValid) {
      const errorMessage =
        profilePicture.errors && profilePicture.errors[0]
          ? profilePicture.errors[0].message
          : 'Format de photo de profil non supporté'
      session.flash('error', errorMessage)
      return response.redirect().back()
    }

    if (bannerPicture && bannerPicture.isValid) {
      const fileName = `${randomUUID()}.${bannerPicture.extname}`
      await bannerPicture.move(path.join(process.cwd(), 'public/uploads/banners'), {
        name: fileName,
      })
      user.banner_picture = `/uploads/banners/${fileName}`
    } else if (bannerPicture && !bannerPicture.isValid) {
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

  /**
   * FOLLOWERS - Les personnes qui suivent l'utilisateur (ses abonnés)
   */
  async followers({ params, view, auth, response }: HttpContext) {
    const currentUser = await auth.use('web').user
    let username = params.username

    // ✅ CORRECTION : Vérifier si username est invalide
    const invalidUsernames = [undefined, null, 'null', 'undefined', 'NaN', '']

    if (invalidUsernames.includes(username)) {
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}/followers`)
      }
      return view.render('pages/auth/signup')
    }

    const profileUser = await User.findBy('username', username)

    if (!profileUser) {
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}/followers`)
      }
      return view.render('pages/auth/signup')
    }

    const followers = await Follow.query()
      .where('followingId', profileUser.id)
      .preload('follower')
      .orderBy('createdAt', 'desc')
      .limit(50)

    const followersList = followers.map((f) => f.follower)

    const following = await Follow.query()
      .where('followerId', currentUser?.id || 0)
      .select('followingId')
    const followingIdSet = new Set(following.map((f) => f.followingId))

    const suggestions = await User.query()
      .whereNot('id', currentUser?.id || 0)
      .limit(5)

    return view.render('pages/followers', {
      profileUser,
      currentUser,
      followersList,
      followingIdSet,
      suggestions,
    })
  }

  /**
   * FOLLOWING - Les personnes que l'utilisateur suit (ses abonnements)
   */
  async following({ params, view, auth, response }: HttpContext) {
    const currentUser = await auth.use('web').user
    let username = params.username

    // ✅ CORRECTION : Vérifier si username est invalide
    const invalidUsernames = [undefined, null, 'null', 'undefined', 'NaN', '']

    if (invalidUsernames.includes(username)) {
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}/following`)
      }
      return view.render('pages/auth/signup')
    }

    const profileUser = await User.findBy('username', username)

    if (!profileUser) {
      if (currentUser) {
        return response.redirect().toPath(`/profile/${currentUser.username}/following`)
      }
      return view.render('pages/auth/signup')
    }

    const following = await Follow.query()
      .where('followerId', profileUser.id)
      .preload('following')
      .orderBy('createdAt', 'desc')
      .limit(50)

    const followingList = following.map((f) => f.following)

    const userFollows = await Follow.query()
      .where('followerId', currentUser?.id || 0)
      .select('followingId')
    const followingIdSet = new Set(userFollows.map((f) => f.followingId))

    const suggestions = await User.query()
      .whereNot('id', currentUser?.id || 0)
      .limit(5)

    return view.render('pages/following', {
      profileUser,
      currentUser,
      followingList,
      followingIdSet,
      suggestions,
    })
  }
}
