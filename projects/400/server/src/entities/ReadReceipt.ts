import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Index,
  Column,
} from "typeorm";
import { User } from "./User";
import { Message } from "./Message";

@Entity({ name: "read_receipts" })
@Unique("UQ_read_receipt_user_message", ["user", "message"])
export class ReadReceipt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.readReceipts, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @Index("IDX_read_receipt_user")
  user!: User;

  @ManyToOne(() => Message, (message) => message.readReceipts, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @Index("IDX_read_receipt_message")
  message!: Message;

  @CreateDateColumn({ name: "read_at", type: "timestamptz" })
  readAt!: Date;

  @Column({ name: "channel_id", type: "uuid", nullable: true })
  @Index("IDX_read_receipt_channel")
  channelId!: string | null;

  @Column({ name: "dm_thread_id", type: "uuid", nullable: true })
  @Index("IDX_read_receipt_dm_thread")
  dmThreadId!: string | null;
}