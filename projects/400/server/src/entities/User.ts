import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Message } from './Message';
import { Channel } from './Channel';
import { DirectMessage } from './DirectMessage';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  DO_NOT_DISTURB = 'do_not_disturb',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, unique: true })
  username!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl?: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE,
  })
  status!: UserStatus;

  @OneToMany(() => Message, (message) => message.author, {
    cascade: ['insert', 'update'],
  })
  messages!: Message[];

  @ManyToMany(() => Channel, (channel) => channel.members, {
    cascade: ['insert', 'update'],
  })
  @JoinTable({
    name: 'user_channels',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'channel_id', referencedColumnName: 'id' },
  })
  channels!: Channel[];

  @OneToMany(() => DirectMessage, (dm) => dm.sender, {
    cascade: ['insert', 'update'],
  })
  sentDirectMessages!: DirectMessage[];

  @OneToMany(() => DirectMessage, (dm) => dm.recipient, {
    cascade: ['insert', 'update'],
  })
  receivedDirectMessages!: DirectMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}