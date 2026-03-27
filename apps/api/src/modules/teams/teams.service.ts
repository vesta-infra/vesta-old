import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamMember } from '@vesta/db';
import { TeamRole } from '@vesta/shared';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    userId: string,
    data: { name: string },
  ): Promise<Team> {
    const slug = this.generateSlug(data.name);

    const existing = await this.teamRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Team slug already taken');
    }

    const team = this.teamRepo.create({ name: data.name, slug });
    const savedTeam = await this.teamRepo.save(team);

    const member = this.memberRepo.create({
      team_id: savedTeam.id,
      user_id: userId,
      role: TeamRole.OWNER,
      invited_at: new Date(),
      accepted_at: new Date(),
    });
    await this.memberRepo.save(member);

    return savedTeam;
  }

  async findByUser(userId: string): Promise<Team[]> {
    const memberships = await this.memberRepo.find({
      where: { user_id: userId },
      relations: ['team'],
    });
    return memberships.map((m) => m.team);
  }

  async findById(id: string): Promise<Team | null> {
    return this.teamRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: Partial<Pick<Team, 'name'>>,
  ): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (data.name) {
      team.name = data.name;
      team.slug = this.generateSlug(data.name);
    }

    return this.teamRepo.save(team);
  }

  async delete(id: string): Promise<void> {
    const result = await this.teamRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Team not found');
    }
  }

  async addMember(
    teamId: string,
    email: string,
    role: TeamRole,
  ): Promise<TeamMember> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`No user found with email ${email}`);
    }

    const existing = await this.memberRepo.findOne({
      where: { team_id: teamId, user_id: user.id },
    });
    if (existing) {
      throw new ConflictException('User is already a team member');
    }

    const member = this.memberRepo.create({
      team_id: teamId,
      user_id: user.id,
      role,
      invited_at: new Date(),
    });
    return this.memberRepo.save(member);
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    const result = await this.memberRepo.delete({
      team_id: teamId,
      id: memberId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Member not found');
    }
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: TeamRole,
  ): Promise<TeamMember> {
    const member = await this.memberRepo.findOne({
      where: { team_id: teamId, id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = role;
    return this.memberRepo.save(member);
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepo.find({
      where: { team_id: teamId },
      relations: ['user'],
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '');
  }
}
