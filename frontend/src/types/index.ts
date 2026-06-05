export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum AutomationMode {
  MANUAL = 'MANUAL',
  SEMI_AUTO = 'SEMI_AUTO',
  AUTO = 'AUTO',
}

export enum ReviewResponseStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export enum ResponseStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  segment?: string;
  city?: string;
  googleProfileId?: string;
  toneOfVoice?: string;
  keywords: string[];
  mainServices: string[];
  whatsapp?: string;
  defaultResolutionMessage?: string;
  avoidTerms: string[];
  responseTemplate?: string;
  automationMode: AutomationMode;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  businessId: string;
  googleReviewId?: string;
  reviewerName: string;
  rating: number;
  comment?: string;
  reviewDate: string;
  responseStatus: ReviewResponseStatus;
  createdAt: string;
  business?: Business;
  responses?: Response[];
}

export interface Response {
  id: string;
  reviewId: string;
  generatedText: string;
  publishedText?: string;
  status: ResponseStatus;
  publishedAt?: string;
  createdAt: string;
  review?: Review;
}

export interface GoogleToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface CreateBusinessDto {
  name: string;
  segment?: string;
  city?: string;
  googleProfileId?: string;
  toneOfVoice?: string;
  keywords?: string[];
  mainServices?: string[];
  whatsapp?: string;
  defaultResolutionMessage?: string;
  avoidTerms?: string[];
  responseTemplate?: string;
  automationMode?: AutomationMode;
}

export interface UpdateBusinessDto extends Partial<CreateBusinessDto> {
  isActive?: boolean;
}

export interface FilterReviewsDto {
  businessId?: string;
  rating?: number;
  status?: ReviewResponseStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DashboardStats {
  totalReviews: number;
  pendingReviews: number;
  publishedResponses: number;
  totalBusinesses: number;
}
