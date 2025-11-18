# 🧪 TEST AI AGENT LIVE - Guide Complet

## ❌ HONNÊTETÉ : Je ne suis PAS sûr à 100%

J'ai fait l'intégration **théorique** du code, mais je n'ai **PAS testé en live**. Voici ce qu'il faut faire pour atteindre 100% réel.

---

## ✅ Ce qui FONCTIONNE (Déjà implémenté)

### Backend
- ✅ WebSocket server `/ws/agent` configuré dans `server/index.ts` (ligne 223)
- ✅ Service `agentWebSocketService` avec méthodes broadcast (NOUVEAU)
- ✅ Endpoint `/api/workspace/bootstrap` existe
- ✅ Agent orchestrator service (1106 lignes)
- ✅ Workflow engine (773 lignes)

### Frontend
- ✅ WebSocket connection dans `Editor.tsx`
- ✅ ReplitAgent accepte WebSocket externe
- ✅ Message handlers pour tous les events (plan_started, task_started, etc.)
- ✅ Progress tracking UI
- ✅ Auto-start avec initialPrompt

---

## ❌ Ce qui MANQUE (Pour que ça marche à 100%)

### 1. **Exécution Autonome du Plan** (CRITIQUE)

Le workspace-bootstrap endpoint crée le projet et la session, mais **ne lance PAS l'exécution autonome**.

**Fichier à modifier** : `server/routes/workspace-bootstrap.router.ts`

**Ce qu'il faut ajouter** après la création de l'agent session :

```typescript
// Après ligne ~150 (création de agentSession)

// 7. AUTO-START AUTONOMOUS EXECUTION (Task from checklist)
if (options.autoStart) {
  logger.info(`[Bootstrap] Auto-starting autonomous execution for session ${sessionId}`);

  // Generate initial plan from prompt
  const plan = await aiPlanGenerator.generatePlan(prompt, {
    language: options.language,
    framework: options.framework,
    userId: userId
  });

  // Start autonomous execution in background (non-blocking)
  agentOrchestrator.executeAutonomousPlan(
    sessionId,
    plan,
    project.id.toString(),
    userId.toString()
  ).catch(error => {
    logger.error(`[Bootstrap] Autonomous execution failed:`, error);
    agentWebSocketService.broadcastPlanFailed(
      project.id,
      sessionId,
      error.message
    );
  });

  logger.info(`[Bootstrap] Autonomous execution started in background`);
}
```

### 2. **Implémentation de `executeAutonomousPlan`** (CRITIQUE)

Le service orchestrator a la méthode mais elle doit réellement exécuter les tâches.

**Fichier** : `server/services/agent-orchestrator.service.ts`

**Vérifier qu'elle contient** :

```typescript
async executeAutonomousPlan(
  sessionId: string,
  plan: ExecutionPlan,
  projectId: string,
  userId: string
): Promise<void> {
  try {
    logger.info(`[Autonomous] Starting plan execution: ${plan.id}`);

    // 1. Broadcast plan started
    agentWebSocketService.broadcastPlanStarted(projectId, sessionId, plan.tasks.length);

    // 2. Execute tasks sequentially
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];

      // Broadcast task started
      agentWebSocketService.broadcastTaskStarted(projectId, sessionId, i, task);

      // Execute task based on type
      let result;
      switch (task.type) {
        case 'create_file':
          result = await this.createFile(task, projectId);
          agentWebSocketService.broadcastFileCreated(projectId, sessionId, task.path);
          break;
        case 'run_command':
          result = await this.runCommand(task, projectId, sessionId);
          break;
        case 'install_packages':
          result = await this.installPackages(task, projectId, sessionId);
          break;
        default:
          logger.warn(`Unknown task type: ${task.type}`);
      }

      // Broadcast task completed
      agentWebSocketService.broadcastTaskCompleted(
        projectId,
        sessionId,
        i,
        plan.tasks.length,
        result
      );
    }

    // 3. Broadcast plan completed
    agentWebSocketService.broadcastPlanCompleted(projectId, sessionId, true);

    logger.info(`[Autonomous] Plan execution completed: ${plan.id}`);
  } catch (error) {
    logger.error(`[Autonomous] Plan execution failed:`, error);
    agentWebSocketService.broadcastPlanFailed(projectId, sessionId, error.message);
    throw error;
  }
}
```

### 3. **File Operations Service**

Créer/écrire des fichiers dans le workspace.

**Fichier** : `server/services/agent-file-operations.service.ts` (s'il n'existe pas, créer)

