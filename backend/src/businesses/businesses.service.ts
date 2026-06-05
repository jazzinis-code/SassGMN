import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Business, Prisma } from '@prisma/client';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto): Promise<Business> {
    return this.prisma.business.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAllByUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<Business>> {
    const where: Prisma.BusinessWhereInput = { userId };

    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);

    return new PaginatedResponseDto(
      data,
      total,
      pagination.page || 1,
      pagination.limit || 20,
    );
  }

  async findById(id: string, userId: string): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Empresa nao encontrada');
    }

    if (business.userId !== userId) {
      throw new ForbiddenException('Acesso negado a esta empresa');
    }

    return business;
  }

  async update(id: string, userId: string, dto: UpdateBusinessDto): Promise<Business> {
    await this.findById(id, userId);

    return this.prisma.business.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.prisma.business.delete({ where: { id } });
  }

  async findByGoogleProfileId(googleProfileId: string): Promise<Business | null> {
    return this.prisma.business.findUnique({
      where: { googleProfileId },
    });
  }

  async getActiveBusinesses(userId: string): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: { userId, isActive: true },
    });
  }
}
