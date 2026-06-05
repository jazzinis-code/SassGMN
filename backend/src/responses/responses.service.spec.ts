import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GoogleService } from '../google/google.service';
import { BusinessesService } from '../businesses/businesses.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { AutomationMode, ResponseStatus, ReviewResponseStatus } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-123';
const OTHER_USER_ID = 'user-999';
const REVIEW_ID = 'review-abc';
const RESPONSE_ID = 'response-xyz';
const BUSINESS_ID = 'business-456';

interface FakeBusiness {
  id: string; userId: string; name: string; segment: string; city: string;
  mainServices: string[]; toneOfVoice: string; keywords: string[];
  avoidTerms: string[]; responseTemplate: null; googleProfileId: string | null;
  automationMode: AutomationMode;
}

interface FakeReview {
  id: string; businessId: string; googleReviewId: string | null;
  reviewerName: string; rating: number; comment: string;
  reviewDate: Date; responseStatus: ReviewResponseStatus; createdAt: Date;
  business: FakeBusiness;
}

interface FakeResponse {
  id: string; reviewId: string; generatedText: string;
  publishedText: string | null; status: ResponseStatus;
  publishedAt: null; createdAt: Date;
  review: { id: string; reviewId: string; googleReviewId: string; businessId: string; business: { id: string; userId: string; googleProfileId: string | null } };
}

function makeReview(overrides: Partial<FakeReview> = {}): FakeReview {
  return {
    id: REVIEW_ID,
    businessId: BUSINESS_ID,
    googleReviewId: 'google-review-1',
    reviewerName: 'João',
    rating: 5,
    comment: 'Ótimo!',
    reviewDate: new Date(),
    responseStatus: ReviewResponseStatus.PENDING,
    createdAt: new Date(),
    business: {
      id: BUSINESS_ID,
      userId: USER_ID,
      name: 'Empresa Teste',
      segment: 'restaurante',
      city: 'SP',
      mainServices: ['delivery'],
      toneOfVoice: 'amigável',
      keywords: ['qualidade'],
      avoidTerms: [],
      responseTemplate: null,
      googleProfileId: 'accounts/123/locations/456',
      automationMode: AutomationMode.MANUAL,
    },
    ...overrides,
  };
}

function makeResponse(overrides: Partial<FakeResponse> = {}): FakeResponse {
  return {
    id: RESPONSE_ID,
    reviewId: REVIEW_ID,
    generatedText: 'Texto gerado pela IA',
    publishedText: null,
    status: ResponseStatus.DRAFT,
    publishedAt: null,
    createdAt: new Date(),
    review: {
      id: REVIEW_ID,
      reviewId: REVIEW_ID,
      googleReviewId: 'google-review-1',
      businessId: BUSINESS_ID,
      business: {
        id: BUSINESS_ID,
        userId: USER_ID,
        googleProfileId: 'accounts/123/locations/456',
      },
    },
    ...overrides,
  };
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  review: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  response: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  business: {
    findMany: jest.fn(),
  },
};

