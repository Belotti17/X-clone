import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tweets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // utilisateur qui poste le tweet
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      // contenu du tweet
      table.text('content').notNullable()

      // image ou media optionnel
      table.string('media').nullable()

      // statistiques
      table.integer('likes_count').defaultTo(0)
      table.integer('retweets_count').defaultTo(0)
      table.integer('replies_count').defaultTo(0)

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
