import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const smtpPort = Number(env.get('SMTP_PORT'))

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  globals: {
    brandName: 'Clone X',
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME'),
        pass: env.get('SMTP_PASSWORD'),
      },
    }),
  },
})

export default mailConfig
