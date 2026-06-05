import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AiService, ReviewResponseInput } from './ai.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreate = jest.fn();

jest.mock('openai', () => {
  // Classe declarada dentro do factory para evitar problema de hoisting
  class MockAPIError extends Error {
    constructor(public readonly status: number, message = 'API Error') {
      super(message);
      this.name = 'APIError';
    }
  }

  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })) as jest.MockedClass<any>;

  MockOpenAI.APIError = MockAPIError;

  return {
    __esModule: true,
    default: MockOpenAI,
    APIError: MockAPIError,
  };
});

const mockConfigGet = jest.fn((key: string) => {
  const config: Record<string, string> = {
    'openai.apiKey': 'test-api-key',
    'openai.model': 'gpt-4',
  };
  return config[key];
});

// ─── Input fixture ───────────────────────────────────────────────────────────

const baseInput: ReviewResponseInput = {
  businessName: 'Restaurante Sabor & Arte',
  businessSegment: 'restaurante',
  businessCity: 'São Paulo',
  businessServices: ['delivery', 'dine-in'],
  toneOfVoice: 'profissional e amigável',
  keywords: ['qualidade', 'atendimento'],
  avoidTerms: ['barato', 'desconto'],
  reviewerName: 'Maria Silva',
  rating: 5,
  comment: 'Comida excelente e atendimento impecável!',
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: { get: mockConfigGet },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  // ── Inicialização ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('deve inicializar corretamente com API key válida', () => {
      expect(service).toBeDefined();
    });

    it('deve lançar erro se OPENAI_API_KEY não estiver configurada', async () => {
      const moduleWithoutKey = Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      });

      await expect(moduleWithoutKey.compile()).rejects.toThrow(
        'OPENAI_API_KEY não configurada',
      );
    });
  });

  // ── Geração de resposta — caminho feliz ──────────────────────────────────────

  describe('generateReviewResponse — sucesso', () => {
    const responseText = 'Obrigado, Maria! Ficamos felizes com o elogio.';

    beforeEach(() => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: responseText } }],
      });
    });

    it('deve retornar o texto gerado pelo modelo', async () => {
      const result = await service.generateReviewResponse(baseInput);
      expect(result).toBe(responseText);
    });

    it('deve chamar a API com o modelo configurado', async () => {
      await service.generateReviewResponse(baseInput);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4' }),
      );
    });

    it('deve incluir role system e user na chamada', async () => {
      await service.generateReviewResponse(baseInput);
      const call = mockCreate.mock.calls[0][0];
      expect(call.messages).toHaveLength(2);
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[1].role).toBe('user');
    });

    it('deve incluir o nome da empresa no prompt do sistema', async () => {
      await service.generateReviewResponse(baseInput);
      const systemContent = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(systemContent).toContain('Restaurante Sabor & Arte');
    });

    it('deve incluir o nome do avaliador no prompt do usuário', async () => {
      await service.generateReviewResponse(baseInput);
      const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
      expect(userContent).toContain('Maria Silva');
    });

    it('deve incluir a nota no prompt do usuário', async () => {
      await service.generateReviewResponse(baseInput);
      const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
      expect(userContent).toContain('5/5');
    });

    it('deve usar temperature 0.8 e max_tokens 500', async () => {
      await service.generateReviewResponse(baseInput);
      const call = mockCreate.mock.calls[0][0];
      expect(call.temperature).toBe(0.8);
      expect(call.max_tokens).toBe(500);
    });

    it('deve trimar espaços do texto retornado', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '  Obrigado!  ' } }],
      });
      const result = await service.generateReviewResponse(baseInput);
      expect(result).toBe('Obrigado!');
    });

    it('deve incluir palavras-chave no prompt do sistema', async () => {
      await service.generateReviewResponse(baseInput);
      const systemContent = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(systemContent).toContain('qualidade');
      expect(systemContent).toContain('atendimento');
    });

    it('deve incluir termos a evitar no prompt do sistema', async () => {
      await service.generateReviewResponse(baseInput);
      const systemContent = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(systemContent).toContain('barato');
      expect(systemContent).toContain('desconto');
    });

    it('deve incluir o template de resposta quando fornecido', async () => {
      const inputWithTemplate = { ...baseInput, responseTemplate: 'Prezado {nome}, obrigado!' };
      await service.generateReviewResponse(inputWithTemplate);
      const systemContent = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(systemContent).toContain('Prezado {nome}, obrigado!');
    });

    it('não deve incluir seção de template quando não fornecido', async () => {
      const inputWithoutTemplate = { ...baseInput, responseTemplate: undefined };
      await service.generateReviewResponse(inputWithoutTemplate);
      const systemContent = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(systemContent).not.toContain('TEMPLATE DE REFERÊNCIA');
    });
  });

  // ── Por nota ─────────────────────────────────────────────────────────────────

  describe('comportamento por nota (rating)', () => {
    beforeEach(() => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Resposta gerada.' } }],
      });
    });

    it.each([1, 2, 3, 4, 5])('deve processar nota %i sem lançar erro', async (rating) => {
      await expect(
        service.generateReviewResponse({ ...baseInput, rating }),
      ).resolves.toBe('Resposta gerada.');
    });

    it('deve indicar "Excelente" no prompt para nota 5', async () => {
      await service.generateReviewResponse({ ...baseInput, rating: 5 });
      const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
      expect(userContent).toContain('Excelente');
    });

    it('deve indicar "Péssimo" no prompt para nota 1', async () => {
      await service.generateReviewResponse({ ...baseInput, rating: 1 });
      const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
      expect(userContent).toContain('Péssimo');
    });

    it('deve indicar "(Sem comentário)" quando comment está vazio', async () => {
      await service.generateReviewResponse({ ...baseInput, comment: '' });
      const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
      expect(userContent).toContain('(Sem comentário');
    });
  });

  // ── Erros da API OpenAI ──────────────────────────────────────────────────────

  describe('generateReviewResponse — erros da OpenAI', () => {
    it('deve lançar InternalServerErrorException quando a resposta é vazia', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve lançar InternalServerErrorException quando choices é vazio', async () => {
      mockCreate.mockResolvedValue({ choices: [] });
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve lançar ServiceUnavailableException para erro 429 (rate limit)', async () => {
      const err = Object.assign(new Error('Rate limit'), { name: 'APIError', status: 429 });
      mockCreate.mockRejectedValue(err);
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('deve lançar InternalServerErrorException para erro 401 (API key inválida)', async () => {
      const err = Object.assign(new Error('Unauthorized'), { name: 'APIError', status: 401 });
      mockCreate.mockRejectedValue(err);
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('deve lançar ServiceUnavailableException para erro 503 (serviço indisponível)', async () => {
      const err = Object.assign(new Error('Service unavailable'), { name: 'APIError', status: 503 });
      mockCreate.mockRejectedValue(err);
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('deve propagar erros genéricos sem transformar', async () => {
      mockCreate.mockRejectedValue(new Error('Erro de rede inesperado'));
      await expect(service.generateReviewResponse(baseInput)).rejects.toThrow(
        'Erro de rede inesperado',
      );
    });
  });
});
