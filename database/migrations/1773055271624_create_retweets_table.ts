import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'retweets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // utilisateur qui retweet
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      // tweet retweeté
      table.integer('tweet_id').unsigned().references('id').inTable('tweets').onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // empêcher un utilisateur de retweeter 2 fois le même tweet
      table.unique(['user_id', 'tweet_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
