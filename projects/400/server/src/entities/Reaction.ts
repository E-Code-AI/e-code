import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Unique,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Message } from './Message';

export type ReactionType =
  | 'like'
  | 'love'
  | 'laugh'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'custom';

@Entity({ name: 'reactions' })
@Unique('UQ_reaction_user_message_emoji', ['user', 'message', 'emoji'])
@Index('IDX_reaction_message', ['message'])
@Index('IDX_reaction_user', ['user'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.reactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Message, (message) => message.reactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @Column({ type: 'varchar', length: 64 })
  @Index('IDX_reaction_emoji')
  emoji!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: 'custom',
  })
  type!: ReactionType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}