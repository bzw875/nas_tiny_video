import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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
}
