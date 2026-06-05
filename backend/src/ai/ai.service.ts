import { Injectable, Logger } from '@nestjs/common';
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
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
    this.model = this.configService.get<string>('openai.model') || 'gpt-4';
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
        throw new Error('OpenAI retornou resposta vazia');
      }

      return response;
    } catch (error) {
      this.logger.error('Erro ao gerar resposta com IA', error);
      throw error;
    }
  }

  private buildSystemPrompt(input: ReviewResponseInput): string {
    return `Voce e um assistente especializado em criar respostas profissionais e humanizadas para avaliacoes do Google Business Profile.

CONTEXTO DA EMPRESA:
- Nome: ${input.businessName}
- Segmento: ${input.businessSegment}
- Cidade: ${input.businessCity}
- Servicos principais: ${input.businessServices.join(', ') || 'Nao especificado'}
- Tom de voz desejado: ${input.toneOfVoice}

REGRAS OBRIGATORIAS:
1. NUNCA use respostas genericas ou padronizadas. Cada resposta deve ser unica e personalizada.
2. NUNCA soe como um robo. Use linguagem natural e humana.
3. NUNCA seja confrontacional, mesmo em avaliacoes negativas.
4. Insira palavras-chave de forma NATURAL para SEO: ${input.keywords.join(', ') || 'nenhuma especificada'}
5. VARIE o estilo das respostas - nao comece sempre da mesma forma.
6. Use o nome do avaliador quando possivel para tornar a resposta pessoal.
7. Respostas devem ter entre 2-4 frases, sendo concisas mas significativas.
8. NUNCA use os seguintes termos: ${input.avoidTerms.join(', ') || 'nenhum especificado'}

COMPORTAMENTO POR NOTA:

NOTA 5 (com comentario):
- Agradeca de forma genuina e especifica ao que foi elogiado
- Reforce o ponto positivo mencionado
- Convide a retornar de forma natural

NOTA 5 (sem comentario):
- Agradeca brevemente pela avaliacao positiva
- Mencione um diferencial da empresa
- Seja breve (1-2 frases)

NOTA 4:
- Agradeca pela boa avaliacao
- Pergunte sutilmente o que poderia melhorar para ser 5 estrelas
- Mostre abertura para feedback

NOTA 3:
- Agradeca pelo feedback honesto
- Reconheca que ha espaco para melhoria
- Ofereca contato para resolver qualquer insatisfacao
- Demonstre compromisso com a melhoria

NOTAS 1-2:
- Agradeca pelo feedback (mesmo negativo)
- Peca desculpas de forma genuina sem ser excessivo
- Ofereca solucao concreta ou canal de contato direto
- NAO entre em discussoes ou justificativas
- Demonstre empatia e compromisso em resolver
- Se houver whatsapp/contato, ofereca para resolver pelo canal privado

${input.responseTemplate ? `TEMPLATE DE REFERENCIA (adapte, nao copie literalmente):\n${input.responseTemplate}` : ''}`;
  }

  private buildUserPrompt(input: ReviewResponseInput): string {
    const ratingDescription = this.getRatingDescription(input.rating);

    return `Crie uma resposta para a seguinte avaliacao:

AVALIADOR: ${input.reviewerName}
NOTA: ${input.rating}/5 (${ratingDescription})
COMENTARIO: ${input.comment || '(Sem comentario, apenas a nota)'}

Responda de forma ${input.toneOfVoice}, respeitando todas as regras acima. Retorne APENAS o texto da resposta, sem explicacoes adicionais.`;
  }

  private getRatingDescription(rating: number): string {
    switch (rating) {
      case 5:
        return 'Excelente - cliente muito satisfeito';
      case 4:
        return 'Bom - cliente satisfeito com ressalvas';
      case 3:
        return 'Mediano - cliente parcialmente satisfeito';
      case 2:
        return 'Ruim - cliente insatisfeito';
      case 1:
        return 'Pessimo - cliente muito insatisfeito';
      default:
        return 'Avaliacao';
    }
  }
}
