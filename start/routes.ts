import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

import AuthController from '#controllers/auth_controller'
import SessionController from '#controllers/session_controller'
import NewAccountController from '#controllers/new_account_controller'
import TimelineController from '#controllers/timeline_controller'
import TweetsController from '#controllers/tweets_controller'
import ProfileController from '#controllers/profile_controller'
import FollowController from '#controllers/follows_controller'
import SearchController from '#controllers/searches_controller'
import HashtagController from '#controllers/hashtags_controller'

/**
 * ACCUEIL
 */
router.get('/', async ({ auth, response }) => {
  const isAuthenticated = await auth.use('web').check()
  return isAuthenticated
    ? response.redirect().toRoute('timeline')
    : response.redirect().toRoute('new_account.create')
})

/**
 * ROUTE LOGIN
 */
router
  .get('/login', ({ response }) => {
    return response.redirect().toRoute('new_account.create')
  })
  .as('login')

/**
 * GROUPE GUEST
 */
router
  .group(() => {
    router.get('/signup', [NewAccountController, 'create']).as('new_account.create')
    router.post('/signup', [NewAccountController, 'store']).as('new_account.store')
    router.post('/login', [SessionController, 'store']).as('session.store')
  })
  .middleware([middleware.guest()])

/**
 * ROUTES OTP
 */
router.get('/verify-otp', [NewAccountController, 'showOtpPage']).as('otp.create')
router.post('/verify-otp', [AuthController, 'verifyOtp']).as('verify.otp')
router.post('/resend-otp', [AuthController, 'resendOtp']).as('otp.resend')

/**
 * GROUPE PROTÉGÉ
 */
router
  .group(() => {
    // TIMELINE
    router.get('/timeline', [TimelineController, 'index']).as('timeline')
    router.get('/following', [TimelineController, 'following']).as('timeline.following')

    // TWEETS
    router.post('/tweets', [TweetsController, 'store']).as('tweets.store')
    router.post('/tweets/:id/delete', [TweetsController, 'destroy']).as('tweets.delete')
    router.post('/tweets/:id/like', [TweetsController, 'like']).as('tweets.like')
    router.post('/tweets/:id/retweet', [TweetsController, 'retweet']).as('tweets.retweet')
    router.post('/tweets/:id/reply', [TweetsController, 'reply']).as('tweets.reply')

    // PROFIL
    router.get('/profile/:username?', [ProfileController, 'show']).as('profile.show')
    router.put('/profile', [ProfileController, 'update']).as('profile.update')
    router
      .get('/profile/:username/followers', [ProfileController, 'followers'])
      .as('profile.followers')
    router
      .get('/profile/:username/following', [ProfileController, 'following'])
      .as('profile.following')

    // FOLLOWS
    router.post('/follow/:id', [FollowController, 'store']).as('follow.store')
    router.delete('/follow/:id', [FollowController, 'destroy']).as('follow.destroy')

    // RECHERCHE
    router.get('/search', [SearchController, 'index']).as('search')
    router.get('/search/hashtag/:tag', [SearchController, 'hashtag']).as('search.hashtag')

    // HASHTAGS
    router.get('/hashtag/:tag', [HashtagController, 'show']).as('hashtag.show')

    // COMPTE PRIVÉ
    router
      .post('/account/toggle-private', [ProfileController, 'togglePrivate'])
      .as('account.togglePrivate')

    // LOGOUT
    router.post('/logout', [SessionController, 'destroy']).as('session.destroy')
  })
  .middleware([middleware.auth()])
