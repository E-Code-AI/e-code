import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from "typeorm";
import { User } from "./User";
import { DirectMessageMessage } from "./DirectMessageMessage";

export enum DirectMessageStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

@Entity({ name: "direct_messages" })
@Unique("UQ_direct_messages_participants", ["participantA", "participantB"])
export class DirectMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.directMessagesAsParticipantA, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @Index("IDX_direct_messages_participant_a")
  participantA!: User;

  @ManyToOne(() => User, (user) => user.directMessagesAsParticipantB, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @Index("IDX_direct_messages_participant_b")
  participantB!: User;

  @OneToMany(
    () => DirectMessageMessage,
    (message) => message.conversation,
    { cascade: ["insert", "update"], orphanedRowAction: "delete" }
  )
  messages!: DirectMessageMessage[];

  @Column({
    type: "enum",
    enum: DirectMessageStatus,
    default: DirectMessageStatus.ACTIVE,
  })
  status!: DirectMessageStatus;

  @Column({ type: "boolean", default: false })
  participantADeleted!: boolean;

  @Column({ type: "boolean", default: false })
  participantBDeleted!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  lastMessageId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  static createParticipantsKey(userId1: string, userId2: string): {
    participantAId: string;
    participantBId: string;
  } {
    if (userId1 === userId2) {
      throw new Error("Direct message participants must be different users");
    }
    const [participantAId, participantBId] = [userId1, userId2].sort();
    return { participantAId, participantBId };
  }

  isParticipant(userId: string): boolean {
    return (
      this.participantA.id === userId ||
      this.participantB.id === userId
    );
  }

  getOtherParticipantId(userId: string): string | null {
    if (!this.isParticipant(userId)) return null;
    return this.participantA.id === userId
      ? this.participantB.id
      : this.participantA.id;
  }

  markDeletedBy(userId: string): void {
    if (this.participantA.id === userId) {
      this.participantADeleted = true;
    } else if (this.participantB.id === userId) {
      this.participantBDeleted = true;
    }
  }

  isFullyDeleted(): boolean {
    return this.participantADeleted && this.participantBDeleted;
  }
}