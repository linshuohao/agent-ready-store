import { Controller, Get } from '@nestjs/common';
import { serviceName } from '@store/contracts';

@Controller('api/v1')
export class AppController {
  @Get('health')
  health() {
    return { ok: true, service: serviceName };
  }
}