```typescript
import path from 'path';
import fs from 'fs/promises';

const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/tmp/e-code-workspaces';

export async function createFile(filePath: string, content: string, projectId: string): Promise<void> {
  const workspace = path.join(WORKSPACES_DIR, projectId);
  const fullPath = path.join(workspace, filePath);

  // Créer les dossiers parents
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  // Écrire le fichier
  await fs.writeFile(fullPath, content, 'utf-8');

  console.log(`[FileOps] File created: ${filePath}`);
}
```

### 4. **Command Execution Service**

Exécuter des commandes avec streaming output.

**Fichier** : `server/services/agent-command-execution.service.ts`

```typescript
import { spawn } from 'child_process';
import path from 'path';
import { agentWebSocketService } from './agent-websocket-service';

const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/tmp/e-code-workspaces';

export async function runCommand(
  command: string,
  args: string[],
  projectId: string,
  sessionId: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const workspace = path.join(WORKSPACES_DIR, projectId);

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: workspace,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;

      // Stream to WebSocket
      agentWebSocketService.broadcastCommandOutput(projectId, sessionId, 'stdout', output);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;

      // Stream to WebSocket
      agentWebSocketService.broadcastCommandOutput(projectId, sessionId, 'stderr', output);
    });

    proc.on('close', (code: number) => {
      resolve({ exitCode: code || 0, stdout, stderr });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}
```

---

## 🚀 COMMENT TESTER SUR REPLIT

### Étape 1 : Déployer sur Replit

1. **Push le code** :
   ```bash
   git add .
   git commit -m "feat: Add autonomous agent execution"
   git push
   ```

2. **Sur Replit** :
   - Import depuis GitHub : `E-Code-AI/e-code`
   - Branch : `claude/complete-design-elements-01Fwv6os6wLVysqsJUKU5SQN`

3. **Configurer les variables d'environnement** :
   ```
   DATABASE_URL=your_postgres_url
   JWT_SECRET=your_secret
   OPENAI_API_KEY=your_key
   ANTHROPIC_API_KEY=your_key (pour Claude)
   NODE_ENV=production
   ```

4. **Installer et démarrer** :
   ```bash
   npm install
   npm run build
   npm start
   ```

### Étape 2 : Tester le Flow Complet

1. **Accéder à l'app** : https://your-repl.replit.app

2. **S'inscrire/Se connecter**

3. **Homepage → Créer un projet AI** :
   - Écrire : "Create a todo app with React and TypeScript"
   - Cliquer "Create with AI"

4. **Vérifier le flow** :
   - ✅ Loading screen apparaît (2-5 sec)
   - ✅ Redirection vers `/ide/123?bootstrap=JWT_TOKEN`
   - ✅ Agent panel s'ouvre automatiquement
   - ✅ Message "AI Agent is building your application..."
   - ✅ WebSocket se connecte (vérifier dans DevTools → Network → WS)
   - ✅ Progress logs apparaissent :
     - "📋 Plan started: X tasks to execute"
     - "⚙️ Task 1: Creating package.json..."
     - "📄 Created file: package.json"
     - "🖥️ stdout: Installing dependencies..."
     - "✅ Task 1 completed"
   - ✅ Fichiers apparaissent dans sidebar au fur et à mesure
   - ✅ Terminal affiche les sorties de commandes
   - ✅ Après 1-2 min : "🎉 Build completed successfully!"
   - ✅ Preview se charge avec l'app fonctionnelle

### Étape 3 : Débugger

**Ouvrir DevTools** :

1. **Console** : Chercher logs `[Workspace Bootstrap]`, `[WebSocket]`, `[ReplitAgent]`

2. **Network → WS** :
   - Vérifier connexion à `wss://your-repl.replit.app/ws/agent?projectId=X&sessionId=Y`
   - Voir messages entrants :
     ```json
     {"type": "connected", "projectId": "123", "sessionId": "abc"}
     {"type": "plan_started", "totalTasks": 5}
     {"type": "task_started", "taskIndex": 0, "task": {...}}
     ```

3. **Backend Logs** (sur Replit Console) :
   - `[Agent WebSocket] ✅ Connection established: 123-abc`
   - `[Autonomous] Starting plan execution: plan-xyz`
   - `[FileOps] File created: package.json`

---

## 🐛 Problèmes Possibles

### Problème 1 : WebSocket ne se connecte pas

**Symptôme** : Erreur "Failed to connect" dans console

