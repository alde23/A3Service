import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../rbac/roles.decorator';
import { RolesGuard } from '../../rbac/roles.guard';
import { UserRole } from '../../generated/prisma/client';
import { LibraryService } from './library.service';
import type { LibrarySearchQueryDto } from './dto/library-search.dto';
import type { LibraryIngestDto } from './dto/library-ingest.dto';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('search')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async search(@Query() query: LibrarySearchQueryDto) {
    const parsed = this.parseQuery(query);
    return this.libraryService.search(parsed);
  }

  @Get('models')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async listModels(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const page = pageRaw ? Number(pageRaw) : undefined;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined;
    return this.libraryService.listModels(page, pageSize);
  }

  @Get('models/:id')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async getModel(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.libraryService.getModel(id);
  }

  @Get('faults/:code')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async getFault(@Param('code') code: string) {
    if (!code) {
      throw new BadRequestException('code is required');
    }
    return this.libraryService.getFaultByCode(code);
  }

  @Get('parts/:id')
  @Roles(UserRole.MANAGER, UserRole.TECHNICIAN)
  async getPart(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.libraryService.getPart(id);
  }

  @Post('ingest/validate')
  @Roles(UserRole.MANAGER)
  async validate(@Body() body: LibraryIngestDto) {
    return this.libraryService.validateIngest(body ?? {});
  }

  @Post('ingest')
  @Roles(UserRole.MANAGER)
  async ingest(@Body() body: LibraryIngestDto) {
    return this.libraryService.ingest(body ?? {});
  }

  @Get('ingest/runs/:id')
  @Roles(UserRole.MANAGER)
  async getIngestRun(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }
    return this.libraryService.getIngestRun(id);
  }

  private parseQuery(query: LibrarySearchQueryDto): LibrarySearchQueryDto {
    const parsed: LibrarySearchQueryDto = {
      q: this.toOptionalString(query.q),
      model: this.toOptionalString(query.model),
      manufacturer: this.toOptionalString(query.manufacturer),
      faultCode: this.toOptionalString(query.faultCode),
      part: this.toOptionalString(query.part),
    };

    if (query.page !== undefined) {
      parsed.page = this.parsePositiveInt(query.page, 'page');
    }

    if (query.pageSize !== undefined) {
      parsed.pageSize = this.parsePositiveInt(query.pageSize, 'pageSize');
    }

    return parsed;
  }

  private parsePositiveInt(value: number | string, label: string) {
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${label} must be a positive number`);
    }
    return Math.floor(parsed);
  }

  private toOptionalString(value?: string) {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException('query parameters must be strings');
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
