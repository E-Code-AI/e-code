import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from "typeorm";
import { Message } from "./Message";
import { User } from "./User";

export enum ChannelType {
  PUBLIC = "public",
  PRIVATE = "private",
}

@Entity({ name: "channels" })
export class Channel {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({
    type: "enum",
    enum: ChannelType,
    default: ChannelType.PUBLIC,
  })
  type!: ChannelType;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => Message, (message) => message.channel, {
    cascade: ["insert", "update"],
  })
  messages!: Message[];

  @ManyToMany(() => User, (user) => user.channels, {
    cascade: ["insert", "update"],
  })
  @JoinTable({
    name: "channel_members",
    joinColumn: {
      name: "channel_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "user_id",
      referencedColumnName: "id",
    },
  })
  members!: User[];
}