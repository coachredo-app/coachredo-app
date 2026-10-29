# CoachRedo Music — préparer et envoyer un résumé (récit narratif)

Procédure de Coach Redouane, sans Claude Code. Le résumé contient :

- la **fiche interne** : 10 sections structurées, qui servent à la production ;
- le **récit client** (`## Récit client`) : un texte narratif, seul texte montré au client.

Si le récit est vide, le client voit les 10 sections (comportement historique).

Toutes les commandes se lancent **dans votre Terminal**, depuis le dossier du projet :

```bash
cd ~/projects/coachredo-app
```

Remplacez `CRM-XXXXX` par la référence de la commande, et `<dossier>` par son dossier dans l'archive privée (`CoachRedo Music HQ/Chansons Personnalisées/CRM-XXXXX-…/01_brief`). Le fichier du brief ne doit **jamais** être placé dans le dépôt Git : l'outil le refuse.

## 1. Consulter les réponses

```bash
node scripts/music-v0/admin.mjs questionnaire CRM-XXXXX
```

Lecture seule. Le statut doit être `QUESTIONNAIRE_REÇU`.

## 2. Préparer la fiche interne (10 sections)

```bash
node scripts/music-v0/admin.mjs brief-modele CRM-XXXXX "<dossier>/brief_v1.txt"
```

Le fichier est prérempli avec les réponses. Relisez et corrigez chaque section. Ne modifiez pas les titres `## …`. Les lignes qui commencent par `//` sont ignorées.

## 3. Faire rédiger le récit avec ChatGPT

- Copiez **uniquement les 10 sections** de la fiche dans ChatGPT : jamais de téléphone, d'email, de référence CRM ni de lien.
- Demandez un récit fluide, à la 2ᵉ personne (« vous »), fidèle à la fiche, **sans rien inventer** (aucun souvenir, lieu, fait ni promesse qui ne soit pas dans la fiche).
- Paragraphes séparés par une ligne vide ; 6000 caractères au maximum.

## 4. Vérifier et valider le récit vous-même

- Chaque prénom, lieu, souvenir et message du récit figure dans la fiche.
- Rien n'a été ajouté ni déformé ; l'orthographe est correcte.
- Collez le récit validé sous le titre `## Récit client`, à la fin du fichier.

## 5. Enregistrer le brief (brouillon, rien n'est envoyé)

```bash
node scripts/music-v0/admin.mjs brief CRM-XXXXX "<dossier>/brief_v1.txt"
```

En cas d'erreur (section manquante ou trop longue), l'outil indique laquelle : corrigez le fichier et relancez. Le résultat affiche la fiche et le récit (« seul texte montré au client »).

## 6. Envoyer le lien privé

```bash
node scripts/music-v0/admin.mjs brief-envoyer CRM-XXXXX
```

Le lien s'affiche **une seule fois** dans votre Terminal. Copiez-le **uniquement** dans la conversation WhatsApp du client. Tout lien précédent (questionnaire ou résumé) cesse de fonctionner. Lien perdu : relancez la même commande (renvoi de la même version, nouveau lien).

## 7. Suivre la validation ou les corrections

```bash
node scripts/music-v0/admin.mjs suivi CRM-XXXXX
```

- **Validé** (« Brief VALIDÉ ») : le délai de 5 jours ouvrés démarre ; la production peut commencer, à partir de la fiche interne.
- **Correction demandée** : copiez le fichier en `brief_v2.txt`, corrigez la fiche et/ou le récit (étapes 3 et 4), puis refaites les étapes 5 et 6. La version précédente reste dans l'historique avec la demande du client ; elle ne peut plus être validée.

## Règles

- Le client valide le **récit** ; la production s'appuie sur la **fiche**. Les deux appartiennent à la même version : ne jamais les laisser diverger.
- Aucune donnée de contact dans ChatGPT ni dans le récit.
- Le récit est un résumé de la demande, **pas les paroles** de la chanson.

## CRM-00006 (commande de test) — V2 narrative, après autorisation uniquement

État actuel : V1 envoyée le 28/10, sans réponse. **Ne pas valider la V1.**

1. Copier `CoachRedo Music HQ/E2E-CRM-00006/brief_v1.txt` en `brief_v2.txt` dans le même dossier.
2. Ajouter à la fin `## Récit client`, suivi du récit validé (étapes 3 et 4).
3. Après mise en production de la migration 029 et du code (sinon l'enregistrement est refusé : `recit:inconnu`) :
   `node scripts/music-v0/admin.mjs brief CRM-00006 "…/E2E-CRM-00006/brief_v2.txt"` → **version 2** créée ; la V1 reste dans l'historique.
4. `node scripts/music-v0/admin.mjs brief-envoyer CRM-00006` dans votre Terminal → nouveau lien ; le lien V1 cesse de fonctionner.
5. `node scripts/music-v0/admin.mjs suivi CRM-00006` → « version 2 — envoyé, en attente du client » et, dans l'historique, la v1.
