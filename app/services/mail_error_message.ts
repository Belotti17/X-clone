export function getMailErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const isSmtpAuthenticationError =
    ('code' in error && error.code === 'EAUTH') ||
    ('responseCode' in error && error.responseCode === 535)

  if (isSmtpAuthenticationError) {
    return 'Le serveur SMTP a refusé les identifiants. Vérifiez SMTP_USERNAME et SMTP_PASSWORD dans .env, puis redémarrez le serveur avant de renvoyer le code.'
  }

  return fallback
}
