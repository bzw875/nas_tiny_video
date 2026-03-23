import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Video } from './Video';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  color!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Video, video => video.tags)
  videos!: Video[];
}
