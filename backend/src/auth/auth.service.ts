import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { SignupDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  signup(dto: SignupDto) {
    return this.userService.signup(dto.email, dto.password, dto.tenant_id);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.validateUser(dto.email, dto.password);

    const payload = { userId: user.id, tenantId: user.tenant_id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
