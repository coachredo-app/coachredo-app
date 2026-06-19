# Handoff impression — Plan B Rentable
**Destinataire : Claude Design**
**Date : 12 juin 2026**
**Objectif : générer une version PDF imprimable test du livre Plan B Rentable**

---

## 1. Fichiers source

| Fichier | Chemin | Rôle |
|---|---|---|
| Intérieur | `livre/interieur.html` | Manuscrit complet — 62 pages |
| Couverture | `livre/couverture.html` | Prototype couverture (dos + tranche + plat) |
| Sources chapitres | `livre/*.md` | Fichiers source Markdown — NE PAS MODIFIER |

> **Règle absolue : le manuscrit `interieur.html` est figé (V1 validé juin 2026).**
> Aucune modification de contenu autorisée. Seules les corrections de fautes ou bugs techniques sont acceptées.

---

## 2. Spécifications techniques — Intérieur

### Format
- **Format fini** : 140 × 210 mm (14 × 21 cm)
- **Nombre de pages** : 62 pages (pair — conforme KDP)
- **Rendu écran** : 420 × 630 px (échelle 3 px/mm)

### Marges
Définies dans le CSS en pixels, converties en mm (÷ 3) :

| Zone | Pixels | Millimètres |
|---|---|---|
| Haut | 54 px | 18 mm |
| Bas | 60 px | 20 mm |
| Blanc de fond (extérieur) | 44 px | ~14,7 mm |
| Gouttière (intérieur) | 56 px | ~18,7 mm |

Pages recto (impaires) : gouttière à gauche, blanc de fond à droite.
Pages verso (paires) : blanc de fond à gauche, gouttière à droite.

### Fond perdu
**Aucun fond perdu sur l'intérieur.** Standard KDP : fond blanc, texte dans les marges. Correct.

### CSS d'impression (déjà présent dans le fichier)
```css
@media print {
  @page { size: 140mm 210mm; margin: 0; }
  body { background: white; padding: 0; }
  h1, .nav, .section-label { display: none; }
  .galerie { gap: 0; max-width: none; }
  .spread { display: block; box-shadow: none; }
  .page-std, .spread .page-left, .spread .page-right {
    width: 140mm;
    min-height: 210mm;
    page-break-after: always;
    box-shadow: none;
  }
}
```
Les spreads (pages en regard) se décomposent automatiquement en deux pages individuelles à l'impression.

### Polices
| Police | Usage | Source |
|---|---|---|
| **EB Garamond** | Corps du texte | Google Fonts |
| **DM Serif Display** | Titres de chapitres | Google Fonts |
| **DM Sans** | Folios, labels, éléments UI | Google Fonts |

Toutes chargées via `<link>` Google Fonts dans le `<head>`. Pour un PDF print-ready, **intégrer les polices en local** ou s'assurer de la connexion internet lors de l'export.

### Couleurs
```
--ivoire  : #fffdf7  — fond des pages
--bleu    : #0a0d1a  — titres, texte fort
--or      : #c9a84c  — accent (filets, numéros de chapitre)
--texte   : #1c1917  — corps de texte
--texte-dim : #4a4540 — texte secondaire
```

---

## 3. Structure des 62 pages

| Pages | Contenu |
|---|---|
| 1 | Page de titre |
| 2 | Mentions légales ⚠️ ISBN manquant |
| 3 | Dédicace |
| 4 | Épigraphe |
| 5 | Sommaire |
| 6 | Blanc |
| 7–8 | Avant de commencer |
| 9–10 | Introduction |
| 11–14 | Chapitre 1 |
| 15–18 | Chapitre 2 |
| 19 | Intermède I |
| 20 | Blanc |
| 21–24 | Chapitre 3 |
| 25–28 | Chapitre 4 |
| 29 | Intermède II |
| 30 | Blanc |
| 31–34 | Chapitre 5 |
| 35–37 | Chapitre 6 |
| 38 | Blanc |
| 39–44 | Chapitre 7 |
| 45–46 | Blancs |
| 47 | Bilan de Clarté — Titre |
| 48–49 | Bilan — Famille 1 · Reconnaissance |
| 50–51 | Bilan — Famille 2 · Blocages |
| 52–53 | Bilan — Famille 3 · Ressources |
| 54–55 | Bilan — Famille 4 · Observation |
| 56–57 | Bilan — Famille 5 · Mouvement |
| 58 | Blanc |
| 59 | À propos de l'auteur |
| 60 | Page CoachRedo |
| 61–62 | Blancs |

