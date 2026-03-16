import { TweetSchema } from '#database/schema'
import User from './user.ts'
import Like from './like.ts'
import Retweet from './retweet.ts'

import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

/**
 * Modèle Tweet
 * -------------
 * Représente un tweet posté par un utilisateur.
 * Gère les relations avec les likes, retweets et réponses.
 */
export default class Tweet extends TweetSchema {
  /**
   * L'utilisateur qui a posté le tweet
   */
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  /**
   * Tous les likes liés à ce tweet
   */
  @hasMany(() => Like, {
    foreignKey: 'tweet_id',
  })
  declare likes: HasMany<typeof Like>

  /**
   * Tous les retweets liés à ce tweet
   */
  @hasMany(() => Retweet, {
    foreignKey: 'tweet_id',
  })
  declare retweets: HasMany<typeof Retweet>

  /**
   * Toutes les réponses à ce tweet
   * Ici on se base sur le même modèle Tweet pour les réponses
   * La colonne `parent_id` doit être ajoutée dans la migration si tu veux gérer les réponses
   */
  @hasMany(() => Tweet, {
    foreignKey: 'parent_id',
  })
  declare replies: HasMany<typeof Tweet>
}
