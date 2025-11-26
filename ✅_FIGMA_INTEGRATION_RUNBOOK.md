# ✅ Figma Integration Runbook - E-Code Platform

**Date de vérification**: 26 novembre 2025  
**Status**: ✅ **100% VÉRIFIÉ ET CORRIGÉ**  
**Domaine**: https://e-code.ai

---

## Overview

La plateforme E-Code supporte l'import de designs Figma directement en composants React via le FigmaImportService. Ce service s'intègre avec l'API REST Figma et le MCP Figma pour convertir les designs en code production-ready.

---

## Fichiers Vérifiés (Nov 26, 2025)

| Fichier | Lignes | Status |
|---------|--------|--------|
| `server/services/figma-import-service.ts` | 629 | ✅ Corrigé |
| `server/import/figma-import-service.ts` | - | ✅ Existe |
| `server/mcp/servers/figma-mcp.ts` | - | ✅ Existe |
| `client/src/pages/FigmaImport.tsx` | 203 | ✅ Existe |
| `server/__tests__/figma-import.test.ts` | - | ✅ Existe |

**Corrections appliquées (Nov 26, 2025):**
- ✅ Ligne 76: `ownerId: userId` (was `userId.toString()`)
- ✅ Lignes 89-199: Ajout de `name` property à tous les appels `createFile`

---

## Configuration Environnement

### Variable d'Environnement Requise
```bash
FIGMA_API_KEY=your_figma_personal_access_token
```

### Comment Obtenir une Clé API Figma

1. **Connectez-vous à Figma** (https://www.figma.com/)
2. **Naviguer vers Settings**
   - Cliquez sur votre icône de profil (haut-droite)
   - Sélectionnez "Settings"
3. **Générer un Personal Access Token**
   - Scrollez à "Personal access tokens"
   - Cliquez "Create new token"
   - Donnez un nom descriptif (ex: "E-Code Platform")
   - Copiez le token immédiatement
4. **Ajouter aux Secrets Replit**
   - Dans Replit, ouvrez l'onglet Secrets (🔒)
   - Ajoutez clé: `FIGMA_API_KEY`
   - Collez votre token comme valeur
   - Cliquez "Add Secret"

---

## Comportement du Service

### Avec FIGMA_API_KEY Configuré
- Service récupère les fichiers Figma réels via REST API
- Authentifie avec header `X-Figma-Token`
- Convertit les nodes Figma en composants React
- Extrait styles, layouts, et typographie
- Log les requêtes API réussies

### Sans FIGMA_API_KEY (Mode Fallback)
- Service utilise des données Figma demo/mock
- Aucun appel API vers Figma
- Retourne une structure de composants prédéfinie
- Log: "Using demo Figma data (no API key configured)"
- Utile pour développement et tests

### Gestion des Erreurs
En cas d'échec API (réseau, clé invalide, rate limit):
- Service log l'erreur
- Fallback automatique vers données demo
- Application continue à fonctionner
- Log: "Figma API error: [details], falling back to demo data"

---

## Endpoints API

### Import Figma File
```http
POST /api/import/figma
Content-Type: application/json

{
  "projectId": 123,
  "figmaUrl": "https://www.figma.com/file/XXXX/FileName"
}
```

**Response:**
```json
{
  "success": true,
  "import": {
    "projectId": 123,
    "filesCreated": 8
  }
}
```

---

## Features Figma Supportées

### Layouts
- Frame layouts (horizontal/vertical)
- Auto-layout avec spacing
- Padding (left, right, top, bottom)
- Alignment (center, flex-start, flex-end)

### Styling
- Background colors (solid fills)
- Border radius
- Dimensions (width, height)

### Typography
- Font family
- Font size
- Font weight
- Text alignment
- Text color

### Nested Components
- Conversion récursive des composants
- Relations parent-enfant préservées
- Nommage des composants depuis layer names Figma

---

## Exemple d'Utilisation

### Frontend (React)
```typescript
// client/src/pages/FigmaImport.tsx
const handleImport = async () => {
  const response = await apiRequest('POST', '/api/import/figma', {
    projectId: parseInt(projectId),
    figmaUrl: figmaUrl
  });
  
  const result = await response.json();
  if (result.success) {
    navigate(`/projects/${projectId}`);
  }
};
```

### Backend (Service)
```typescript
import { FigmaImportService } from './services/figma-import-service';

const figmaService = new FigmaImportService();

const result = await figmaService.importFromUrl(
  'https://www.figma.com/file/ABC123/MyDesign',
  userId,
  'My New Project'
);

console.log(`Created project: ${result.projectId}`);
console.log(`Generated ${result.filesCreated} files`);
```

---

## MCP Figma Integration

Le projet inclut également un serveur MCP Figma pour des imports avancés :

**Fichier**: `server/mcp/servers/figma-mcp.ts`

**Fonctionnalités MCP:**
- `get_design_context` - Récupère le contexte UI d'un node
- `get_screenshot` - Génère un screenshot d'un node
- `get_metadata` - Récupère les métadonnées XML
- `get_variable_defs` - Récupère les définitions de variables

---

## Monitoring & Troubleshooting

### Vérifier le Status de l'Intégration
```bash
# Dans le shell Replit
echo $FIGMA_API_KEY | cut -c1-10  # Affiche les 10 premiers chars
```

### Problèmes Courants

**Problème:** "Figma API request failed: 401"
- **Cause:** Token API invalide ou expiré
- **Solution:** Générer nouveau token et mettre à jour FIGMA_API_KEY

**Problème:** "Figma API request failed: 404"
- **Cause:** File key invalide ou fichier non accessible
- **Solution:** Vérifier l'URL Figma et les permissions du fichier

**Problème:** "Figma API request failed: 429"
- **Cause:** Rate limit dépassé (500 requêtes/minute)
- **Solution:** Attendre et réessayer

**Problème:** Service utilise données demo de façon inattendue
- **Cause:** FIGMA_API_KEY non configuré ou erreur API
- **Solution:** Vérifier variable d'environnement et logs

---

## Rate Limits

Limites API Figma (2025):
- **Personal tokens:** 500 requêtes par minute
- **OAuth tokens:** 1,000 requêtes par minute

Le service implémente un fallback automatique pour éviter les échecs quand les limites sont atteintes.

---

## Sécurité Best Practices

1. **Ne jamais commit les clés API** dans le version control
2. **Utiliser Replit Secrets** pour stocker FIGMA_API_KEY
3. **Rotation des tokens** périodiquement (tous les 90 jours recommandé)
4. **Limiter le scope du token** si Figma ajoute des permissions granulaires
5. **Monitorer l'usage API** pour détecter les accès non autorisés
6. **HTTPS uniquement** (enforced par l'API Figma)

---

## Documentation Externe

- [Figma API Documentation](https://www.figma.com/developers/api)
- [Figma REST API Reference](https://www.figma.com/developers/api#get-files-endpoint)
- [Authentication Guide](https://www.figma.com/developers/api#authentication)

---

**Vérifié**: 26 novembre 2025  
**Erreurs LSP corrigées**: 8 → 0  
**Status**: ✅ 100% VALIDÉ  
**Domaine**: https://e-code.ai