**Parité vérifiée** : tous les chapitres ouvrent sur une page impaire (recto). Intermèdes sur pages impaires.

---

## 4. Spécifications techniques — Couverture

### Dimensions
| Élément | Largeur | Hauteur |
|---|---|---|
| Dos (quatrième) | 140 mm | 210 mm |
| Tranche | 7 mm | 210 mm |
| Plat (première) | 140 mm | 210 mm |
| **Total couverture** | **287 mm** | **210 mm** |

> La tranche de 7 mm est une **estimation** basée sur 62 pages en 80 g/m².
> KDP calcule la tranche exacte selon le grammage choisi — à ajuster avant impression finale.

### CSS d'impression couverture
```css
@media print {
  @page { size: 297mm 210mm landscape; margin: 0; }
  .dos    { width: 140mm; height: 210mm; }
  .tranche { width: 7mm; height: 210mm; }
  /* plat : 140mm restants */
}
```

### Fond perdu couverture
**Non défini dans le prototype HTML actuel.**
Pour l'impression finale KDP : ajouter 3 mm de fond perdu sur les 4 côtés → dimensions document = 293 mm × 216 mm avec fond perdu.

---

## 5. Procédure d'export PDF recommandée

### Intérieur
1. Ouvrir `livre/interieur.html` dans **Chrome** (meilleur moteur d'impression CSS)
2. `Cmd+P` → Imprimer
3. Destination : **Enregistrer en PDF**
4. Format papier : **Personnalisé 140 × 210 mm**
5. Marges : **Aucune** (le CSS gère)
6. Options : cocher **Graphiques d'arrière-plan**
7. Vérifier : **62 pages**, fond ivoire (#fffdf7) visible, folios présents

### Couverture
1. Ouvrir `livre/couverture.html` dans Chrome
2. `Cmd+P`
3. Format : **Personnalisé 287 × 210 mm** (ou 293 × 216 mm avec fond perdu)
4. Orientation : **Paysage**
5. Marges : **Aucune**

---

## 6. Points bloquants avant impression finale

| Élément | État | Action requise |
|---|---|---|
| **ISBN** | ⚠️ Placeholder `[À compléter]` page 2 | Obtenir ISBN auprès de l'AFNIL ou utiliser ISBN KDP gratuit — insérer dans `interieur.html` ligne ~510 |
| **Tranche exacte** | ⚠️ 7 mm estimé | Confirmer avec KDP calculator selon grammage (60g, 70g ou 80g) |
| **Fond perdu couverture** | ⚠️ Non défini | Ajouter 3 mm de fond perdu dans `couverture.html` pour impression finale |
| **Polices locales** | ⚠️ Google Fonts en ligne | Télécharger EB Garamond, DM Serif Display, DM Sans et les intégrer via `@font-face` pour PDF offline |
| **Couverture finale** | ℹ️ Prototype HTML | Valider la couverture HTML ou produire une version Illustrator/Canva si nécessaire |

---

## 7. Ce que Claude Design ne doit pas faire

- **Ne pas modifier le contenu textuel** du manuscrit
- **Ne pas changer la structure des pages** ni le numérotage
- **Ne pas modifier les marges** — elles ont été validées visuellement
- **Ne pas remplacer les polices** — EB Garamond est le choix éditorial validé

---

## 8. Ce que Claude Design peut faire

- Générer le PDF imprimable test depuis le HTML
- Corriger le CSS d'impression si les pages ne se séparent pas correctement
- Intégrer les polices en local pour un PDF offline
- Ajouter le fond perdu sur la couverture
- Remplacer le placeholder ISBN si le numéro est fourni

---

**Fichiers à transmettre à l'imprimeur (KDP ou autre) :**
1. `interieur_PLANB.pdf` — 62 pages, 140×210mm, sans fond perdu
2. `couverture_PLANB.pdf` — 287×216mm (avec fond perdu 3mm), paysage

**État au 12 juin 2026 : manuscrit prêt pour impression test. ISBN et tranche définitive à confirmer avant commande finale.**
