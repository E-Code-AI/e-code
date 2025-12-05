import { PrismaClient, InventoryChangeType } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export type InventoryAdjustmentReason =
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
  | 'MANUAL_ADJUSTMENT'
  | 'STOCK_RECEIVED'
  | 'STOCK_CORRECTION';

export interface InventoryCheckItem {
  productId: string;
  quantity: number;
}

export interface InventoryCheckResultItem {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface InventoryCheckResult {
  allAvailable: boolean;
  items: InventoryCheckResultItem[];
}

export interface InventoryAdjustmentItem {
  productId: string;
  quantityChange: number;
}

export interface InventoryAdjustmentPayload {
  items: InventoryAdjustmentItem[];
  reason: InventoryAdjustmentReason;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface InventoryService {
  validateStockBeforeCheckout(
    items: InventoryCheckItem[],
  ): Promise<InventoryCheckResult>;
  reserveStockForOrder(
    orderId: string,
    items: InventoryCheckItem[],
  ): Promise<void>;
  releaseStockForOrder(
    orderId: string,
    items: InventoryCheckItem[],
  ): Promise<void>;
  applyInventoryAdjustment(
    payload: InventoryAdjustmentPayload,
  ): Promise<void>;
}

const inventoryCheckItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const inventoryAdjustmentItemSchema = z.object({
  productId: z.string().min(1),
  quantityChange: z.number().int().nonzero(),
});

const inventoryAdjustmentPayloadSchema = z.object({
  items: z.array(inventoryAdjustmentItemSchema).min(1),
  reason: z.custom<InventoryAdjustmentReason>((val) =>
    ['ORDER_PLACED', 'ORDER_CANCELLED', 'MANUAL_ADJUSTMENT', 'STOCK_RECEIVED', 'STOCK_CORRECTION'].includes(
      String(val),
    ),
  ),
  referenceId: z.string().min(1).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

class InventoryServiceImpl implements InventoryService {
  async validateStockBeforeCheckout(
    items: InventoryCheckItem[],
  ): Promise<InventoryCheckResult> {
    const parsedItems = z.array(inventoryCheckItemSchema).min(1).parse(items);

    const productIds = parsedItems.map((i) => i.productId);
    const uniqueProductIds = Array.from(new Set(productIds));

    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        productId: { in: uniqueProductIds },
      },
      select: {
        productId: true,
        availableQuantity: true,
      },
    });

    const inventoryMap = new Map<string, number>();
    for (const record of inventoryRecords) {
      inventoryMap.set(record.productId, record.availableQuantity);
    }

    const resultItems: InventoryCheckResultItem[] = parsedItems.map((item) => {
      const availableQuantity = inventoryMap.get(item.productId) ?? 0;
      return {
        productId: item.productId,
        requestedQuantity: item.quantity,
        availableQuantity,
        isAvailable: availableQuantity >= item.quantity,
      };
    });

    const allAvailable = resultItems.every((i) => i.isAvailable);

    return {
      allAvailable,
      items: resultItems,
    };
  }

  async reserveStockForOrder(
    orderId: string,
    items: InventoryCheckItem[],
  ): Promise<void> {
    const parsedItems = z.array(inventoryCheckItemSchema).min(1).parse(items);
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Invalid orderId');
    }

