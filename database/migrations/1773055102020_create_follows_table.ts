import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'follows'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // utilisateur qui suit
      table.integer('follower_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      // utilisateur suivi
      table.integer('following_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // empêcher de suivre deux fois la même personne
      table.unique(['follower_id', 'following_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
