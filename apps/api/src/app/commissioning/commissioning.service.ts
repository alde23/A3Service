import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CommissioningReferenceResponseDto,
  CommissioningValidateRequestDto,
  CommissioningValidateResponseDto,
  CommissioningValidationIssueDto,
} from './dto/commissioning-validate.dto';

@Injectable()
export class CommissioningService {
  constructor(private readonly prisma: PrismaService) {}

  private parseSpecLimits(parameter: string, valueStr: string): { min: number | null, max: number | null } {
    let min: number | null = null;
    let max: number | null = null;
    
    const rangeMatch = valueStr.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
    if (rangeMatch) {
      min = parseFloat(rangeMatch[1]);
      max = parseFloat(rangeMatch[3]);
      return { min, max };
    }

    const numMatch = valueStr.match(/(\d+(\.\d+)?)/);
    const num = numMatch ? parseFloat(numMatch[1]) : null;

    if (num !== null) {
      const lowerParam = parameter.toLowerCase();
      const lowerVal = valueStr.toLowerCase();
      
      if (lowerParam.includes('max') || lowerVal.includes('max')) {
        max = num;
      } else if (lowerParam.includes('min') || lowerVal.includes('min')) {
        min = num;
      } else {
        // If it's a fixed value, we treat it as both min and max for exact validation
        min = num;
        max = num;
      }
    }
    
    return { min, max };
  }

  async getReference(modelId: string): Promise<CommissioningReferenceResponseDto> {
    const model = await this.prisma.boilerModel.findFirst({
      where: { id: modelId, isDeleted: false },
      select: { id: true },
    });

    if (!model) {
      throw new NotFoundException('Boiler model not found');
    }

    const specs = await this.prisma.technicalSpec.findMany({
      where: { modelId: modelId },
    });

    // We only want specs that have a numeric value for commissioning
    const items = specs
      .map(spec => {
        const limits = this.parseSpecLimits(spec.parameter, spec.value);
        return {
          code: spec.parameter, // use parameter as unique code
          label: spec.parameter,
          unit: spec.unit,
          min: limits.min !== null ? limits.min.toFixed(2) : null,
          max: limits.max !== null ? limits.max.toFixed(2) : null,
          required: false, // AI extracted specs aren't strictly required by default
        };
      })
      .filter(item => item.min !== null || item.max !== null);

    return {
      modelId,
      items,
    };
  }

  async validate(
    payload: CommissioningValidateRequestDto,
  ): Promise<CommissioningValidateResponseDto> {
    if (!payload?.modelId || typeof payload.modelId !== 'string') {
      throw new BadRequestException('modelId is required');
    }

    if (!Array.isArray(payload.readings)) {
      throw new BadRequestException('readings must be an array');
    }

    const model = await this.prisma.boilerModel.findFirst({
      where: { id: payload.modelId, isDeleted: false },
      select: { id: true },
    });

    if (!model) {
      throw new NotFoundException('Boiler model not found');
    }

    const specs = await this.prisma.technicalSpec.findMany({
      where: { modelId: payload.modelId },
    });

    const specByCode = new Map(specs.map((spec) => [spec.parameter, spec]));
    const providedCodes = new Set<string>();

    const issues: CommissioningValidationIssueDto[] = payload.readings.map((reading) => {
      if (!reading?.code || typeof reading.code !== 'string') {
        throw new BadRequestException('readings.code is required');
      }

      if (reading.value === undefined || !Number.isFinite(reading.value)) {
        throw new BadRequestException(`readings.${reading.code}.value must be a number`);
      }

      providedCodes.add(reading.code);

      const spec = specByCode.get(reading.code);
      if (!spec) {
        return {
          code: reading.code,
          value: reading.value,
          min: null,
          max: null,
          unit: null,
          status: 'UNKNOWN',
        };
      }

      const limits = this.parseSpecLimits(spec.parameter, spec.value);
      let outOfRange = false;
      
      if (limits.min !== null && new Prisma.Decimal(reading.value).lt(limits.min)) {
        outOfRange = true;
      }
      if (limits.max !== null && new Prisma.Decimal(reading.value).gt(limits.max)) {
        outOfRange = true;
      }

      return {
        code: spec.parameter,
        value: reading.value,
        min: limits.min !== null ? limits.min.toFixed(2) : null,
        max: limits.max !== null ? limits.max.toFixed(2) : null,
        unit: spec.unit,
        status: outOfRange ? 'OUT_OF_RANGE' : 'OK',
      };
    });

    return {
      modelId: payload.modelId,
      valid: issues.every((issue) => issue.status === 'OK'),
      missingRequired: [],
      issues,
    };
  }
}
