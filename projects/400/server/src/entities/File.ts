import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Message } from "./Message";

export enum FileType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  OTHER = "other",
}

@Entity({ name: "files" })
export class File {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  @Index()
  name!: string;

  @Column({
    type: "enum",
    enum: FileType,
    default: FileType.OTHER,
  })
  type!: FileType;

  @Column({ type: "bigint" })
  size!: number;

  @Column({ type: "varchar", length: 2048 })
  url!: string;

  @ManyToOne(() => Message, (message) => message.files, {
    nullable: false,
    onDelete: "CASCADE",
  })
  message!: Message;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}