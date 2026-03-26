// database/migrations/*_add_columns_to_tweets.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tweets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('original_tweet_id').unsigned().nullable()
      table.integer('parent_tweet_id').unsigned().nullable()
      table.boolean('is_retweet').defaultTo(false)
      table.boolean('is_reply').defaultTo(false)
      table.string('image').nullable()

      // Ajouter les clés étrangères
      table.foreign('original_tweet_id').references('tweets.id').onDelete('SET NULL')
      table.foreign('parent_tweet_id').references('tweets.id').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['original_tweet_id'])
      table.dropForeign(['parent_tweet_id'])
      table.dropColumn('original_tweet_id')
      table.dropColumn('parent_tweet_id')
      table.dropColumn('is_retweet')
      table.dropColumn('is_reply')
      table.dropColumn('image')
    })
  }
}