    await prisma.$transaction(async (tx) => {
      const productIds = parsedItems.map((i) => i.productId);
      const uniqueProductIds = Array.from(new Set(productIds));

      const inventoryRecords = await tx.inventory.findMany({
        where: {
          productId: { in: uniqueProductIds },
        },
        select: {
          id: true,
          productId: true,
          availableQuantity: true,
          reservedQuantity: true,
        },
      });

      const inventoryMap = new Map<
        string,
        {
          id: string;
          availableQuantity: number;
          reservedQuantity: number;
        }
      >();

      for (const record of inventoryRecords) {
        inventoryMap.set(record.productId, {
          id: record.id,
          availableQuantity: record.availableQuantity,
          reservedQuantity: record.reservedQuantity,
        });
      }

      for (const item of parsedItems) {
        const record = inventoryMap.get(item.productId);
        const availableQuantity = record?.availableQuantity ?? 0;

        if (availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product undefined. Requested: undefined, Available: undefined`,
          );
        }
      }

      for (const item of parsedItems) {
        const record = inventoryMap.get(item.productId);

        if (!record) {
          const createdInventory = await tx.inventory.create({
            data: {
              productId: item.productId,
              availableQuantity: 0,
              reservedQuantity: item.quantity,
            },
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              changeType: InventoryChangeType.RESERVED,
              quantityChange: -item.quantity,
              reason: 'ORDER_PLACED',
              referenceId: orderId,
              metadata: {
                action: 'reserveStockForOrder',
                createdInventory: true,
              },
              inventoryId: createdInventory.id,
            },
          });

          continue;
        }

        await tx.inventory.update({
          where: { id: record.id },
          data: {
            availableQuantity: {
              decrement: item.quantity,
            },
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            changeType: InventoryChangeType.RESERVED,
            quantityChange: -item.quantity,
            reason: 'ORDER_PLACED',
            referenceId: orderId,
            metadata: {
              action: 'reserveStockForOrder',
            },
            inventoryId: record.id,
          },
        });
      }
    });
  }

  async releaseStockForOrder(
    orderId: string,
    items: InventoryCheckItem[],
  ): Promise<void> {
    const parsedItems = z.array(inventoryCheckItemSchema).min(1).parse(items);
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Invalid orderId');
    }

    await prisma.$transaction(async (tx) => {
      const productIds = parsedItems.map((i) => i.productId);
      const uniqueProductIds = Array.from(new Set(productIds));

      const inventoryRecords = await tx.inventory.findMany({
        where: {
          productId: { in: uniqueProductIds },
        },
        select: {
          id: true,
          productId: true,
          availableQuantity: true,
          reservedQuantity: true,
        },
      });

      const inventoryMap = new Map<
        string,
        {
          id: string;
          availableQuantity: number;
          reservedQuantity: number;
        }
      >();

      for (const record of inventoryRecords) {
        inventoryMap.set(record.productId, {
          id: record.id,
          availableQuantity: record.availableQuantity,
          reservedQuantity: record.reservedQuantity,
        });
      }

      for (const item of parsedItems) {
        const record = inventoryMap.get(item.productId);
        const reservedQuantity = record?.reservedQuantity ?? 0;

        if (reservedQuantity < item.quantity) {
          throw new Error(
            `Cannot release more reserved stock than exists for product undefined. Requested: undefined, Reserved: undefined`,
          );
        }
      }

      for (const item of parsedItems) {
        const record = inventoryMap.get(item.productId);

        if (!record) {
          throw new Error(
            `Inventory record not found for product undefined while releasing stock`,
          );
        }

        await tx.inventory.update({
          where: { id: record.id },
          data: {
            availableQuantity: {
              increment: item.quantity,
            },
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            changeType: InventoryChangeType.RELEASED,
            quantityChange: item.quantity,
            reason: 'ORDER_CANCELLED',
            referenceId: orderId,
            metadata: {
              action: 'releaseStockForOrder',
            },
            inventoryId: record.id,
          },
        });
      }
    });
  }

  async applyInventoryAdjustment(payload: InventoryAdjustmentPayload): Promise<void> {
    const parsedPayload = inventoryAdjustmentPayloadSchema.parse(payload);

    await prisma.$transaction(async (tx) => {
      const productIds = parsedPayload.items.map((i) => i.productId);
      const uniqueProductIds = Array.from(new Set(productIds));

      const inventoryRecords = await tx.inventory.findMany({
        where: {
          productId: { in: uniqueProductIds },
        },
        select: {
          id: true,
          productId: true