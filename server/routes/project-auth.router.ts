import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { storage } from "../storage";

const router = Router();

router.get("/:projectId/config", ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const config = await storage.getProjectAuthConfig(projectId);
    res.json(config || {
      projectId,
      enabled: false,
      providers: ["email"],
      allowedDomains: [],
      requireVerifiedEmail: false,
      loginRedirectUrl: null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch auth config" });
  }
});

router.put("/:projectId/config", ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const { enabled, providers, allowedDomains, requireVerifiedEmail, loginRedirectUrl } = req.body;
    const config = await storage.upsertProjectAuthConfig(projectId, {
      enabled,
      providers,
      allowedDomains,
      requireVerifiedEmail,
      loginRedirectUrl,
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Failed to update auth config" });
  }
});

router.get("/:projectId/users", ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const users = await storage.getProjectAuthUsers(projectId, limit);
    res.json({ users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch auth users" });
  }
});

router.delete("/:projectId/users/:userId", ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(projectId) || isNaN(userId)) return res.status(400).json({ error: "Invalid ID" });

    const deleted = await storage.deleteProjectAuthUser(projectId, userId);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete auth user" });
  }
});

export default router;
