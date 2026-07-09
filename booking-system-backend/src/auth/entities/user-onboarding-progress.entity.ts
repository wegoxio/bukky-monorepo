import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import type { UserRole } from '../../users/entities/user.entity';

@Entity('user_onboarding_progress')
@Unique('UQ_user_onboarding_progress_user_module_version', ['user_id', 'module_key', 'version'])
@Index('IDX_user_onboarding_progress_user_completed', ['user_id', 'completed_at'])
export class UserOnboardingProgress extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  @Column({ type: 'varchar', length: 32 })
  role: UserRole;

  @Column({ type: 'varchar', length: 96 })
  module_key: string;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'timestamptz' })
  completed_at: Date;
}
