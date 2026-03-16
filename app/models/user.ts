// Import du schema généré automatiquement
import { UserSchema } from '#database/schema'

// Service de hash pour password
import hash from '@adonisjs/core/services/hash'

// Helper pour combiner plusieurs classes
import { compose } from '@adonisjs/core/helpers'

// Mixin d'authentification Lucid
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

// Import relations
import Tweet from './tweet.ts'
import Like from './like.ts'
import Retweet from './retweet.ts'
import Follow from './follow.ts'

// Import décorateurs Lucid
import { hasMany, column } from '@adonisjs/lucid/orm'

// Type relation
import type { HasMany } from '@adonisjs/lucid/types/relations'

// Déclaration du modèle User
export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  // ================= Relations =================

  @hasMany(() => Tweet, { foreignKey: 'user_id' }) // relation tweets
  declare tweets: HasMany<typeof Tweet>

  @hasMany(() => Like, { foreignKey: 'user_id' }) // relation likes
  declare likes: HasMany<typeof Like>

  @hasMany(() => Retweet, { foreignKey: 'user_id' }) // relation retweets
  declare retweets: HasMany<typeof Retweet>

  @hasMany(() => Follow, { foreignKey: 'follower_id' }) // utilisateurs suivis
  declare followings: HasMany<typeof Follow>

  @hasMany(() => Follow, { foreignKey: 'following_id' }) // followers
  declare followersList: HasMany<typeof Follow>

  // ================= Colonnes =================

  @column({ isPrimary: true }) // clé primaire
  declare id: number

  @column() // nom complet
  declare name: string

  @column() // email utilisateur
  declare email: string

  @column() // username unique
  declare username: string

  @column() // mot de passe hashé
  declare password: string

  // mapping snake_case -> camelCase
  @column({ columnName: 'is_verified' })
  declare isVerified: boolean

  // ================= Sécurité =================

  protected $hidden = ['password', 'rememberMeToken'] // champs cachés JSON

  protected $computed = ['initials'] // champs calculés

  // Génère les initiales utilisateur
  get initials() {
    const [first, last] = this.name ? this.name.split(' ') : this.email.split('@')

    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
