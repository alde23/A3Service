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

  async getReference(modelId: string): Promise<CommissioningReferenceResponseDto> {
    const model = await this.prisma.boilerModel.findFirst({
      where: { id: modelId, isDeleted: false },
      select: { id: true },
    });

    if (!model) {
      throw new NotFoundException('Boiler model not found');
    }

    const references = await this.prisma.referenceTable.findMany({
      where: { boilerModelId: modelId },
      include: { property: true },
      orderBy: { property: { code: 'asc' } },
    });

    return {
      modelId,
      items: references.map((ref) => ({
        code: ref.property.code,
        label: ref.property.label,
        unit: ref.property.unit ?? null,
        min: ref.minValue ? ref.minValue.toFixed(2) : null,
        max: ref.maxValue ? ref.maxValue.toFixed(2) : null,
        required: ref.required,
      })),
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

    const references = await this.prisma.referenceTable.findMany({
      where: { boilerModelId: payload.modelId },
      include: { property: true },
    });

    const referenceByCode = new Map(
      references.map((ref) => [ref.property.code, ref]),
    );

    const providedCodes = new Set<string>();
    const issues: CommissioningValidationIssueDto[] = payload.readings.map((reading) => {
      if (!reading?.code || typeof reading.code !== 'string') {
        throw new BadRequestException('readings.code is required');
      }

      if (reading.value === undefined || !Number.isFinite(reading.value)) {
        throw new BadRequestException(`readings.${reading.code}.value must be a number`);
      }

      providedCodes.add(reading.code);

      const reference = referenceByCode.get(reading.code);
      if (!reference) {
        return {
          code: reading.code,
          value: reading.value,
          min: null,
          max: null,
          unit: null,
          status: 'UNKNOWN',
        };
      }

      const min = reference.minValue;
      const max = reference.maxValue;

      let outOfRange = false;
      if (min && new Prisma.Decimal(reading.value).lt(min)) {
        outOfRange = true;
      }
      if (max && new Prisma.Decimal(reading.value).gt(max)) {
        outOfRange = true;
      }

      return {
        code: reference.property.code,
        value: reading.value,
        min: min ? min.toFixed(2) : null,
        max: max ? max.toFixed(2) : null,
        unit: reference.property.unit ?? null,
        status: outOfRange ? 'OUT_OF_RANGE' : 'OK',
      };
    });

    const missingRequired = references
      .filter((ref) => ref.required && !providedCodes.has(ref.property.code))
      .map((ref) => ref.property.code);

    missingRequired.forEach((code) => {
      const reference = referenceByCode.get(code);
      issues.push({
        code,
        value: null,
        min: reference?.minValue ? reference.minValue.toFixed(2) : null,
        max: reference?.maxValue ? reference.maxValue.toFixed(2) : null,
        unit: reference?.property.unit ?? null,
        status: 'MISSING',
      });
    });

    const valid =
      missingRequired.length === 0 &&
      issues.every((issue) => issue.status === 'OK');

    return {
      modelId: payload.modelId,
      valid,
      missingRequired,
      issues,
    };
  }
}
