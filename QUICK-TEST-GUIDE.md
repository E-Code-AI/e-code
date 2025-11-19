# ⚡ Guide de Test Rapide - 2 Minutes

**Testez immédiatement les nouvelles fonctionnalités !**

---

## 🖥️ **Test Desktop** (30 secondes)

### 1. Ouvrez n'importe quel fichier `.ts` ou `.js`

### 2. Test Multi-Cursor:
```
1. Double-cliquez sur un mot (ex: "const")
2. Pressez Ctrl+D (Windows/Linux) ou Cmd+D (Mac)
3. Pressez encore Ctrl+D
```
**✅ Résultat attendu**: Plusieurs curseurs apparaissent sur toutes les occurrences du mot

### 3. Test Go to Definition:
```
1. Cliquez sur un nom de fonction
2. Pressez F12
```
**✅ Résultat attendu**: Navigation vers la définition (ou message si pas trouvé)

### 4. Test Rename:
```
1. Cliquez sur une variable
2. Pressez F2
3. Tapez un nouveau nom
```
**✅ Résultat attendu**: Dialogue de rename s'ouvre

---

## 📱 **Test Mobile** (30 secondes)

### 1. Ouvrez l'IDE sur votre phone/tablet

### 2. Ouvrez un fichier de code

### 3. Cherchez le **bouton rond en bas à droite**:

**✅ Résultat attendu**: Bouton orange/bleu avec icône d'éclair (⚡)

### 4. Tapez sur ce bouton:

**✅ Résultat attendu**: Panel s'ouvre avec 11 actions:
- Go to Definition
- Find All References
- Rename Symbol
- Format Code
- Quick Fix
- Organize Imports
- Find
- Find & Replace
- Go to Symbol
- Show Suggestions
- Command Palette

### 5. Tapez sur "Find":

**✅ Résultat attendu**: Panel de recherche s'ouvre

---

## 🎯 **Test Rapide Complet** (2 minutes)

### Desktop:
- ✅ Ctrl+D → Multi-cursor
- ✅ F12 → Go to definition
- ✅ F2 → Rename
- ✅ Ctrl+H → Find & Replace
- ✅ Ctrl+Space → Suggestions

### Mobile:
- ✅ FAB visible
- ✅ Panel s'ouvre
- ✅ Actions fonctionnent
- ✅ Find/Replace accessible

---

## 🚨 Si Ça Ne Marche Pas

### **Multi-cursor ne marche pas** ?
→ Vérifiez que vous êtes dans l'éditeur Monaco (pas un autre éditeur)

### **FAB n'apparaît pas sur mobile** ?
→ Vérifiez que le fichier n'est pas en `readOnly` mode
→ Rafraîchissez la page (Ctrl+R ou Cmd+R)

### **Erreurs dans la console** ?
→ Ouvrez DevTools (F12) et partagez les erreurs

---

## ✅ Succès !

Si vous voyez :
- Multi-cursor fonctionner sur desktop ✅
- FAB apparaître sur mobile ✅
- Quick actions s'ouvrir ✅

**Alors tout est parfait ! 🎉**

---

**Temps total**: 2 minutes
**Difficulté**: Facile
**Résultat**: Confirmation que l'IDE est au niveau professionnel !