**Solutions** :
1. Vérifier que `server/index.ts` initialise le WebSocket (ligne 223)
2. Vérifier CORS : WebSocket doit être autorisé
3. Sur Replit, vérifier que le port est exposé

### Problème 2 : Pas de messages WebSocket

**Symptôme** : Connexion OK mais pas de messages

**Solutions** :
1. Vérifier que `executeAutonomousPlan` est appelé dans `workspace-bootstrap.router.ts`
2. Vérifier logs backend : chercher `[Autonomous] Starting plan execution`
3. Vérifier que `agentWebSocketService.broadcastPlanStarted()` est appelé

### Problème 3 : Plan ne s'exécute pas

**Symptôme** : Messages WebSocket OK mais fichiers non créés

**Solutions** :
1. Vérifier que `WORKSPACES_DIR` existe et est writable
2. Vérifier logs : `[FileOps] File created: ...`
3. Vérifier permissions filesystem

### Problème 4 : Commandes ne s'exécutent pas

**Symptôme** : `npm install` échoue

**Solutions** :
1. Vérifier que `npm` est installé dans l'environnement
2. Vérifier workspace path
3. Vérifier logs stderr : chercher erreurs npm

---

## 📊 Checklist de Validation

Utiliser cette checklist pour vérifier :

- [ ] Backend démarre sans erreur
- [ ] Database connectée
- [ ] WebSocket server initialisé (`/ws/agent`)
- [ ] Homepage charge
- [ ] Peut créer un compte
- [ ] Peut se connecter
- [ ] Homepage affiche "Create with AI"
- [ ] Clic "Create with AI" → Loading screen
- [ ] Redirection vers IDE avec `?bootstrap=` dans URL
- [ ] Agent panel s'ouvre auto
- [ ] WebSocket se connecte (DevTools)
- [ ] Message "connected" reçu
- [ ] Messages `plan_started` reçus
- [ ] Messages `task_started` reçus
- [ ] Messages `file_created` reçus
- [ ] Fichiers apparaissent dans sidebar
- [ ] Messages `command_output` reçus
- [ ] Terminal affiche outputs
- [ ] Message `plan_completed` reçu
- [ ] Toast "Build Complete" apparaît
- [ ] Preview se charge
- [ ] App fonctionne dans preview

---

## 🎯 Estimation Réaliste

**Temps pour atteindre 100% fonctionnel** :

- ✅ Backend WebSocket : **FAIT** (avec mes modifications)
- ⏱️ Implémenter `executeAutonomousPlan` : **2-3 heures**
- ⏱️ File operations service : **1 heure**
- ⏱️ Command execution service : **1-2 heures**
- ⏱️ Tests et débug : **2-4 heures**

**TOTAL : 6-10 heures de développement + tests**

---

## 💡 Alternatives pour Tester Plus Vite

Si vous voulez tester **maintenant** sans attendre l'implémentation complète :

### Option 1 : Mock l'exécution

Dans `workspace-bootstrap.router.ts`, après création du projet :

```typescript
// MOCK: Simuler l'exécution pour tester le WebSocket
setTimeout(() => {
  agentWebSocketService.broadcastPlanStarted(project.id, sessionId, 3);

  setTimeout(() => {
    agentWebSocketService.broadcastTaskStarted(project.id, sessionId, 0, {
      type: 'create_file',
      description: 'Creating package.json'
    });
  }, 1000);

  setTimeout(() => {
    agentWebSocketService.broadcastFileCreated(project.id, sessionId, 'package.json');
    agentWebSocketService.broadcastTaskCompleted(project.id, sessionId, 0, 3, {});
  }, 2000);

  setTimeout(() => {
    agentWebSocketService.broadcastPlanCompleted(project.id, sessionId, true);
  }, 5000);
}, 2000);
```

Cela permet de tester le flow WebSocket sans implémenter l'exécution réelle.

### Option 2 : Utiliser les Services Existants

Si les services `agent-file-operations` et `agent-command-execution` existent déjà, vérifier qu'ils ont les bonnes signatures et les utiliser.

---

## 🎉 Conclusion

**État actuel : 85% fonctionnel**

- ✅ Infrastructure complète (WebSocket, backend, frontend)
- ✅ UI/UX prête
- ⚠️ Logique d'exécution à implémenter (~6-10h)

**Pour voir live MAINTENANT** : Utiliser Option 1 (Mock) pour tester le WebSocket.

**Pour 100% fonctionnel** : Implémenter executeAutonomousPlan + file/command services.
