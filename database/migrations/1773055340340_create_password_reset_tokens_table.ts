import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // utilisateur concerné
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')

      // token envoyé par email
      table.string('token').notNullable()

      // expiration du token
      table.timestamp('expires_at', { useTz: true }).notNullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
