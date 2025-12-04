import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './User';

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
};

@Entity({ name: 'push_subscriptions' })
@Unique('UQ_push_subscription_endpoint_user', ['endpoint', 'user'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_push_subscription_endpoint')
  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'bigint', nullable: true })
  expirationTime: number | null;

  @Column({ type: 'text' })
  p256dh!: string;

  @Column({ type: 'text' })
  auth!: string;

  @ManyToOne(() => User, (user) => user.pushSubscriptions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @Index('IDX_push_subscription_user')
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  static fromWebPushSubscription(
    subscription: PushSubscriptionJSON,
    user: User
  ): PushSubscription {
    const entity = new PushSubscription();
    entity.endpoint = subscription.endpoint;
    entity.expirationTime =
      subscription.expirationTime !== null
        ? Number(subscription.expirationTime)
        : null;
    entity.p256dh = subscription.keys.p256dh;
    entity.auth = subscription.keys.auth;
    entity.user = user;
    return entity;
  }

  toWebPushSubscription(): PushSubscriptionJSON {
    return {
      endpoint: this.endpoint,
      expirationTime: this.expirationTime ?? null,
      keys: {
        p256dh: this.p256dh,
        auth: this.auth,
      },
    };
  }
}