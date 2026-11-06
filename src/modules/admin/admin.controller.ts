// backend/src/modules/admin/admin.controller.ts
import { Controller, Post, Body, UseGuards, Param, Patch, Req, Inject } from '@nestjs/common';

interface AdminService {
  addWhitelist(identifier: string): Promise<unknown>;
  toggleUserLock(adminId: string, userId: string, locked: boolean, reason: string): Promise<unknown>;
  adjustUserBamboo(adminId: string, targetUserId: string, amount: number, reason: string): Promise<unknown>;
}
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(@Inject('AdminService') private adminService: AdminService) {}

  @Post('whitelist')
  async addToWhitelist(@Body('identifier') identifier: string) {
    return await this.adminService.addWhitelist(identifier);
  }

  @Patch('users/:id/lock')
  async lockUser(@Req() req: any, @Param('id') userId: string, @Body('reason') reason: string) {
    return await this.adminService.toggleUserLock(req.user.id, userId, true, reason);
  }

  @Patch('users/:id/unlock')
  async unlockUser(@Req() req: any, @Param('id') userId: string, @Body('reason') reason: string) {
    return await this.adminService.toggleUserLock(req.user.id, userId, false, reason);
  }

  @Post('bamboo/adjust')
  async adjustBamboo(
    @Req() req: any,
    @Body() dto: { targetUserId: string; amount: number; reason: string },
  ) {
    return await this.adminService.adjustUserBamboo(req.user.id, dto.targetUserId, dto.amount, dto.reason);
  }
}