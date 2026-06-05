import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditAction } from './audit.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('deve criar um registro de auditoria com action e userId', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.log('user-1', AuditAction.USER_LOGIN);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: AuditAction.USER_LOGIN,
          details: null,
        },
      });
    });

    it('deve serializar details como JSON quando fornecido', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.log('user-1', AuditAction.BUSINESS_CREATED, {
        businessId: 'biz-1',
        name: 'Empresa X',
      });

      const callData = mockPrisma.auditLog.create.mock.calls[0][0].data;
      expect(JSON.parse(callData.details)).toEqual({
        businessId: 'biz-1',
        name: 'Empresa X',
      });
    });

    it('não deve lançar exceção quando o banco falha (best-effort)', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB offline'));

      await expect(
        service.log('user-1', AuditAction.USER_LOGIN),
      ).resolves.toBeUndefined();
    });

    it('deve registrar todos os AuditActions sem erro', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      for (const action of Object.values(AuditAction)) {
        await expect(
          service.log('user-1', action as AuditAction),
        ).resolves.toBeUndefined();
      }

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(
        Object.values(AuditAction).length,
      );
    });
  });

  describe('findByUser', () => {
    it('deve buscar logs do usuário ordenados por data', async () => {
      const logs = [{ id: '1', userId: 'user-1', action: 'USER_LOGIN', createdAt: new Date() }];
      mockPrisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.findByUser('user-1');

      expect(result).toEqual(logs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('deve respeitar o limite customizado', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByUser('user-1', 10);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
