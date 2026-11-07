import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

interface AuthedRequest {
  headers: Record<string, string | undefined>;
  user?: { id: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token đăng nhập.');
    }

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }

    const authWithSessionValidation = this.auth as AuthService & {
      validateUserSession?: (userId: string) => Promise<void>;
    };

    await authWithSessionValidation.validateUserSession?.(userId);
    req.user = { id: userId };
    return true;
  }
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user!.id,
);