const mockAiService = { generateReviewResponse: jest.fn() };
const mockGoogleService = { postReply: jest.fn() };
const mockBusinessesService = {};
const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ResponsesService', () => {
  let service: ResponsesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: GoogleService, useValue: mockGoogleService },
        { provide: BusinessesService, useValue: mockBusinessesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ResponsesService>(ResponsesService);
  });

  // ── generateResponse ─────────────────────────────────────────────────────────

  describe('generateResponse', () => {
    const generatedText = 'Resposta IA: Obrigado pelo feedback!';

    beforeEach(() => {
      mockAiService.generateReviewResponse.mockResolvedValue(generatedText);
      mockPrisma.response.create.mockResolvedValue({
        id: RESPONSE_ID,
        reviewId: REVIEW_ID,
        generatedText,
        status: ResponseStatus.DRAFT,
        publishedText: null,
        publishedAt: null,
        createdAt: new Date(),
      });
      mockPrisma.review.update.mockResolvedValue({});
    });

    it('deve lançar NotFoundException se review não existir', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.generateResponse(REVIEW_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException se review pertence a outro usuário', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(
        makeReview({ business: { ...makeReview().business, userId: OTHER_USER_ID } }),
      );
      await expect(service.generateResponse(REVIEW_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve criar resposta como DRAFT no modo MANUAL', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());

      const result = await service.generateResponse(REVIEW_ID, USER_ID);

      expect(mockPrisma.response.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewId: REVIEW_ID,
          generatedText,
          status: ResponseStatus.DRAFT,
        }),
      });
      expect(result.status).toBe(ResponseStatus.DRAFT);
    });

    it('deve atualizar responseStatus da review para GENERATED', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      await service.generateResponse(REVIEW_ID, USER_ID);

      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        data: { responseStatus: ReviewResponseStatus.GENERATED },
      });
    });

    it('deve registrar audit log RESPONSE_GENERATED', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      await service.generateResponse(REVIEW_ID, USER_ID);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        USER_ID,
        AuditAction.RESPONSE_GENERATED,
        expect.objectContaining({ reviewId: REVIEW_ID }),
      );
    });

    it('deve passar os dados corretos da empresa para o AiService', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      await service.generateResponse(REVIEW_ID, USER_ID);

      expect(mockAiService.generateReviewResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Empresa Teste',
          reviewerName: 'João',
          rating: 5,
          comment: 'Ótimo!',
        }),
      );
    });

    describe('modo SEMI_AUTO', () => {
      it('deve publicar automaticamente avaliação com nota >= 4', async () => {
        const semiAutoReview = makeReview({
          rating: 4,
          business: { ...makeReview().business, automationMode: AutomationMode.SEMI_AUTO },
        });
        // 1ª chamada: generateResponse busca a review
        // 2ª chamada: publish busca a review com business
        mockPrisma.review.findUnique
          .mockResolvedValueOnce(semiAutoReview)
          .mockResolvedValueOnce(semiAutoReview);

        // approve lê a resposta como DRAFT, depois atualiza para APPROVED
        mockPrisma.response.findUnique
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.DRAFT }))  // approve
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.APPROVED })); // publish ownership check

        mockPrisma.response.update
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.APPROVED }))  // approve
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.PUBLISHED })); // publish

        mockGoogleService.postReply.mockResolvedValue(undefined);
        mockPrisma.review.update.mockResolvedValue({});

        await service.generateResponse(REVIEW_ID, USER_ID);
        expect(mockGoogleService.postReply).toHaveBeenCalled();
      });

      it('deve manter como DRAFT avaliação com nota < 4', async () => {
        mockPrisma.review.findUnique.mockResolvedValueOnce(
          makeReview({
            rating: 3,
            business: { ...makeReview().business, automationMode: AutomationMode.SEMI_AUTO },
          }),
        );

        await service.generateResponse(REVIEW_ID, USER_ID);
        expect(mockGoogleService.postReply).not.toHaveBeenCalled();
      });
    });

    describe('modo AUTO', () => {
      it('deve publicar automaticamente independente da nota', async () => {
        const autoReview = makeReview({
          rating: 1,
          business: { ...makeReview().business, automationMode: AutomationMode.AUTO },
        });

        mockPrisma.review.findUnique
          .mockResolvedValueOnce(autoReview)
          .mockResolvedValueOnce(autoReview);

        mockPrisma.response.findUnique
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.DRAFT }))
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.APPROVED }));

        mockPrisma.response.update
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.APPROVED }))
          .mockResolvedValueOnce(makeResponse({ status: ResponseStatus.PUBLISHED }));

        mockGoogleService.postReply.mockResolvedValue(undefined);
        mockPrisma.review.update.mockResolvedValue({});

        await service.generateResponse(REVIEW_ID, USER_ID);
        expect(mockGoogleService.postReply).toHaveBeenCalled();
      });
    });
  });

  // ── approve ──────────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('deve lançar NotFoundException se resposta não existir', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);
      await expect(service.approve(RESPONSE_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se resposta pertence a outro usuário', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        makeResponse({
          review: {
            ...makeResponse().review,
            business: { ...makeResponse().review.business, userId: OTHER_USER_ID },
          },
        }),
      );
      await expect(service.approve(RESPONSE_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException se resposta não está em DRAFT', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED }),
      );
      await expect(service.approve(RESPONSE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar status para APPROVED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED }),
      );

      await service.approve(RESPONSE_ID, USER_ID);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: RESPONSE_ID },
        data: expect.objectContaining({ status: ResponseStatus.APPROVED }),
      });
    });

    it('deve usar publishedText quando fornecido', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED, publishedText: 'Texto editado' }),
      );

      await service.approve(RESPONSE_ID, USER_ID, 'Texto editado');

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: RESPONSE_ID },
        data: expect.objectContaining({ publishedText: 'Texto editado' }),
      });
    });

    it('deve usar generatedText como fallback quando publishedText não fornecido', async () => {
      const draftResponse = makeResponse({ generatedText: 'Texto IA original' });
      mockPrisma.response.findUnique.mockResolvedValue(draftResponse);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED }),
      );

      await service.approve(RESPONSE_ID, USER_ID);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: RESPONSE_ID },
        data: expect.objectContaining({ publishedText: 'Texto IA original' }),
      });
    });

    it('deve registrar audit log RESPONSE_APPROVED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED }),
      );

      await service.approve(RESPONSE_ID, USER_ID);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        USER_ID,
        AuditAction.RESPONSE_APPROVED,
        { responseId: RESPONSE_ID },
      );
    });
  });

  // ── reject ───────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('deve lançar NotFoundException se resposta não existir', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);
      await expect(service.reject(RESPONSE_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se resposta não está em DRAFT', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      await expect(service.reject(RESPONSE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar status para REJECTED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.REJECTED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.reject(RESPONSE_ID, USER_ID);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: RESPONSE_ID },
        data: { status: ResponseStatus.REJECTED },
      });
    });

    it('deve atualizar responseStatus da review para REJECTED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.REJECTED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.reject(RESPONSE_ID, USER_ID);

      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        data: { responseStatus: ReviewResponseStatus.REJECTED },
      });
    });

    it('deve registrar audit log RESPONSE_REJECTED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.REJECTED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.reject(RESPONSE_ID, USER_ID);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        USER_ID,
        AuditAction.RESPONSE_REJECTED,
        { responseId: RESPONSE_ID },
      );
    });
  });

  // ── publish ──────────────────────────────────────────────────────────────────

  describe('publish', () => {
    const approvedResponse = makeResponse({ status: ResponseStatus.APPROVED });

    it('deve lançar BadRequestException se resposta não está APPROVED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse()); // DRAFT
      await expect(service.publish(RESPONSE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se review não tem googleReviewId', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      // publish chama prisma.review.findUnique separadamente com include: { business: true }
      mockPrisma.review.findUnique.mockResolvedValue(
        makeReview({ googleReviewId: null }),
      );
      await expect(service.publish(RESPONSE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se business não tem googleProfileId', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      mockPrisma.review.findUnique.mockResolvedValue(
        makeReview({ business: { ...makeReview().business, googleProfileId: null } }),
      );
      await expect(service.publish(RESPONSE_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve chamar googleService.postReply com os dados corretos', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      mockGoogleService.postReply.mockResolvedValue(undefined);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.publish(RESPONSE_ID, USER_ID);

      expect(mockGoogleService.postReply).toHaveBeenCalledWith(
        USER_ID,
        'accounts/123/locations/456',
        'google-review-1',
        'Texto gerado pela IA', // generatedText como fallback
      );
    });

    it('deve usar publishedText quando disponível', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED, publishedText: 'Texto editado' }),
      );
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      mockGoogleService.postReply.mockResolvedValue(undefined);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.publish(RESPONSE_ID, USER_ID);

      expect(mockGoogleService.postReply).toHaveBeenCalledWith(
        USER_ID,
        expect.any(String),
        expect.any(String),
        'Texto editado',
      );
    });

    it('deve atualizar status da resposta para PUBLISHED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      mockGoogleService.postReply.mockResolvedValue(undefined);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.publish(RESPONSE_ID, USER_ID);

      expect(mockPrisma.response.update).toHaveBeenCalledWith({
        where: { id: RESPONSE_ID },
        data: expect.objectContaining({
          status: ResponseStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('deve atualizar responseStatus da review para PUBLISHED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      mockGoogleService.postReply.mockResolvedValue(undefined);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.publish(RESPONSE_ID, USER_ID);

      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        data: { responseStatus: ReviewResponseStatus.PUBLISHED },
      });
    });

    it('deve registrar audit log RESPONSE_PUBLISHED', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(approvedResponse);
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      mockGoogleService.postReply.mockResolvedValue(undefined);
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.PUBLISHED }),
      );
      mockPrisma.review.update.mockResolvedValue({});

      await service.publish(RESPONSE_ID, USER_ID);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        USER_ID,
        AuditAction.RESPONSE_PUBLISHED,
        expect.objectContaining({ responseId: RESPONSE_ID }),
      );
    });
  });

  // ── findByReview ─────────────────────────────────────────────────────────────

  describe('findByReview', () => {
    it('deve lançar NotFoundException se review não existir', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.findByReview(REVIEW_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se review pertence a outro usuário', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(
        makeReview({ business: { ...makeReview().business, userId: OTHER_USER_ID } }),
      );
      await expect(service.findByReview(REVIEW_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve retornar as respostas ordenadas por data', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(makeReview());
      const responses = [makeResponse()];
      mockPrisma.response.findMany.mockResolvedValue(responses);

      const result = await service.findByReview(REVIEW_ID, USER_ID);
      expect(result).toEqual(responses);
      expect(mockPrisma.response.findMany).toHaveBeenCalledWith({
        where: { reviewId: REVIEW_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ── AuditService best-effort ──────────────────────────────────────────────────

  describe('audit best-effort', () => {
    it('deve retornar a resposta mesmo quando audit log é chamado', async () => {
      // O audit usa void (fire-and-forget) — verifica que não bloqueia o fluxo
      mockPrisma.response.findUnique.mockResolvedValue(makeResponse());
      mockPrisma.response.update.mockResolvedValue(
        makeResponse({ status: ResponseStatus.APPROVED }),
      );
      // Audit resolve normalmente
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.approve(RESPONSE_ID, USER_ID);
      expect(result).toBeDefined();
      expect(result.status).toBe(ResponseStatus.APPROVED);
    });
  });
});
