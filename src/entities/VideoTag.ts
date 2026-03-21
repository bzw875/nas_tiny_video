import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Video } from './Video';
import { Tag } from './Tag';

@Entity('video_tags')
export class VideoTag {
  @PrimaryColumn()
  videoId!: number;

  @PrimaryColumn()
  tagId!: number;

  @ManyToOne(() => Video)
  video!: Video;

  @ManyToOne(() => Tag)
  tag!: Tag;
}
