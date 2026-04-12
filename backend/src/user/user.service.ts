import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, GetUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  tenant_id: true,
  created_at: true,
} as const;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private async findOneOrFail(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, is_deleted: 0 },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async getUsers(body: GetUserDto) {
    const { tenant_id, status = 0, user_id } = body;

    if (user_id) {
      const user = await this.prisma.user.findFirst({
        where: { id: user_id, is_deleted: status },
        select: USER_SELECT,
      });
      if (!user) throw new NotFoundException(`User ${user_id} not found`);
      return user;
    }

    return this.prisma.user.findMany({
      where: { tenant_id, is_deleted: status },
      select: USER_SELECT,
    });
  }

  async create(data: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing)
      throw new ConflictException(`Email ${data.email} already in use`);

    const hashed = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: { ...data, password: hashed, role: data.role ?? 'member' },
      select: USER_SELECT,
    });
  }

  async update(dto: UpdateUserDto) {
    const { user_id, is_deleted, ...fields } = dto;
    await this.findOneOrFail(user_id);

    return this.prisma.user.update({
      where: { id: user_id },
      data: {
        ...fields,
        ...(is_deleted !== undefined ? { is_deleted } : {}),
        modified_time: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        tenant_id: true,
        is_deleted: true,
        modified_time: true,
      },
    });
  }

  async signup(email: string, password: string, tenant_id: number) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException(`Email ${email} already in use`);

    const hashed = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: { email, password: hashed, tenant_id, role: 'member' },
      select: USER_SELECT,
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid password');

    return user;
  }
}
