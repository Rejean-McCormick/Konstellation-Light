KONSTELLATION LIGHT — CORRECTIF DE LECTURE DES BUNDLES LOCAUX (08-11-2026)

OBJECTIF
- En mode localhost, ne plus utiliser un ancien service worker hors ligne.
- Réessayer UNE SEULE FOIS une requête interrompue, sans contourner les contrôles SHA-256.
- Transmettre les bundles volumineux en morceaux depuis le serveur Python local.
- Distinguer les erreurs réseau des erreurs de format ou intégrité.

INSTALLATION (sur la version Light après les mises à jour des 7 et 8 novembre)
1. Fermer complètement Konstellation Light (la fenêtre Python).
2. Ouvrir ce ZIP puis payload/Konstellation-Light/.
3. Copier les dossiers light et tools dans :
   C:\mycode\Konstellation\Konstellation-Light
   Accepter la fusion et remplacer UNIQUEMENT les deux fichiers du correctif.
4. Redémarrer Konstellation-Light.pyw.
5. Cliquer sur « Explorer mes Kristals publics » : cela reconstruit light/site et relance l’aperçu.
6. Si le navigateur affiche encore d’anciens fichiers, utiliser Ctrl+Maj+R.

Les bases locales, le dossier kristal-public et GitHub ne sont pas modifiés.
Les protections de vérification SHA-256 et le blocage C4 sont inchangés.

LIMITES
Le message « Failed to fetch » ne prouve pas une corruption. Ce correctif couvre
les problèmes constatés possibles de cache local / lecture réseau; l’échec exact
sur Windows n’a pas été reproduit dans cet environnement. Un nouvel échec doit
maintenant afficher une indication plus précise.

TESTS : 58 tests JavaScript, 22 tests Python, zéro échec.
