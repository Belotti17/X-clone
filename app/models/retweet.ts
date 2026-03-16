import { RetweetSchema } from '#database/schema'
import User from './user.ts'
import Tweet from './tweet.ts'

import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Modèle Retweet
 * Représente un retweet fait par un utilisateur sur un tweet
 */
export default class Retweet extends RetweetSchema {
  /**
   * Relation vers l'utilisateur qui a retweeté
   */
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  /**
   * Relation vers le tweet retweeté
   */
  @belongsTo(() => Tweet, {
    foreignKey: 'tweet_id',
  })
  declare tweet: BelongsTo<typeof Tweet>
}
