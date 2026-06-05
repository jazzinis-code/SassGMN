import { Injectable, Logger, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ReviewResponseInput {
  businessName: string;
  businessSegment: string;
  businessCity: string;
  businessServices: string[];
  toneOfVoice: string;
  keywords: string[];
  avoidTerms: string[];
  responseTemplate?: string;
  reviewerName: string;
  rating: number;
  comment: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY não configurada. Defina a variável de ambiente antes de iniciar o servidor.',
      );
    }

    this.openai = new OpenAI({ apiKey });
    this.model = this.configService.get<string>('openai.model') ?? 'gpt-4';
  }

  async generateReviewResponse(input: ReviewResponseInput): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content?.trim();

      if (!response) {
        throw new InternalServerErrorException('OpenAI retornou resposta vazia');
      }

      return response;
    } catch (error: unknown) {
      // Erros específicos da API OpenAI
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          this.logger.warn('OpenAI rate limit atingido', { status: error.status });
          throw new ServiceUnavailableException(
            'Limite de requisições da IA atingido. Tente novamente em alguns instantes.',
          );
        }
        if (error.status === 401) {
          this.logger.error('OpenAI API key inválida');
          throw new InternalServerErrorException(
            'Configuração da IA inválida. Contate o suporte.',
          );
        }
        if (error.status === 503 || error.status === 500) {
          this.logger.warn('OpenAI indisponível temporariamente', { status: error.status });
          throw new ServiceUnavailableException(
            'Serviço de IA temporariamente indisponível. Tente novamente.',
          );
        }
      }

      this.logger.error('Erro ao gerar resposta com IA', error);
      throw error;
    }
  }

  private buildSystemPrompt(input: ReviewResponseInput): string {
    return `Você é um assistente especializado em criar respostas profissionais e humanizadas para avaliações do Google Business Profile.

CONTEXTO DA EMPRESA:
- Nome: ${input.businessName}
- Segmento: ${input.businessSegment || 'Não especificado'}
- Cidade: ${input.businessCity || 'Não especificada'}
- Serviços principais: ${input.businessServices.join(', ') || 'Não especificado'}
- Tom de voz desejado: ${input.toneOfVoice}

REGRAS OBRIGATÓRIAS:
1. NUNCA use respostas genéricas ou padronizadas. Cada resposta deve ser única e personalizada.
2. NUNCA soe como um robô. Use linguagem natural e humana.
3. NUNCA seja confrontacional, mesmo em avaliações negativas.
4. Insira palavras-chave de forma NATURAL para SEO: ${input.keywords.join(', ') || 'nenhuma especificada'}
5. VARIE o estilo das respostas — não comece sempre da mesma forma.
6. Use o nome do avaliador quando possível para tornar a resposta pessoal.
7. Respostas devem ter entre 2-4 frases, sendo concisas mas significativas.
8. NUNCA use os seguintes termos: ${input.avoidTerms.join(', ') || 'nenhum especificado'}

COMPORTAMENTO POR NOTA:

NOTA 5 (com comentário): Agradeça de forma genuína e específica ao que foi elogiado. Reforce o ponto positivo mencionado. Convide a retornar de forma natural.
NOTA 5 (sem comentário): Agradeça brevemente pela avaliação positiva. Mencione um diferencial da empresa. Seja breve (1-2 frases).
NOTA 4: Agradeça pela boa avaliação. Pergunte sutilmente o que poderia melhorar para ser 5 estrelas. Mostre abertura para feedback.
NOTA 3: Agradeça pelo feedback honesto. Reconheça que há espaço para melhoria. Ofereça contato para resolver qualquer insatisfação.
NOTAS 1-2: Agradeça pelo feedback. Peça desculpas de forma genuína sem exagero. Ofereça solução concreta ou canal de contato direto. NÃO entre em discussões. Demonstre empatia e compromisso em resolver.

${input.responseTemplate ? `TEMPLATE DE REFERÊNCIA (adapte, não copie literalmente):\n${input.responseTemplate}` : ''}`;
  }

  private buildUserPrompt(input: ReviewResponseInput): string {
    return `Crie uma resposta para a seguinte avaliação:

AVALIADOR: ${input.reviewerName}
NOTA: ${input.rating}/5 (${this.getRatingDescription(input.rating)})
COMENTÁRIO: ${input.comment || '(Sem comentário, apenas a nota)'}

Responda de forma ${input.toneOfVoice}, respeitando todas as regras acima. Retorne APENAS o texto da resposta, sem explicações adicionais.`;
  }

  private getRatingDescription(rating: number): string {
    const descriptions: Record<number, string> = {
      5: 'Excelente — cliente muito satisfeito',
      4: 'Bom — cliente satisfeito com ressalvas',
      3: 'Mediano — cliente parcialmente satisfeito',
      2: 'Ruim — cliente insatisfeito',
      1: 'Péssimo — cliente muito insatisfeito',
    };
    return descriptions[rating] ?? 'Avaliação';
  }
}
