import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Tag } from './Tag';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  filename!: string;

  @Column({ type: 'varchar' })
  path!: string;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'datetime' })
  modifiedAt!: Date;

  @Column({ type: 'varchar' })
  smbHost!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Tag, tag => tag.videos)
  @JoinTable({
    name: 'video_tags',
    joinColumn: { name: 'videoId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: Tag[];
}
