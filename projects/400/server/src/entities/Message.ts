import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Channel } from "./Channel";
import { DirectMessageThread } from "./DirectMessageThread";
import { MessageAttachment } from "./MessageAttachment";

export enum MessageVisibility {
  VISIBLE = "VISIBLE",
  EDITED = "EDITED",
  DELETED = "DELETED",
}

@Entity({ name: "messages" })
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  @Index()
  createdAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  editedAt!: Date | null;

  @Column({
    type: "enum",
    enum: MessageVisibility,
    default: MessageVisibility.VISIBLE,
  })
  visibility!: MessageVisibility;

  @ManyToOne(() => User, (user) => user.messages, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "senderId" })
  sender!: User;

  @Column({ type: "uuid" })
  @Index()
  senderId!: string;

  @ManyToOne(() => Channel, (channel) => channel.messages, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "channelId" })
  channel!: Channel | null;

  @Column({ type: "uuid", nullable: true })
  @Index()
  channelId!: string | null;

  @ManyToOne(
    () => DirectMessageThread,
    (thread) => thread.messages,
    {
      nullable: true,
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "directMessageThreadId" })
  directMessageThread!: DirectMessageThread | null;

  @Column({ type: "uuid", nullable: true })
  @Index()
  directMessageThreadId!: string | null;

  @ManyToOne(() => Message, (message) => message.threadReplies, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parentMessageId" })
  parentMessage!: Message | null;

  @Column({ type: "uuid", nullable: true })
  @Index()
  parentMessageId!: string | null;

  @OneToMany(() => Message, (message) => message.parentMessage)
  threadReplies!: Message[];

  @OneToMany(
    () => MessageAttachment,
    (attachment) => attachment.message,
    { cascade: ["insert", "update"], eager: true }
  )
  attachments!: MessageAttachment[];

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}