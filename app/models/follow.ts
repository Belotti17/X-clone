import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Follow extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare followerId: number // Celui qui suit

  @column()
  declare followingId: number // Celui qui est suivi

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * L'utilisateur qui suit quelqu'un
   */
  @belongsTo(() => User, {
    foreignKey: 'followerId',
  })
  declare follower: BelongsTo<typeof User>

  /**
   * L'utilisateur qui est suivi
   */
  @belongsTo(() => User, {
    foreignKey: 'followingId',
  })
  declare following: BelongsTo<typeof User>
}
