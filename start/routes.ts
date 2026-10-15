import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const SessionController = () => import('#controllers/session_controller')
const NewAccountController = () => import('#controllers/new_account_controller')
const TimelineController = () => import('#controllers/timeline_controller')
const TweetsController = () => import('#controllers/tweets_controller')
const ProfileController = () => import('#controllers/profile_controller')
const FollowController = () => import('#controllers/follows_controller')
const SearchController = () => import('#controllers/searches_controller')
const CommunitiesController = () => import('#controllers/communities_controller')
const MessagesController = () => import('#controllers/messages_controller')
const HashtagController = () => import('#controllers/hashtags_controller')

/*
  ACCUEIL
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
    router.get('/notifications', [TimelineController, 'notifications']).as('notifications')
    router.get('/communities', [CommunitiesController, 'index']).as('communities')
    router.get('/trending', [HashtagController, 'trending']).as('trending')

    // TWEETS
    router.post('/tweets', [TweetsController, 'store']).as('tweets.store')
    router.post('/tweets/:id/delete', [TweetsController, 'destroy']).as('tweets.delete')
    router.post('/tweets/:id/like', [TweetsController, 'like']).as('tweets.like')
    router.post('/tweets/:id/retweet', [TweetsController, 'retweet']).as('tweets.retweet')
    router.post('/tweets/:id/reply', [TweetsController, 'reply']).as('tweets.reply')
    router.get('/tweets/:id', [TweetsController, 'show']).as('tweets.show')
    router.get('/tweets/:id/replies', [TweetsController, 'getReplies']).as('tweets.replies')

    // MESSAGES
    router.get('/messages', [MessagesController, 'index']).as('messages.index')
    router.get('/messages/new', [MessagesController, 'getNewMessages']).as('messages.new')
    router.get('/messages/:id', [MessagesController, 'show']).as('messages.show')
    router.post('/messages', [MessagesController, 'store']).as('messages.store')
    router.put('/messages/:id', [MessagesController, 'update']).as('messages.update')
    router.delete('/messages/:id', [MessagesController, 'destroy']).as('messages.destroy')
    router.put('/messages/:id/read', [MessagesController, 'markAsRead']).as('messages.read')

    // PROFIL
    router.get('/profile/:username?', [ProfileController, 'show']).as('profile.show')
    router.put('/profile', [ProfileController, 'update']).as('profile.update')
    router.post('/profile/update', [ProfileController, 'update']).as('profile.update.post')

    // FOLLOWERS & FOLLOWING (une seule fois chacun)
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

    // LOGOUT
    router.post('/logout', [SessionController, 'destroy']).as('session.destroy')
  })
  .middleware([middleware.auth()])
