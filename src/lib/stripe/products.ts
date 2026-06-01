/**
 * Mapping des slugs produits CoachRedo vers les Stripe Price IDs.
 * Les Price IDs sont définis via variables d'environnement.
 */
export const PRODUCT_PRICE_MAP: Record<string, string | undefined> = {
  'plan-b-livre': process.env.STRIPE_PRICE_PLAN_B_LIVRE,
  'plan-b-programme-90j-monthly': process.env.STRIPE_PRICE_PROGRAMME_90J_MONTHLY,
  'plan-b-programme-90j-6m': process.env.STRIPE_PRICE_PROGRAMME_90J_6M,
  'plan-b-programme-90j-annual': process.env.STRIPE_PRICE_PROGRAMME_90J_ANNUAL,
}

export type ProductSlug = keyof typeof PRODUCT_PRICE_MAP

/**
 * Retourne le Stripe Price ID pour un slug donné.
 * Lève une erreur si la variable d'env n'est pas définie.
 */
export function getPriceId(slug: ProductSlug): string {
  const priceId = PRODUCT_PRICE_MAP[slug]
  if (!priceId) {
    throw new Error(
      `Stripe Price ID manquant pour le produit "${slug}". Vérifie tes variables d'environnement.`
    )
  }
  return priceId
}
