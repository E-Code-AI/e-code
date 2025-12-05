import express, { Request, Response, NextFunction, Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { HistoryStore } from "../services/historyStore";
import { HistorySearch } from "../services/historySearch";

const router: Router = express.Router();

const historyStore = new HistoryStore();
const historySearch = new HistorySearch();

interface TypedRequestQuery<T> extends Request {
  query: T;
}

interface TypedRequestParams<T> extends Request {
  params: T;
}

interface TypedRequestBody<T> extends Request {
  body: T;
}

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "ValidationError",
      details: errors.array(),
    });
    return;
  }
  next();
};

router.get(
  "/",
  [
    query("userId").optional().isString().trim().notEmpty(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
    query("sort")
      .optional()
      .isIn(["createdAt:desc", "createdAt:asc", "updatedAt:desc", "updatedAt:asc"]),
  ],
  handleValidationErrors,
  async (
    req: TypedRequestQuery<{
      userId?: string;
      limit?: string;
      offset?: string;
      sort?: string;
    }>,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.query.userId;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const sort = (req.query.sort as string | undefined) ?? "updatedAt:desc";

      const [sortField, sortDirection] = sort.split(":") as [
        "createdAt" | "updatedAt",
        "asc" | "desc"
      ];

      const result = await historyStore.listConversations({
        userId,
        limit,
        offset,
        sortBy: sortField,
        sortDirection,
      });

      res.json(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error listing conversations:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

router.get(
  "/:conversationId",
  [param("conversationId").isString().trim().notEmpty()],
  handleValidationErrors,
  async (
    req: TypedRequestParams<{ conversationId: string }>,
    res: Response
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const conversation = await historyStore.getConversation(conversationId);

      if (!conversation) {
        res.status(404).json({ error: "ConversationNotFound" });
        return;
      }

      res.json(conversation);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

router.get(
  "/search",
  [
    query("q").isString().trim().notEmpty(),
    query("userId").optional().isString().trim().notEmpty(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
  ],
  handleValidationErrors,
  async (
    req: TypedRequestQuery<{
      q: string;
      userId?: string;
      limit?: string;
      offset?: string;
    }>,
    res: Response
  ): Promise<void> => {
    try {
      const queryText = req.query.q;
      const userId = req.query.userId;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

      const result = await historySearch.search({
        query: queryText,
        userId,
        limit,
        offset,
      });

      res.json(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error searching histories:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

router.delete(
  "/:conversationId",
  [
    param("conversationId").isString().trim().notEmpty(),
    query("hard")
      .optional()
      .isBoolean()
      .toBoolean()
      .customSanitizer((value) => value === "true" || value === true),
  ],
  handleValidationErrors,
  async (
    req: TypedRequestParams<{ conversationId: string }> &
      TypedRequestQuery<{ hard?: string | boolean }>,
    res: Response
  ): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const hard =
        typeof req.query.hard === "string"
          ? req.query.hard === "true"
          : Boolean(req.query.hard);

      const deleted = await historyStore.deleteConversation(conversationId, {
        hardDelete: hard,
      });

      if (!deleted) {
        res.status(404).json({ error: "ConversationNotFound" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

router.delete(
  "/:conversationId/messages/:messageId",
  [
    param("conversationId").isString().trim().notEmpty(),
    param("messageId").isString().trim().notEmpty(),
    query("hard")
      .optional()
      .isBoolean()
      .toBoolean()
      .customSanitizer((value) => value === "true" || value === true),
  ],
  handleValidationErrors,
  async (
    req: TypedRequestParams<{ conversationId: string; messageId: string }> &
      TypedRequestQuery<{ hard?: string | boolean }>,
    res: Response
  ): Promise<void> => {
    try {
      const { conversationId, messageId } = req.params;
      const hard =
        typeof req.query.hard === "string"
          ? req.query.hard === "true"
          : Boolean(req.query.hard);

      const deleted = await historyStore.deleteMessage(
        conversationId,
        messageId,
        { hardDelete: hard }
      );

      if (!deleted) {
        res.status(404).json({ error: "MessageNotFound" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

router.post(
  "/bulk-delete",
  [
    body("conversationIds")
      .optional()
      .isArray({ min: 1 })
      .withMessage("conversationIds must be a non-empty array"),
    body("conversationIds.*").isString().trim().notEmpty(),
    body("messageIds")
      .optional()
      .isArray({ min: 1 })
      .withMessage("messageIds must be a non-empty array"),
    body("messageIds.*.conversationId")
      .if(body("messageIds").exists())
      .isString()
      .trim()
      .notEmpty(),
    body("messageIds.*.messageId")
      .if(body("messageIds").exists())
      .isString()
      .trim()
      .notEmpty(),
    body("hard").optional().isBoolean(),
  ],
  handleValidationErrors,
  async (
    req: TypedRequestBody<{
      conversationIds?: string[];
      messageIds?: { conversationId: string; messageId: string }[];
      hard?: boolean;
    }>,
    res: Response
  ): Promise<void> => {
    try {
      const { conversationIds = [], messageIds = [], hard = false } = req.body;

      if (conversationIds.length === 0 && messageIds.length === 0) {
        res.status(400).json({
          error: "ValidationError",
          details: [
            {
              msg: "At least one of conversationIds or messageIds must be provided",
              param: "conversationIds|messageIds",
              location: "body",
            },
          ],
        });
        return;
      }

      const result = await historyStore.bulkDelete({
        conversationIds,
        messages: messageIds,
        hardDelete: hard,
      });

      res.json(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in bulk delete:", error);
      res.status(500).json({ error: "InternalServerError" });
    }
  }
);

export default router;