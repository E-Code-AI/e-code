import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Column,
  Index,
} from "typeorm";
import { User } from "./User";
import { Channel } from "./Channel";

export enum ChannelMemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

export enum ChannelMemberStatus {
  ACTIVE = "active",
  INVITED = "invited",
  BANNED = "banned",
  LEFT = "left",
}

@Entity({ name: "channel_members" })
@Unique("UQ_channel_member_channel_user", ["channelId", "userId"])
export class ChannelMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index("IDX_channel_member_channel_id")
  @Column({ type: "uuid" })
  channelId!: string;

  @Index("IDX_channel_member_user_id")
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => Channel, (channel) => channel.members, {
    onDelete: "CASCADE",
    nullable: false,
  })
  channel!: Channel;

  @ManyToOne(() => User, (user) => user.channelMemberships, {
    onDelete: "CASCADE",
    nullable: false,
  })
  user!: User;

  @Column({
    type: "enum",
    enum: ChannelMemberRole,
    default: ChannelMemberRole.MEMBER,
  })
  role!: ChannelMemberRole;

  @Column({
    type: "enum",
    enum: ChannelMemberStatus,
    default: ChannelMemberStatus.ACTIVE,
  })
  status!: ChannelMemberStatus;

  @Column({ type: "boolean", default: false })
  isMuted!: boolean;

  @Column({ type: "boolean", default: false })
  isPinned!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  joinedAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastReadAt: Date | null = null;

  @Column({ type: "timestamptz", nullable: true })
  leftAt: Date | null = null;
}